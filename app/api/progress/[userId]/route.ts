import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserGoalKey, getEffectiveTargetReps, calculateNextSuggestedWeight } from "@/lib/sms-engine";

// Weekly progress recap — positive-first by design (see CLAUDE.md's AI Coach
// backlog note on keeping athlete-facing copy motivating). Surfaces PRs,
// consistency, and one hero exercise's multi-week climb, all computed from
// real WorkoutSession/ExerciseLog/SetLog history — nothing here is precomputed
// or cached, so it always reflects exactly what's actually been logged.

function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - ((day + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

type ExerciseName = string;

// Fallback pool when someone hasn't starred any favorites yet — the lifts
// people generally want to see progress on. Matched loosely (substring) so
// every plan's naming variant counts (e.g. "Barbell Incline Bench Press"
// still counts under "bench press").
const BRAG_KEYWORDS = [
  "squat",
  "bench press",
  "deadlift",
  "pull-up",
  "pullup",
  "overhead press",
  "curl",
  "hip thrust",
  "leg press",
  "dip",
];
function isBragWorthy(name: string): boolean {
  const lower = name.toLowerCase();
  return BRAG_KEYWORDS.some((kw) => lower.includes(kw));
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const userPlan = await prisma.userPlan.findFirst({
    where: { userId, endDate: null },
    include: { plan: { include: { days: true } } },
  });
  const goalKey = await getUserGoalKey(userId);
  const plannedDaysPerWeek = userPlan?.plan.days.length ?? 0;

  const sessions = await prisma.workoutSession.findMany({
    where: { userId },
    orderBy: { date: "asc" },
    include: {
      exercises: {
        include: {
          sets: true,
          plannedExercise: true,
        },
      },
    },
  });

  if (sessions.length === 0) {
    return NextResponse.json({
      name: user.name,
      hasData: false,
    });
  }

  const now = new Date();
  const weekStart = mondayOf(now);
  const weekEnd = addDays(weekStart, 7);

  // Best (weight, or reps for bodyweight) per exercise name, split into
  // "before this week" vs "this week", to detect genuine new all-time PRs.
  const bestBefore = new Map<ExerciseName, number>();
  const bestThisWeek = new Map<ExerciseName, { value: number; isBodyweight: boolean }>();
  const weeklyHeaviest = new Map<ExerciseName, Map<string, number>>(); // name -> weekStartISO -> heaviest weight
  // Best rep count logged this week per exercise, independent of weight —
  // powers the "higher reps" fallback ranking when nothing's gotten heavier.
  const maxRepsThisWeek = new Map<ExerciseName, number>();
  // Tracked regardless of week — powers the "Also tracking" section for
  // favorited exercises that weren't touched this specific week.
  const lastLoggedDate = new Map<ExerciseName, Date>();
  const isBodyweightByName = new Map<ExerciseName, boolean>();

  const sessionsThisWeek: typeof sessions = [];
  const weekDatesHit = new Set<string>();

  for (const session of sessions) {
    const sDate = new Date(session.date);
    const inThisWeek = sDate >= weekStart && sDate < weekEnd;
    if (inThisWeek) {
      sessionsThisWeek.push(session);
      weekDatesHit.add(sDate.toDateString());
    }

    for (const log of session.exercises) {
      if (log.skipped) continue;
      const name = log.plannedExercise?.name ?? log.customName;
      if (!name) continue;
      const isBodyweight = (log.plannedExercise?.type ?? log.type) === "bodyweight";

      const setsToConsider = log.sets;
      if (setsToConsider.length === 0) continue;
      const heaviest = isBodyweight
        ? Math.max(...setsToConsider.map((s) => s.reps))
        : Math.max(...setsToConsider.map((s) => s.weight));

      // Track heaviest-per-week for the step chart (any exercise, any week).
      const wk = mondayOf(sDate).toISOString();
      if (!weeklyHeaviest.has(name)) weeklyHeaviest.set(name, new Map());
      const perWeek = weeklyHeaviest.get(name)!;
      perWeek.set(wk, Math.max(perWeek.get(wk) ?? 0, heaviest));

      isBodyweightByName.set(name, isBodyweight);
      if (!lastLoggedDate.has(name) || sDate > lastLoggedDate.get(name)!) lastLoggedDate.set(name, sDate);

      if (inThisWeek) {
        const existing = bestThisWeek.get(name);
        if (!existing || heaviest > existing.value) bestThisWeek.set(name, { value: heaviest, isBodyweight });
        const repsThisSet = Math.max(...setsToConsider.map((s) => s.reps));
        maxRepsThisWeek.set(name, Math.max(maxRepsThisWeek.get(name) ?? 0, repsThisSet));
      } else {
        bestBefore.set(name, Math.max(bestBefore.get(name) ?? 0, heaviest));
      }
    }
  }

  // A genuine new PR this week = beats everything logged before this week.
  const prsThisWeek = [...bestThisWeek.entries()]
    .filter(([name, { value }]) => value > (bestBefore.get(name) ?? 0))
    .map(([name, { value, isBodyweight }]) => ({
      name,
      value,
      unit: isBodyweight ? "reps" : "lbs",
      previousBest: bestBefore.get(name) ?? 0,
    }));

  // Week streak: consecutive weeks (including this one) with >=1 session.
  const sessionWeeks = new Set(sessions.map((s) => mondayOf(new Date(s.date)).toISOString()));
  let weekStreak = 0;
  let cursor = weekStart;
  while (sessionWeeks.has(cursor.toISOString())) {
    weekStreak++;
    cursor = addDays(cursor, -7);
  }

  // Hero picks: favorited exercises take priority; before any are starred
  // (or for names not among them), fall back to the curated "brag-worthy"
  // pool, narrowed to whatever this person has actually logged. Ranked by
  // this week's weight increase first; if nothing got heavier, by this
  // week's rep count instead — so a quiet week on the scale still surfaces
  // something real to feel good about.
  const loggedNames = new Set([...bestThisWeek.keys(), ...bestBefore.keys()]);
  const usingFavorites = user.favoriteExercises.length > 0;
  const candidateNames = usingFavorites
    ? user.favoriteExercises.filter((n) => loggedNames.has(n))
    : [...loggedNames].filter(isBragWorthy);

  type Candidate = {
    name: string;
    unit: "lbs" | "reps";
    thisWeekValue: number;
    increase: number;
    repsThisWeek: number;
  };
  const candidates: Candidate[] = candidateNames
    .map((name) => {
      const thisWeek = bestThisWeek.get(name);
      if (!thisWeek) return null;
      return {
        name,
        unit: thisWeek.isBodyweight ? ("reps" as const) : ("lbs" as const),
        thisWeekValue: thisWeek.value,
        increase: thisWeek.value - (bestBefore.get(name) ?? 0),
        repsThisWeek: maxRepsThisWeek.get(name) ?? 0,
      };
    })
    .filter((c): c is Candidate => c !== null);

  const withIncrease = candidates.filter((c) => c.increase > 0).sort((a, b) => b.increase - a.increase);
  const chosen =
    withIncrease.length > 0
      ? withIncrease.slice(0, 2).map((c) => ({ ...c, changeType: "increase" as const }))
      : candidates
          .filter((c) => c.repsThisWeek > 0)
          .sort((a, b) => b.repsThisWeek - a.repsThisWeek)
          .slice(0, 2)
          .map((c) => ({ ...c, changeType: "reps" as const }));

  const heroes = chosen.map((c) => {
    const perWeek = weeklyHeaviest.get(c.name)!;
    const weeks = [...perWeek.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const chart = weeks.slice(-5).map(([wk, weight]) => ({ week: wk, weight }));

    let forward: { current: number; targetReps: number; nextWeight: number | null } | null = null;
    const heroLog = [...sessions]
      .reverse()
      .flatMap((s) => s.exercises)
      .find((l) => (l.plannedExercise?.name ?? l.customName) === c.name && l.plannedExercise);
    if (heroLog?.plannedExercise) {
      const topSet = heroLog.sets.reduce((a, b) => (b.weight > a.weight ? b : a), heroLog.sets[0]);
      const nextWeight = calculateNextSuggestedWeight(topSet.weight, topSet.reps, heroLog.plannedExercise.targetReps, goalKey);
      forward = {
        current: topSet.weight,
        targetReps: getEffectiveTargetReps(heroLog.plannedExercise.targetReps, goalKey),
        nextWeight: nextWeight ?? topSet.weight + 5,
      };
    }

    return {
      name: c.name,
      unit: c.unit,
      thisWeekValue: c.thisWeekValue,
      changeType: c.changeType,
      change: c.changeType === "increase" ? c.increase : c.repsThisWeek,
      chart,
      forward,
    };
  });

  // Everything else being tracked (favorited, or curated-fallback) that
  // didn't make the top-2 spotlight this week — still shown, just lighter,
  // so a quiet week on your top lifts doesn't make the rest of your tracked
  // progress disappear from the report entirely.
  const chosenNames = new Set(chosen.map((c) => c.name));
  const others = candidateNames
    .filter((name) => !chosenNames.has(name))
    .map((name) => {
      const currentBest = Math.max(bestThisWeek.get(name)?.value ?? 0, bestBefore.get(name) ?? 0);
      const logged = lastLoggedDate.get(name);
      if (currentBest === 0 || !logged) return null;
      return {
        name,
        unit: isBodyweightByName.get(name) ? ("reps" as const) : ("lbs" as const),
        currentBest,
        lastLoggedDate: logged.toISOString(),
      };
    })
    .filter((o): o is NonNullable<typeof o> => o !== null);

  // Month strip
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sessionsThisMonth = sessions.filter((s) => new Date(s.date) >= monthStart);
  const prsThisMonthCount = (() => {
    let count = 0;
    const seenBefore = new Map<ExerciseName, number>();
    for (const session of sessions) {
      const sDate = new Date(session.date);
      const beforeMonth = sDate < monthStart;
      for (const log of session.exercises) {
        if (log.skipped) continue;
        const name = log.plannedExercise?.name ?? log.customName;
        if (!name || log.sets.length === 0) continue;
        const isBodyweight = (log.plannedExercise?.type ?? log.type) === "bodyweight";
        const heaviest = isBodyweight ? Math.max(...log.sets.map((s) => s.reps)) : Math.max(...log.sets.map((s) => s.weight));
        if (beforeMonth) {
          seenBefore.set(name, Math.max(seenBefore.get(name) ?? 0, heaviest));
        } else if (heaviest > (seenBefore.get(name) ?? 0)) {
          count++;
          seenBefore.set(name, heaviest);
        }
      }
    }
    return count;
  })();

  const missedDaysThisWeek = Math.max(plannedDaysPerWeek - sessionsThisWeek.length, 0);

  return NextResponse.json({
    hasData: true,
    name: user.name,
    weekStart: weekStart.toISOString(),
    weekEnd: addDays(weekEnd, -1).toISOString(),
    prsThisWeek,
    consistency: {
      hit: sessionsThisWeek.length,
      planned: plannedDaysPerWeek,
      daysHit: [...weekDatesHit],
      missed: missedDaysThisWeek,
    },
    weekStreak,
    heroes,
    others,
    usingFavorites,
    month: {
      sessions: sessionsThisMonth.length,
      newPRs: prsThisMonthCount,
      weekStreak,
    },
  });
}
