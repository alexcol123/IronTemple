import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Creates a brand-new WorkoutSession for a day already completed this week —
// used when someone wants an extra/bonus session after finishing everything
// planned. Deliberately always creates a new row rather than reusing/finding
// an existing one for this workoutDayId (unlike the normal /today/log reuse
// logic), since the whole point is a second session on top of the one
// already logged.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, workoutDayId }: { userId?: string; workoutDayId?: string } = body;
  if (!userId || !workoutDayId) {
    return NextResponse.json({ error: "userId and workoutDayId are required" }, { status: 400 });
  }

  const day = await prisma.workoutDay.findUnique({ where: { id: workoutDayId } });
  if (!day) return NextResponse.json({ error: "Workout day not found" }, { status: 404 });

  const session = await prisma.workoutSession.create({ data: { userId, workoutDayId } });
  return NextResponse.json({ sessionId: session.id });
}
