import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseSets, parseMinutes, parseReps, detectInputFormat, getBestWeightPR, type SetEntry } from "@/lib/sms-engine";
import { buildSummaryIfComplete } from "@/lib/session-helpers";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, workoutDayId, sessionId: explicitSessionId, plannedExerciseId, adHocName, adHocType, adHocTargetReps, action, input }: {
    userId?: string;
    workoutDayId?: string;
    // When set (bonus sessions, or any caller that already knows exactly
    // which session it means), used verbatim instead of the "most recent
    // session for this day" reuse lookup below — that lookup would otherwise
    // find and append onto an already-completed session for the same day.
    sessionId?: string;
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

  let session;
  if (explicitSessionId) {
    session = await prisma.workoutSession.findUnique({ where: { id: explicitSessionId } });
    if (!session || session.userId !== userId) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
  } else {
    // Reuse the open (unfinished) session for this day rather than creating a
    // new one every time — scoped to finishedAt: null so this can never pick
    // up an already-finished session for the same day and append onto it.
    session = await prisma.workoutSession.findFirst({
      where: { userId, workoutDayId, finishedAt: null },
      orderBy: { date: "desc" },
    });
    if (!session) {
      session = await prisma.workoutSession.create({ data: { userId, workoutDayId } });
    }
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
    const summary = await buildSummaryIfComplete(workoutDayId, session.id);
    if (summary) await prisma.workoutSession.update({ where: { id: session.id }, data: { finishedAt: new Date() } });
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

  const summary = await buildSummaryIfComplete(workoutDayId, session.id);
  if (summary) await prisma.workoutSession.update({ where: { id: session.id }, data: { finishedAt: new Date() } });
  return NextResponse.json({ success: true, prMessage, workoutComplete: summary !== null, summary });
}
