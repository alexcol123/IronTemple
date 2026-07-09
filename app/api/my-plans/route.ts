import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const [plans, activeUserPlan] = await Promise.all([
    prisma.workoutPlan.findMany({ where: { createdByUserId: userId } }),
    prisma.userPlan.findFirst({ where: { userId, endDate: null } }),
  ]);

  return NextResponse.json({
    plans: plans.map((p) => ({
      id: p.id,
      name: p.name,
      goal: p.goal,
      isActive: p.id === activeUserPlan?.planId,
    })),
  });
}
