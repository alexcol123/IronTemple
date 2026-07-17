import { prisma } from "@/lib/db";

// A session that's had no activity for this long is treated as over, not
// still "in progress" — long enough that it never cuts off someone mid-set
// (a real workout rarely runs past an hour or two), short enough that an
// evening session doesn't get mistaken for "still open" the next morning.
export const STALE_SESSION_HOURS = 6;

export function isSessionStale(date: Date): boolean {
  return Date.now() - date.getTime() > STALE_SESSION_HOURS * 60 * 60 * 1000;
}

// Marks every not-yet-logged active exercise in this session's day as
// skipped and stamps finishedAt — used both when someone taps "Finish
// Workout" early, and when a session is found to have gone stale and gets
// auto-closed the next time anything checks for an open session.
export async function finishSessionNow(sessionId: string, workoutDayId: string): Promise<void> {
  const [activeExercises, existingLogs] = await Promise.all([
    prisma.plannedExercise.findMany({ where: { workoutDayId, active: true } }),
    prisma.exerciseLog.findMany({ where: { sessionId }, select: { plannedExerciseId: true } }),
  ]);
  const loggedIds = new Set(existingLogs.map((l) => l.plannedExerciseId));
  const missing = activeExercises.filter((ex) => !loggedIds.has(ex.id));
  if (missing.length > 0) {
    await prisma.exerciseLog.createMany({
      data: missing.map((ex) => ({ sessionId, plannedExerciseId: ex.id, order: ex.order, skipped: true })),
    });
  }
  await prisma.workoutSession.update({ where: { id: sessionId }, data: { finishedAt: new Date() } });
}

// Builds the same completion summary SMS does, but richer: this is the app's
// one chance to celebrate the whole session at once (SMS only ever calls out
// a PR from the single exercise you just logged, since its prMessage resets
// per-message). isPR reads the hitPR flag recorded at log time rather than
// being recomputed here — an additive edit reuses the same ExerciseLog row,
// so "compare this session's sets against other sessions" would wrongly
// exclude the earlier sets in this same row that a later append needs to beat.
export async function buildSummaryIfComplete(workoutDayId: string, sessionId: string) {
  const activeExerciseCount = await prisma.plannedExercise.count({ where: { workoutDayId, active: true } });
  const logs = await prisma.exerciseLog.findMany({
    where: { sessionId },
    include: { sets: { orderBy: { setNumber: "asc" } }, plannedExercise: true },
    orderBy: { order: "asc" },
  });
  const realLogCount = logs.filter((l) => l.plannedExerciseId !== null).length;
  if (realLogCount < activeExerciseCount) return null;

  const lines = logs.map((log) => {
    const name = log.plannedExercise?.name ?? log.customName ?? "Unknown";
    const type = log.plannedExercise?.type ?? log.type;
    if (log.skipped) return { text: `${name}: SKIPPED`, isPR: false };
    if (type === "cardio") return { text: `${name}: ${log.sets[0]?.reps ?? "?"} min`, isPR: false };
    if (type === "bodyweight") {
      const reps = log.sets.map((s) => s.reps);
      const total = reps.reduce((a, b) => a + b, 0);
      return { text: `${name}: ${total} reps (${reps.join(", ")})`, isPR: false };
    }
    const setStr = log.sets.map((s) => `${s.weight}x${s.reps}`).join(" ");
    return { text: `${name}: ${setStr}`, isPR: log.hitPR };
  });

  const totalSets = logs.reduce((sum, log) => sum + (log.skipped ? 0 : log.sets.length), 0);
  const doneCount = logs.filter((l) => !l.skipped).length;
  const hasPR = lines.some((l) => l.isPR);

  return { lines, doneCount, totalSets, hasPR };
}
