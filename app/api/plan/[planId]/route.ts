import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;

  const plan = await prisma.workoutPlan.findUnique({
    where: { id: planId },
    include: {
      createdBy: { select: { name: true, creatorProfile: true } },
      days: { orderBy: { day: "asc" }, include: { exercises: { where: { active: true }, orderBy: { order: "asc" } } } },
    },
  });
  if (!plan) return NextResponse.json({ plan: null }, { status: 404 });

  // Anyone actively on this plan right now — a cheap proxy for "popular" until
  // there are enough public plans for a real discovery/ranking page to matter.
  const followerCount = await prisma.userPlan.count({ where: { planId, endDate: null } });
  const creatorProfile = plan.createdBy?.creatorProfile;
  // Public display name prefers the creator's stage name over their legal
  // name (User.name) — see CreatorProfile.stageName in schema.prisma.
  const createdByName = creatorProfile?.stageName || plan.createdBy?.name || null;

  // This creator's other public plans — lets a subscriber discover and
  // one-click switch to a sibling program (e.g. a 3-day vs. 5-day version)
  // without needing to already know its planId/link.
  const otherPlans = plan.createdByUserId
    ? await prisma.workoutPlan.findMany({
        where: { createdByUserId: plan.createdByUserId, visibility: "public", id: { not: planId } },
        include: { days: true },
      })
    : [];

  return NextResponse.json({
    plan: {
      id: plan.id,
      name: plan.name,
      goal: plan.goal,
      visibility: plan.visibility,
      createdByName,
      followerCount,
      createdByUserId: plan.createdByUserId,
      creatorPhotoUrl: creatorProfile?.photoUrl ?? null,
      creatorBio: creatorProfile?.bio ?? null,
      creatorInstagramUrl: creatorProfile?.instagramUrl ?? null,
      creatorYoutubeUrl: creatorProfile?.youtubeUrl ?? null,
      creatorTiktokUrl: creatorProfile?.tiktokUrl ?? null,
      creatorIntroVideoUrl: creatorProfile?.introVideoUrl ?? null,
      otherPlans: otherPlans.map((p) => ({ id: p.id, name: p.name, dayCount: p.days.length })),
      days: plan.days.map((d) => ({
        id: d.id,
        day: d.day,
        name: d.name,
        muscles: d.muscles,
        exercises: d.exercises.map((e) => ({
          id: e.id,
          name: e.name,
          targetSets: e.targetSets,
          targetReps: e.targetReps,
          type: e.type,
        })),
      })),
    },
  });
}
