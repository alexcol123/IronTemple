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
  // Only ~1 in 5 rows is featured, but the other ~1,080 still need to be
  // searchable by name. Sending every row's gif/instructions/videos/images
  // regardless of featured status was pushing this payload to ~1.8MB on every
  // /today and /build load. Non-featured rows now come back content-free —
  // full content gets fetched on-demand (see [id]/route.ts) only once someone
  // actually picks one via search.
  const exercises = await prisma.exerciseLibrary.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      displayName: true,
      bodyPart: true,
      defaultSets: true,
      defaultReps: true,
      type: true,
      featured: true,
      gifUrl: true,
      instructions: true,
      videoUrls: true,
      imageUrls: true,
    },
  });

  const bodyParts = BODY_PART_ORDER.map((name) => ({
    name,
    exercises: exercises
      .filter((e) => e.bodyPart === name)
      .map((e) => ({
        id: e.id,
        name: e.name,
        displayName: e.displayName,
        sets: e.defaultSets,
        reps: e.defaultReps,
        type: e.type,
        featured: e.featured,
        gifUrl: e.featured ? e.gifUrl : null,
        instructions: e.featured ? e.instructions : [],
        videoUrls: e.featured ? e.videoUrls : [],
        imageUrls: e.featured ? e.imageUrls : [],
      })),
  }));

  return NextResponse.json({ bodyParts });
}
