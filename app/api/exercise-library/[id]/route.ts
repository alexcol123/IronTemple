import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// On-demand full-content lookup for a single exercise — the main list
// endpoint strips gif/instructions/videos/images from non-featured rows to
// keep the initial payload small, so a picker fetches the real content here
// only once someone actually selects one of those exercises via search.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exercise = await prisma.exerciseLibrary.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      displayName: true,
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

  if (!exercise) return NextResponse.json({ error: "Exercise not found" }, { status: 404 });

  return NextResponse.json({
    id: exercise.id,
    name: exercise.name,
    displayName: exercise.displayName,
    sets: exercise.defaultSets,
    reps: exercise.defaultReps,
    type: exercise.type,
    featured: exercise.featured,
    gifUrl: exercise.gifUrl,
    instructions: exercise.instructions,
    videoUrls: exercise.videoUrls,
    imageUrls: exercise.imageUrls,
  });
}
