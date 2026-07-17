import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { finishSessionNow, buildSummaryIfComplete } from "@/lib/session-helpers";

// Lets someone deliberately end a session early (e.g. had to leave after
// half the exercises) instead of leaving it ambiguously "still open" —
// marks whatever wasn't logged as skipped and stamps finishedAt, same as if
// every exercise had actually been logged.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, sessionId }: { userId?: string; sessionId?: string } = body;
  if (!userId || !sessionId) {
    return NextResponse.json({ error: "userId and sessionId are required" }, { status: 400 });
  }

  const session = await prisma.workoutSession.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== userId) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.finishedAt) {
    return NextResponse.json({ error: "This session is already finished." }, { status: 400 });
  }

  await finishSessionNow(sessionId, session.workoutDayId);
  const summary = await buildSummaryIfComplete(session.workoutDayId, sessionId);
  return NextResponse.json({ success: true, summary });
}
