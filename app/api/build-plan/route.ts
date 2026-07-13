import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { GOALS } from "@/lib/sms-engine";

type ExerciseInput = { name: string; sets: number; reps: number; type?: "weighted" | "cardio" | "bodyweight" };
type DayInput = { bodyParts: string[]; exercises: ExerciseInput[] };

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, planName, goal, days }: { userId?: string; planName?: string; goal?: string; days?: DayInput[] } = body;

  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  if (!planName?.trim()) return NextResponse.json({ error: "Plan name required" }, { status: 400 });
  if (!goal || !GOALS.some((g) => g.planName === goal)) return NextResponse.json({ error: "Invalid goal" }, { status: 400 });
  if (!days || days.length === 0) return NextResponse.json({ error: "At least one day required" }, { status: 400 });
  for (const day of days) {
    if (!day.bodyParts?.length) return NextResponse.json({ error: "Each day needs at least one body part" }, { status: 400 });
    if (!day.exercises?.length) return NextResponse.json({ error: "Each day needs at least one exercise" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // One WorkoutPlan, created on the spot for this user — not seeded. The explicit
  // `goal` field means this plan's rep-range math works correctly regardless of
  // what name the creator gives it (see getUserGoalKey in lib/sms-engine.ts).
  const dayData = await Promise.all(
    days.map(async (day, i) => ({
      day: i + 1,
      name: day.bodyParts.join(" + "),
      muscles: day.bodyParts.join(", "),
      exercises: {
        create: await Promise.all(
          day.exercises.map(async (ex, j) => {
            // Picked from the same library-backed picker, so this should
            // always find a match — but connect only if it does, rather than
            // risk the whole save failing over one missing library row.
            const libraryMatch = await prisma.exerciseLibrary.findUnique({ where: { name: ex.name } });
            return {
              name: ex.name,
              targetSets: ex.sets,
              targetReps: ex.reps,
              type: ex.type ?? "weighted",
              order: j + 1,
              libraryExerciseId: libraryMatch?.id,
            };
          }),
        ),
      },
    })),
  );

  const plan = await prisma.workoutPlan.create({
    data: {
      name: planName.trim(),
      goal,
      createdByUserId: userId,
      days: { create: dayData },
    },
  });

  await prisma.userPlan.updateMany({ where: { userId, endDate: null }, data: { endDate: new Date() } });
  await prisma.userPlan.create({ data: { userId, planId: plan.id } });

  return NextResponse.json({ plan: { id: plan.id, name: plan.name } });
}
