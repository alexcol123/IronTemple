import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSignedInRole } from "@/lib/auth-roles";

export async function POST(req: NextRequest) {
  const role = await getSignedInRole();
  if (role.role !== "admin") return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const body = await req.json();
  const { name, bodyPart, type, defaultSets, defaultReps, featured }: {
    name?: string;
    bodyPart?: string;
    type?: string;
    defaultSets?: number;
    defaultReps?: number;
    featured?: boolean;
  } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!bodyPart?.trim()) return NextResponse.json({ error: "Body part is required" }, { status: 400 });

  const existing = await prisma.exerciseLibrary.findUnique({ where: { name: name.trim() } });
  if (existing) return NextResponse.json({ error: "An exercise with this name already exists" }, { status: 409 });

  const created = await prisma.exerciseLibrary.create({
    data: {
      name: name.trim(),
      bodyPart: bodyPart.trim(),
      type: (type as "weighted" | "bodyweight" | "cardio") ?? "weighted",
      defaultSets: defaultSets ?? 3,
      defaultReps: defaultReps ?? 10,
      featured: featured ?? false,
    },
  });

  return NextResponse.json({ exercise: created });
}
