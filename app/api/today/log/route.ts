import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseSets, parseMinutes, parseReps, detectInputFormat, getBestWeightPR, type SetEntry } from "@/lib/sms-engine";

// Builds the same completion summary SMS does, but richer: this is the app's
// one chance to celebrate the whole session at once (SMS only ever calls out
// a PR from the single exercise you just logged, since its prMessage resets
// per-message). isPR reads the hitPR flag recorded at log time rather than
// being recomputed here — an additive edit reuses the same ExerciseLog row,
// so "compare this session's sets against other sessions" would wrongly
// exclude the earlier sets in this same row that a later append needs to beat.
async function buildSummaryIfComplete(userId: string, workoutDayId: string, sessionId: string) {
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

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, workoutDayId, plannedExerciseId, adHocName, adHocType, adHocTargetReps, action, input }: {
    userId?: string;
    workoutDayId?: string;
    plannedExerciseId?: string;
    // Picked straight from the /build-style body-part library rather than
    // typed free text (unlike SMS's ADD), so name/type are already known —
    // no library/history/ask resolution tiers needed here.
    adHocName?: string;
    adHocType?: "weighted" | "bodyweight" | "cardio";
    adHocTargetReps?: number;
    action?: "log" | "skip";
    input?: string;
  } = body;

  if (!userId || !workoutDayId || !action) {
    return NextResponse.json({ error: "userId, workoutDayId, and action are required" }, { status: 400 });
  }
  if (!plannedExerciseId && !(adHocName && adHocType)) {
    return NextResponse.json({ error: "plannedExerciseId or adHocName+adHocType is required" }, { status: 400 });
  }

  let name: string;
  let type: string;
  let targetReps: number;
  let planOrder: number | null = null;
  if (plannedExerciseId) {
    const found = await prisma.plannedExercise.findUnique({ where: { id: plannedExerciseId } });
    if (!found || found.workoutDayId !== workoutDayId) {
      return NextResponse.json({ error: "Exercise not found in this day" }, { status: 404 });
    }
    name = found.name;
    type = found.type;
    targetReps = found.targetReps;
    planOrder = found.order;
  } else {
    name = adHocName!;
    type = adHocType!;
    targetReps = adHocTargetReps ?? 0;
  }

  // Reuse the most recent in-progress session for this day rather than
  // creating a new one every time — same session an SMS START would use.
  let session = await prisma.workoutSession.findFirst({
    where: { userId, workoutDayId },
    orderBy: { date: "desc" },
  });
  if (!session) {
    session = await prisma.workoutSession.create({ data: { userId, workoutDayId } });
  }

  const existingLog = plannedExerciseId
    ? await prisma.exerciseLog.findFirst({ where: { sessionId: session.id, plannedExerciseId }, include: { sets: true } })
    : await prisma.exerciseLog.findFirst({
        where: { sessionId: session.id, plannedExerciseId: null, customName: name },
        include: { sets: true },
      });

  // Ad-hoc entries have no fixed spot in the plan's order — just append after
  // whatever's already logged this session so they land at the end of the list.
  const order = planOrder ?? (await prisma.exerciseLog.count({ where: { sessionId: session.id } })) + 1;

  if (action === "skip") {
    if (!plannedExerciseId) {
      return NextResponse.json({ error: "Ad-hoc exercises can't be skipped — just don't add them." }, { status: 400 });
    }
    if (existingLog) {
      return NextResponse.json({ error: "Already logged — can't skip now." }, { status: 400 });
    }
    await prisma.exerciseLog.create({
      data: { sessionId: session.id, plannedExerciseId, order, skipped: true },
    });
    const summary = await buildSummaryIfComplete(userId, workoutDayId, session.id);
    return NextResponse.json({ success: true, workoutComplete: summary !== null, summary });
  }

  // action === "log"
  if (!input?.trim()) return NextResponse.json({ error: "input required" }, { status: 400 });

  let sets: SetEntry[] | null;
  if (type === "cardio") {
    const minutes = input.trim().toUpperCase() === "DONE" ? targetReps : parseMinutes(input);
    if (minutes === null) {
      const format = detectInputFormat(input);
      const error =
        format === "weighted"
          ? "That looks like weight x reps - this is cardio, just reply with your time in minutes (e.g. 30)."
          : "Reply with how long you went in minutes (e.g. 20 or 35).";
      return NextResponse.json({ error }, { status: 400 });
    }
    sets = [{ setNumber: 1, weight: 0, reps: minutes }];
  } else if (type === "bodyweight") {
    const reps = parseReps(input);
    if (!reps) {
      const format = detectInputFormat(input);
      const error =
        format === "weighted"
          ? "This is a bodyweight exercise - just your reps per set (e.g. 15 12 10), no weight needed."
          : "Couldn't read that. Reply with your reps per set (e.g. 15 12 10).";
      return NextResponse.json({ error }, { status: 400 });
    }
    sets = reps.map((r, i) => ({ setNumber: i + 1, weight: 0, reps: r }));
  } else {
    const parsed = parseSets(input);
    if (!parsed) {
      const format = detectInputFormat(input);
      const error =
        format === "bareNumbers"
          ? "Looks like you're missing the weight - reply with weight x reps (e.g. 150x10)."
          : "Couldn't read that. Use format: 150x10 160x8 170x6";
      return NextResponse.json({ error }, { status: 400 });
    }
    sets = parsed;
  }

  // Check PR against history BEFORE logging today's sets, same as SMS.
  const previousBestWeight = type === "weighted" ? await getBestWeightPR(userId, name) : null;
  const newMaxWeight = type === "weighted" ? Math.max(...sets.map((s) => s.weight)) : null;
  const isNewPR = previousBestWeight !== null && newMaxWeight !== null && newMaxWeight > previousBestWeight;

  if (existingLog) {
    // Editing an already-logged (or previously skipped) exercise: append new
    // sets rather than replacing what's there, continuing the set numbering.
    // hitPR only ever turns on, never off — a later, lighter append shouldn't
    // erase credit for an earlier set in this same session that did PR.
    const startNumber = existingLog.sets.length;
    await prisma.exerciseLog.update({
      where: { id: existingLog.id },
      data: {
        skipped: false,
        hitPR: existingLog.hitPR || isNewPR,
        sets: { create: sets.map((s, i) => ({ setNumber: startNumber + i + 1, weight: s.weight, reps: s.reps })) },
      },
    });
  } else {
    await prisma.exerciseLog.create({
      data: {
        sessionId: session.id,
        plannedExerciseId: plannedExerciseId ?? null,
        customName: plannedExerciseId ? null : name,
        type: plannedExerciseId ? null : (type as "weighted" | "bodyweight" | "cardio"),
        order,
        skipped: false,
        hitPR: isNewPR,
        sets: { create: sets },
      },
    });
  }

  const prMessage = isNewPR ? `New PR! ${newMaxWeight} lbs (up from ${previousBestWeight}).` : null;

  const summary = await buildSummaryIfComplete(userId, workoutDayId, session.id);
  return NextResponse.json({ success: true, prMessage, workoutComplete: summary !== null, summary });
}
