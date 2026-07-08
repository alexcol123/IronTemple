import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { heaviestSet, calculateNextSuggestedWeight, getUserGoalKey, getEffectiveTargetReps, nextRepGoal } from "@/lib/sms-engine";

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone");
  const userId = req.nextUrl.searchParams.get("userId");
  if (!phone && !userId) return NextResponse.json({ error: "phone or userId required" }, { status: 400 });

  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : await prisma.user.findUnique({ where: { phone: phone! } });
  if (!user) return NextResponse.json({ prs: [] });

  const goalKey = await getUserGoalKey(user.id);

  // Only weighted exercises get PR/target math — bodyweight and cardio don't have
  // a meaningful "weight PR" (weight is always 0 for those).
  const logs = await prisma.exerciseLog.findMany({
    where: {
      skipped: false,
      session: { userId: user.id },
      plannedExercise: { type: "weighted" },
    },
    include: {
      sets: { orderBy: { setNumber: "asc" } },
      plannedExercise: true,
      session: { select: { date: true } },
    },
    orderBy: { session: { date: "desc" } },
  });

  const byName = new Map<string, typeof logs>();
  for (const log of logs) {
    if (log.sets.length === 0) continue;
    const name = log.plannedExercise.name;
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name)!.push(log);
  }

  const prs = Array.from(byName.entries()).map(([name, exerciseLogs]) => {
    // exerciseLogs is already sorted newest-first (query orderBy above)
    let weightPR = 0;
    let weightPRDate = exerciseLogs[0].session.date.toISOString();
    for (const log of exerciseLogs) {
      for (const s of log.sets) {
        if (s.weight > weightPR) {
          weightPR = s.weight;
          weightPRDate = log.session.date.toISOString();
        }
      }
    }

    const mostRecent = exerciseLogs[0];
    const lastSessionSummary = mostRecent.sets.map((s) => `${s.weight}x${s.reps}`).join(" ");

    // Best of the last 2 sessions — same rule the SMS engine uses, so this page
    // never shows a different recommendation than what the SMS would text.
    const failureSets = exerciseLogs.slice(0, 2).map((l) => heaviestSet(l.sets));
    const referenceSet = failureSets.reduce((best, s) => (s.weight > best.weight ? s : best), failureSets[0]);

    const suggestedWeight = calculateNextSuggestedWeight(
      referenceSet.weight,
      referenceSet.reps,
      mostRecent.plannedExercise.targetReps,
      goalKey,
    );
    const nextTarget =
      suggestedWeight !== null
        ? `Try ${suggestedWeight} lbs for your heaviest set`
        : `Stay at ${referenceSet.weight} lbs, try for ${nextRepGoal(referenceSet.reps, getEffectiveTargetReps(mostRecent.plannedExercise.targetReps, goalKey))} reps`;

    return {
      name,
      weightPR,
      weightPRDate,
      lastSession: lastSessionSummary,
      lastSessionDate: mostRecent.session.date.toISOString(),
      nextTarget,
    };
  });

  prs.sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ prs });
}
