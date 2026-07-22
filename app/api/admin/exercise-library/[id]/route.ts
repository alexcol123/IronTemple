import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSignedInRole } from "@/lib/auth-roles";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = await getSignedInRole();
  if (role.role !== "admin") return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { gifUrl, instructions, videoUrls, imageUrls, featured, displayName }: {
    gifUrl?: string | null;
    instructions?: string[];
    videoUrls?: string[];
    imageUrls?: string[];
    featured?: boolean;
    displayName?: string | null;
  } = body;

  const existing = await prisma.exerciseLibrary.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Exercise not found" }, { status: 404 });

  // Only touch fields actually present in the request — a featured-only toggle
  // shouldn't wipe out gif/instructions/videos/images that weren't sent.
  const data: {
    gifUrl?: string | null;
    instructions?: string[];
    videoUrls?: string[];
    imageUrls?: string[];
    featured?: boolean;
    displayName?: string | null;
  } = {};
  if (gifUrl !== undefined) data.gifUrl = gifUrl?.trim() ? gifUrl.trim() : null;
  if (instructions !== undefined) data.instructions = instructions;
  if (videoUrls !== undefined) data.videoUrls = videoUrls;
  if (imageUrls !== undefined) data.imageUrls = imageUrls;
  if (featured !== undefined) data.featured = featured;
  if (displayName !== undefined) data.displayName = displayName?.trim() ? displayName.trim() : null;

  const updated = await prisma.exerciseLibrary.update({ where: { id }, data });

  return NextResponse.json({ exercise: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = await getSignedInRole();
  if (role.role !== "admin") return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { id } = await params;

  const existing = await prisma.exerciseLibrary.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Exercise not found" }, { status: 404 });

  // Deleting an exercise still used by a real plan would hit a foreign-key
  // error at the DB level — check first and give a clear reason instead.
  const usageCount = await prisma.plannedExercise.count({ where: { libraryExerciseId: id } });
  if (usageCount > 0) {
    return NextResponse.json(
      { error: `Can't delete — this exercise is used in ${usageCount} planned exercise${usageCount === 1 ? "" : "s"}. Remove it from those plans first.` },
      { status: 409 },
    );
  }

  await prisma.exerciseLibrary.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
