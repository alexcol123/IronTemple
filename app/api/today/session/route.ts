import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/app/generated/prisma/client";
import {
  getMondayOfThisWeek,
  getUserGoalKey,
  getReferenceSet,
  calculateNextSuggestedWeight,
  getEffectiveTargetReps,
  nextRepGoal,
} from "@/lib/sms-engine";
import { isSessionStale, finishSessionNow } from "@/lib/session-helpers";

// Same recommendation text exercisePrompt builds for SMS, minus the "type
// SKIP"/"or BUSY" instructional suffix — the app has real buttons for those,
// and there's no BUSY concept once exercises are tappable in any order.
async function recommendationFor(
  userId: string,
  name: string,
  type: string,
  targetReps: number,
  goalKey: string,
): Promise<string | null> {
  if (type !== "weighted") return null;
  const referenceSet = await getReferenceSet(userId, name);
  if (!referenceSet) return null;
  const suggestedWeight = calculateNextSuggestedWeight(referenceSet.weight, referenceSet.reps, targetReps, goalKey);
  const effectiveTarget = getEffectiveTargetReps(targetReps, goalKey);
  return suggestedWeight !== null
    ? `Recent heavy set: ${referenceSet.weight}x${referenceSet.reps} - try ${suggestedWeight} lbs today.`
    : `Recent heavy set: ${referenceSet.weight}x${referenceSet.reps} - try for ${nextRepGoal(referenceSet.reps, effectiveTarget)} reps today.`;
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      planHistory: {
        where: { endDate: null },
        include: {
          plan: {
            include: {
              days: {
                include: {
                  exercises: {
                    where: { active: true },
                    orderBy: { order: "asc" },
                    include: { libraryExercise: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!user) return NextResponse.json({ session: null });

  const activePlan = user.planHistory[0];
  if (!activePlan) return NextResponse.json({ session: null });

  type SessionWithExercises = Prisma.WorkoutSessionGetPayload<{
    include: { exercises: { include: { sets: true } } };
  }>;
  let workoutDay: (typeof activePlan.plan.days)[number] | undefined;
  let existingSession: SessionWithExercises | null = null;
  let nextDayNumber: number;
  let isBonus = false;

  // The single open (unfinished) session for this user, if any — this is now
  // the one source of truth for "what's in progress," not a guess based on
  // whichever session happens to have the latest date. At most one session
  // should ever be open at a time (normal or bonus), since bonus creation and
  // the log route both check for this before creating a new one.
  const dayIds = activePlan.plan.days.map((d) => d.id);
  let openSession = await prisma.workoutSession.findFirst({
    where: { userId, workoutDayId: { in: dayIds }, finishedAt: null },
    orderBy: { date: "desc" },
    include: { exercises: { include: { sets: { orderBy: { setNumber: "asc" } } } } },
  });

  // Gone stale (no activity in STALE_SESSION_HOURS) — close it out silently
  // (skip whatever's left, stamp finishedAt) and fall through to normal
  // day-progression logic, rather than resuming something long abandoned.
  if (openSession && isSessionStale(openSession.date)) {
    await finishSessionNow(openSession.id, openSession.workoutDayId);
    openSession = null;
  }

  if (openSession) {
    workoutDay = activePlan.plan.days.find((d) => d.id === openSession.workoutDayId);
    if (!workoutDay) return NextResponse.json({ error: "Workout day not found" }, { status: 404 });
    existingSession = openSession;
    nextDayNumber = workoutDay.day;
    isBonus = openSession.isBonus;
  } else {
    const monday = getMondayOfThisWeek();
    const sessionsThisWeek = await prisma.workoutSession.count({ where: { userId, date: { gte: monday } } });
    nextDayNumber = sessionsThisWeek + 1;
    workoutDay = activePlan.plan.days.find((d) => d.day === nextDayNumber);
  }

  if (!workoutDay) {
    const distinctDays = new Map<string, { workoutDayId: string; name: string }>();
    for (const d of activePlan.plan.days) {
      if (!distinctDays.has(d.name)) distinctDays.set(d.name, { workoutDayId: d.id, name: d.name });
    }
    return NextResponse.json({
      session: { allDone: true, totalDays: activePlan.plan.days.length, bonusOptions: [...distinctDays.values()] },
    });
  }

  const goalKey = await getUserGoalKey(userId);

  const exercises = await Promise.all(
    workoutDay.exercises.map(async (ex) => {
      const howTo = {
        gifUrl: ex.libraryExercise?.gifUrl ?? null,
        instructions: ex.libraryExercise?.instructions ?? [],
        videoUrls: ex.libraryExercise?.videoUrls ?? [],
        imageUrls: ex.libraryExercise?.imageUrls ?? [],
      };
      const log = existingSession?.exercises.find((l) => l.plannedExerciseId === ex.id);
      if (log) {
        const summary = log.skipped
          ? null
          : ex.type === "cardio"
            ? `${log.sets[0]?.reps ?? "?"} min`
            : ex.type === "bodyweight"
              ? log.sets.map((s) => s.reps).join(" ")
              : log.sets.map((s) => `${s.weight}x${s.reps}`).join(" ");
        return {
          id: ex.id,
          name: ex.name,
          type: ex.type,
          targetSets: ex.targetSets,
          targetReps: ex.targetReps,
          status: log.skipped ? "skipped" : "done",
          loggedSummary: summary,
          // Structured, not just the display string — lets the app show
          // already-logged sets when reopening this exercise instead of a
          // blank slate, without re-parsing loggedSummary back into numbers.
          loggedSets: log.skipped ? [] : log.sets.map((s) => ({ weight: s.weight, reps: s.reps })),
          recommendation: null as string | null,
          ...howTo,
        };
      }
      const recommendation = await recommendationFor(userId, ex.name, ex.type, ex.targetReps, goalKey);
      return {
        id: ex.id,
        name: ex.name,
        type: ex.type,
        targetSets: ex.targetSets,
        targetReps: ex.targetReps,
        status: "pending",
        loggedSummary: null,
        loggedSets: [] as { weight: number; reps: number }[],
        recommendation,
        ...howTo,
      };
    }),
  );

  // Ad-hoc (ADD) entries already logged this session via SMS — no button for
  // this in the app yet, but they should still show up if they exist. Looked
  // up by name against the library since these have no plannedExerciseId to
  // join through.
  const adHocLogs = (existingSession?.exercises ?? []).filter((l) => l.plannedExerciseId === null);
  const adHoc = await Promise.all(
    adHocLogs.map(async (log) => {
      const libraryExercise = log.customName
        ? await prisma.exerciseLibrary.findUnique({ where: { name: log.customName } })
        : null;
      return {
        id: log.id,
        name: log.customName ?? "Unknown",
        type: log.type ?? "weighted",
        targetSets: log.sets.length,
        targetReps: 0,
        status: log.skipped ? "skipped" : ("done" as const),
        loggedSummary: log.skipped
          ? null
          : log.type === "cardio"
            ? `${log.sets[0]?.reps ?? "?"} min`
            : log.type === "bodyweight"
              ? log.sets.map((s) => s.reps).join(" ")
              : log.sets.map((s) => `${s.weight}x${s.reps}`).join(" "),
        loggedSets: log.skipped ? [] : log.sets.map((s) => ({ weight: s.weight, reps: s.reps })),
        recommendation: null as string | null,
        gifUrl: libraryExercise?.gifUrl ?? null,
        instructions: libraryExercise?.instructions ?? [],
        videoUrls: libraryExercise?.videoUrls ?? [],
        imageUrls: libraryExercise?.imageUrls ?? [],
      };
    }),
  );

  return NextResponse.json({
    session: {
      allDone: false,
      sessionId: existingSession?.id ?? null,
      isBonus,
      workoutDayId: workoutDay.id,
      dayName: workoutDay.name,
      nextDayNumber,
      totalDays: activePlan.plan.days.length,
      exercises: [...exercises, ...adHoc],
    },
  });
}
