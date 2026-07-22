import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Capped small on purpose — this list drives the Weekly Progress hero
// section, which is meant to read as a focused highlight reel, not a
// dashboard of everything ever logged.
export const MAX_FAVORITE_EXERCISES = 7;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, exerciseName }: { userId?: string; exerciseName?: string } = body;
  if (!userId || !exerciseName) {
    return NextResponse.json({ error: "userId and exerciseName are required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const isFavorited = user.favoriteExercises.includes(exerciseName);
  let favoriteExercises: string[];

  if (isFavorited) {
    // Removing is always allowed, even if the plan's changed since — never
    // trap someone with a stale favorite they can't get rid of.
    favoriteExercises = user.favoriteExercises.filter((n) => n !== exerciseName);
  } else {
    if (user.favoriteExercises.length >= MAX_FAVORITE_EXERCISES) {
      return NextResponse.json(
        { error: `You can track up to ${MAX_FAVORITE_EXERCISES} favorites — remove one first.` },
        { status: 400 },
      );
    }

    // Server-side backstop matching the /prs UI: only exercises in the
    // user's current plan can be added — an old PR from an abandoned plan
    // can never generate new weekly progress, so it'd just waste a slot.
    const userPlan = await prisma.userPlan.findFirst({
      where: { userId, endDate: null },
      include: { plan: { include: { days: { include: { exercises: { where: { active: true } } } } } } },
    });
    const inCurrentPlan = userPlan?.plan.days.some((d) => d.exercises.some((e) => e.name === exerciseName)) ?? false;
    if (!inCurrentPlan) {
      return NextResponse.json(
        { error: "That's not in your current plan — add it as a custom exercise first to track it." },
        { status: 400 },
      );
    }

    favoriteExercises = [...user.favoriteExercises, exerciseName];
  }

  await prisma.user.update({ where: { id: userId }, data: { favoriteExercises } });
  return NextResponse.json({ favoriteExercises });
}
