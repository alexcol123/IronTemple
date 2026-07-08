import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone");
  const userId = req.nextUrl.searchParams.get("userId");
  if (!phone && !userId) return NextResponse.json({ error: "phone or userId required" }, { status: 400 });

  const sessions = await prisma.workoutSession.findMany({
    where: userId ? { userId } : { user: { phone: phone! } },
    orderBy: { date: "desc" },
    include: {
      workoutDay: { include: { plan: true } },
      exercises: {
        include: {
          plannedExercise: true,
          sets: { orderBy: { setNumber: "asc" } },
        },
        orderBy: { order: "asc" },
      },
    },
  });

  return NextResponse.json({ sessions });
}
