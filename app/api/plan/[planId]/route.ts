import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;

  const plan = await prisma.workoutPlan.findUnique({
    where: { id: planId },
    include: {
      createdBy: { select: { name: true } },
      days: { orderBy: { day: "asc" }, include: { exercises: { where: { active: true }, orderBy: { order: "asc" } } } },
    },
  });
  if (!plan) return NextResponse.json({ plan: null }, { status: 404 });

  // Anyone actively on this plan right now — a cheap proxy for "popular" until
  // there are enough public plans for a real discovery/ranking page to matter.
  const followerCount = await prisma.userPlan.count({ where: { planId, endDate: null } });

  return NextResponse.json({
    plan: {
      id: plan.id,
      name: plan.name,
      goal: plan.goal,
      createdByName: plan.createdBy?.name ?? null,
      followerCount,
      days: plan.days.map((d) => ({
        day: d.day,
        name: d.name,
        muscles: d.muscles,
        exercises: d.exercises.map((e) => ({
          name: e.name,
          targetSets: e.targetSets,
          targetReps: e.targetReps,
          type: e.type,
        })),
      })),
    },
  });
}
