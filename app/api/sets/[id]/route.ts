import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Lets a user fix a mistyped set from /history (e.g. "1550" meant to be
// "150"). Scoped to the requesting userId so one user can't edit another's
// data — PRs/Progress/exercise-history all recompute live from SetLog, so
// correcting a set here is all that's needed; nothing else to patch up.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { weight, reps, userId } = body as { weight?: number; reps?: number; userId?: string };

  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  if (weight === undefined && reps === undefined) {
    return NextResponse.json({ error: "weight or reps required" }, { status: 400 });
  }
  if (weight !== undefined && (typeof weight !== "number" || weight < 0)) {
    return NextResponse.json({ error: "weight must be a non-negative number" }, { status: 400 });
  }
  if (reps !== undefined && (typeof reps !== "number" || reps < 0 || !Number.isInteger(reps))) {
    return NextResponse.json({ error: "reps must be a non-negative integer" }, { status: 400 });
  }

  const existing = await prisma.setLog.findUnique({
    where: { id },
    include: { exerciseLog: { include: { session: { select: { userId: true } } } } },
  });
  if (!existing) return NextResponse.json({ error: "Set not found" }, { status: 404 });
  if (existing.exerciseLog.session.userId !== userId) {
    return NextResponse.json({ error: "Not authorized to edit this set" }, { status: 403 });
  }

  const updated = await prisma.setLog.update({
    where: { id },
    data: {
      ...(weight !== undefined ? { weight } : {}),
      ...(reps !== undefined ? { reps } : {}),
    },
  });

  return NextResponse.json({ set: updated });
}
