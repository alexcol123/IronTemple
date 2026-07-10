import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getMondayOfThisWeek,
  getUserGoalKey,
  getReferenceSet,
  calculateNextSuggestedWeight,
  getEffectiveTargetReps,
  nextRepGoal,
} from "@/lib/sms-engine";

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
          plan: { include: { days: { include: { exercises: { where: { active: true }, orderBy: { order: "asc" } } } } } },
        },
      },
    },
  });
  if (!user) return NextResponse.json({ session: null });

  const activePlan = user.planHistory[0];
  if (!activePlan) return NextResponse.json({ session: null });

  const monday = getMondayOfThisWeek();
  const sessionsThisWeek = await prisma.workoutSession.count({ where: { userId, date: { gte: monday } } });

  // Prefer resuming the most recent session if it's still incomplete, rather
  // than always deriving "next day" from the session count. Since the app is
  // non-linear (log one exercise, come back to the list, log another), the
  // very first log of a day would otherwise already count toward this week's
  // total on the next page load — silently flipping the list to a different
  // day and orphaning the rest of the one actually in progress.
  const dayIds = activePlan.plan.days.map((d) => d.id);
  const latestSession = await prisma.workoutSession.findFirst({
    where: { userId, workoutDayId: { in: dayIds } },
    orderBy: { date: "desc" },
    include: { exercises: { include: { sets: { orderBy: { setNumber: "asc" } } } } },
  });

  let workoutDay = activePlan.plan.days.find((d) => d.id === latestSession?.workoutDayId);
  const isLatestIncomplete = workoutDay && latestSession
    ? latestSession.exercises.filter((e) => e.plannedExerciseId !== null).length < workoutDay.exercises.length
    : false;

  let existingSession = isLatestIncomplete ? latestSession : null;
  let nextDayNumber: number;
  if (isLatestIncomplete && workoutDay) {
    nextDayNumber = workoutDay.day;
  } else {
    nextDayNumber = sessionsThisWeek + 1;
    workoutDay = activePlan.plan.days.find((d) => d.day === nextDayNumber);
    existingSession = null;
  }

  if (!workoutDay) {
    return NextResponse.json({ session: { allDone: true, totalDays: activePlan.plan.days.length } });
  }

  const goalKey = await getUserGoalKey(userId);

  const exercises = await Promise.all(
    workoutDay.exercises.map(async (ex) => {
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
          recommendation: null as string | null,
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
        recommendation,
      };
    }),
  );

  // Ad-hoc (ADD) entries already logged this session via SMS — no button for
  // this in the app yet, but they should still show up if they exist.
  const adHocLogs = (existingSession?.exercises ?? []).filter((l) => l.plannedExerciseId === null);
  const adHoc = adHocLogs.map((log) => ({
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
    recommendation: null as string | null,
  }));

  return NextResponse.json({
    session: {
      allDone: false,
      workoutDayId: workoutDay.id,
      dayName: workoutDay.name,
      nextDayNumber,
      totalDays: activePlan.plan.days.length,
      exercises: [...exercises, ...adHoc],
    },
  });
}
