import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { phone, userId, planId }: { phone?: string; userId?: string; planId?: string } = body;

  if (!phone && !userId) return NextResponse.json({ error: "phone or userId required" }, { status: 400 });
  if (!planId) return NextResponse.json({ error: "planId required" }, { status: 400 });

  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : await prisma.user.findUnique({ where: { phone: phone! } });
  if (!user) return NextResponse.json({ error: "Phone not found. Text JOIN to sign up first." }, { status: 404 });

  const plan = await prisma.workoutPlan.findUnique({ where: { id: planId } });
  if (!plan) return NextResponse.json({ error: "Plan not found." }, { status: 404 });

  // Same switch mechanism as building a new plan — end whatever's currently
  // active, start a new UserPlan pointing at this existing plan instead of a
  // freshly created one. No payment gate yet — that's a deliberate deferral,
  // not an oversight, until Stripe billing exists.
  await prisma.userPlan.updateMany({ where: { userId: user.id, endDate: null }, data: { endDate: new Date() } });
  await prisma.userPlan.create({ data: { userId: user.id, planId } });

  return NextResponse.json({ userId: user.id, name: user.name });
}
