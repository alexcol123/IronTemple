import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Fixed display order — matches the previous body-parts.ts BODY_PARTS array,
// since bodyPart is just a plain string column with no inherent ordering.
const BODY_PART_ORDER = [
  "Chest",
  "Back",
  "Shoulders",
  "Traps",
  "Biceps",
  "Triceps",
  "Forearms",
  "Legs",
  "Glutes",
  "Abs",
  "Cardio",
];

export async function GET() {
  const exercises = await prisma.exerciseLibrary.findMany({ orderBy: { name: "asc" } });

  const bodyParts = BODY_PART_ORDER.map((name) => ({
    name,
    exercises: exercises
      .filter((e) => e.bodyPart === name)
      .map((e) => ({
        id: e.id,
        name: e.name,
        sets: e.defaultSets,
        reps: e.defaultReps,
        type: e.type,
        gifUrl: e.gifUrl,
        instructions: e.instructions,
        videoUrls: e.videoUrls,
        imageUrls: e.imageUrls,
        featured: e.featured,
      })),
  }));

  return NextResponse.json({ bodyParts });
}
