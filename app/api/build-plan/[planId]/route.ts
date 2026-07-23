import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { GOALS } from "@/lib/sms-engine";
import { MAX_PUBLIC_PLANS } from "@/lib/plan-visibility";

type ExerciseInput = { name: string; sets: number; reps: number; type?: "weighted" | "cardio" | "bodyweight" };
type DayInput = { bodyParts: string[]; exercises: ExerciseInput[] };

// Updates an existing plan in place — matches days by position and exercises
// by name against what's already there, rather than wiping and recreating,
// since WorkoutSession/ExerciseLog rows reference these days/exercises
// directly and can't just be orphaned. New days/exercises get created,
// exercises no longer present get soft-deactivated (same convention as the
// SMS REMOVE command — never hard-deleted, history may still reference
// them), and days beyond what's submitted are left untouched entirely
// (day removal isn't supported here — only ever growing the plan).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const body = await req.json();
  const { userId, planName, goal, days, visibility }: { userId?: string; planName?: string; goal?: string; days?: DayInput[]; visibility?: "personal" | "public" } = body;

  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  if (!planName?.trim()) return NextResponse.json({ error: "Plan name required" }, { status: 400 });
  if (!goal || !GOALS.some((g) => g.planName === goal)) return NextResponse.json({ error: "Invalid goal" }, { status: 400 });
  if (!days || days.length === 0) return NextResponse.json({ error: "At least one day required" }, { status: 400 });
  for (const day of days) {
    if (!day.bodyParts?.length) return NextResponse.json({ error: "Each day needs at least one body part" }, { status: 400 });
    if (!day.exercises?.length) return NextResponse.json({ error: "Each day needs at least one exercise" }, { status: 400 });
  }

  const plan = await prisma.workoutPlan.findUnique({
    where: { id: planId },
    include: { days: { orderBy: { day: "asc" }, include: { exercises: { where: { active: true } } } } },
  });
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  if (plan.createdByUserId !== userId) return NextResponse.json({ error: "Only this plan's creator can edit it" }, { status: 403 });

  // Only relevant when actually transitioning personal -> public — a plan
  // that's already public and staying public shouldn't count against itself.
  if (visibility === "public" && plan.visibility !== "public") {
    const otherPublicCount = await prisma.workoutPlan.count({
      where: { createdByUserId: userId, visibility: "public", id: { not: planId } },
    });
    if (otherPublicCount >= MAX_PUBLIC_PLANS) {
      return NextResponse.json(
        { error: `You already have ${MAX_PUBLIC_PLANS} public plans — make one personal first.` },
        { status: 409 },
      );
    }
  }

  await prisma.workoutPlan.update({
    where: { id: planId },
    data: { name: planName.trim(), goal, ...(visibility ? { visibility } : {}) },
  });

  for (let i = 0; i < days.length; i++) {
    const incoming = days[i];
    const existingDay = plan.days[i];
    const dayName = incoming.bodyParts.join(" + ");
    const dayMuscles = incoming.bodyParts.join(", ");

    const dayId = existingDay
      ? existingDay.id
      : (await prisma.workoutDay.create({ data: { planId, day: i + 1, name: dayName, muscles: dayMuscles } })).id;

    if (existingDay) {
      await prisma.workoutDay.update({ where: { id: dayId }, data: { name: dayName, muscles: dayMuscles } });
    }

    const existingExercises = existingDay?.exercises ?? [];
    const incomingNames = new Set(incoming.exercises.map((e) => e.name));

    // Deactivate exercises no longer in this day's list.
    for (const ex of existingExercises) {
      if (!incomingNames.has(ex.name)) {
        await prisma.plannedExercise.update({ where: { id: ex.id }, data: { active: false } });
      }
    }

    // Create new ones, update sets/reps/order on ones that already existed.
    for (let j = 0; j < incoming.exercises.length; j++) {
      const exIn = incoming.exercises[j];
      const existingEx = existingExercises.find((e) => e.name === exIn.name);
      if (existingEx) {
        await prisma.plannedExercise.update({
          where: { id: existingEx.id },
          data: { targetSets: exIn.sets, targetReps: exIn.reps, type: exIn.type ?? "weighted", order: j + 1, active: true },
        });
      } else {
        const libraryMatch = await prisma.exerciseLibrary.findUnique({ where: { name: exIn.name } });
        await prisma.plannedExercise.create({
          data: {
            name: libraryMatch?.displayName || exIn.name,
            targetSets: exIn.sets,
            targetReps: exIn.reps,
            type: exIn.type ?? "weighted",
            order: j + 1,
            workoutDayId: dayId,
            libraryExerciseId: libraryMatch?.id,
          },
        });
      }
    }
  }

  return NextResponse.json({ plan: { id: planId, name: planName.trim() } });
}
