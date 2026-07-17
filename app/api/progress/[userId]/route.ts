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

      if (inThisWeek) {
        const existing = bestThisWeek.get(name);
        if (!existing || heaviest > existing.value) bestThisWeek.set(name, { value: heaviest, isBodyweight });
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

  // Hero exercise: the first weighted (non-bodyweight) PR this week, or
  // whichever exercise has the longest logged history if nothing PR'd.
  const heroName =
    prsThisWeek.find((p) => p.unit === "lbs")?.name ??
    [...weeklyHeaviest.entries()].sort((a, b) => b[1].size - a[1].size)[0]?.[0] ??
    null;

  let heroChart: { week: string; weight: number }[] = [];
  let heroForward: { current: number; targetReps: number; nextWeight: number | null } | null = null;

  if (heroName) {
    const perWeek = weeklyHeaviest.get(heroName)!;
    const weeks = [...perWeek.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    heroChart = weeks.slice(-5).map(([wk, weight]) => ({ week: wk, weight }));

    // Forward-look: reuse the exact SMS-engine math against the hero's most
    // recent session.
    const heroLog = [...sessions]
      .reverse()
      .flatMap((s) => s.exercises)
      .find((l) => (l.plannedExercise?.name ?? l.customName) === heroName && l.plannedExercise);
    if (heroLog?.plannedExercise) {
      const topSet = heroLog.sets.reduce((a, b) => (b.weight > a.weight ? b : a), heroLog.sets[0]);
      const nextWeight = calculateNextSuggestedWeight(topSet.weight, topSet.reps, heroLog.plannedExercise.targetReps, goalKey);
      heroForward = {
        current: topSet.weight,
        targetReps: getEffectiveTargetReps(heroLog.plannedExercise.targetReps, goalKey),
        nextWeight: nextWeight ?? topSet.weight + 5,
      };
    }
  }

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
    hero: heroName
      ? {
          name: heroName,
          chart: heroChart,
          forward: heroForward,
        }
      : null,
    month: {
      sessions: sessionsThisMonth.length,
      newPRs: prsThisMonthCount,
      weekStreak,
    },
  });
}
