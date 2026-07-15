import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
