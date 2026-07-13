import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { gifUrl, instructions, videoUrls, imageUrls }: {
    gifUrl?: string | null;
    instructions?: string[];
    videoUrls?: string[];
    imageUrls?: string[];
  } = body;

  const existing = await prisma.exerciseLibrary.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Exercise not found" }, { status: 404 });

  const updated = await prisma.exerciseLibrary.update({
    where: { id },
    data: {
      gifUrl: gifUrl?.trim() ? gifUrl.trim() : null,
      instructions: instructions ?? [],
      videoUrls: videoUrls ?? [],
      imageUrls: imageUrls ?? [],
    },
  });

  return NextResponse.json({ exercise: updated });
}
