import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { GOALS, EXPERIENCE_TIERS, getUserGoalKey, getUserTierKey } from "@/lib/sms-engine";

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone");
  const userId = req.nextUrl.searchParams.get("userId");
  if (!phone && !userId) return NextResponse.json({ error: "phone or userId required" }, { status: 400 });

  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : await prisma.user.findUnique({ where: { phone: phone! } });
  if (!user) return NextResponse.json({ user: null });

  const userPlan = await prisma.userPlan.findFirst({
    where: { userId: user.id, endDate: null },
    include: { plan: true },
  });
  const goalPlanName = await getUserGoalKey(user.id);
  const tierKey = await getUserTierKey(user.id);

  return NextResponse.json({
    user: {
      name: user.name,
      phone: user.phone,
      email: user.email,
      createdAt: user.createdAt,
      planName: userPlan?.plan.name ?? null,
      goalPlanName,
      tierKey,
    },
    goals: GOALS,
    tiers: EXPERIENCE_TIERS,
  });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { phone, userId, name, goalPlanName, tierKey }: { phone?: string; userId?: string; name?: string; goalPlanName: string; tierKey: string } = body;
  if (!phone && !userId) return NextResponse.json({ error: "phone or userId required" }, { status: 400 });

  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : await prisma.user.findUnique({ where: { phone: phone! } });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  if (name && name.trim() && name.trim() !== user.name) {
    await prisma.user.update({ where: { id: user.id }, data: { name: name.trim() } });
  }

  const desiredPlanName = `${tierKey} ${goalPlanName}`;
  const currentUserPlan = await prisma.userPlan.findFirst({
    where: { userId: user.id, endDate: null },
    include: { plan: true },
  });

  if (currentUserPlan?.plan.name !== desiredPlanName) {
    const newPlan = await prisma.workoutPlan.findFirst({ where: { name: desiredPlanName } });
    if (!newPlan) return NextResponse.json({ error: `No plan found for ${desiredPlanName}` }, { status: 400 });

    if (currentUserPlan) {
      await prisma.userPlan.update({ where: { id: currentUserPlan.id }, data: { endDate: new Date() } });
    }
    await prisma.userPlan.create({ data: { userId: user.id, planId: newPlan.id } });
  }

  return NextResponse.json({ success: true });
}
