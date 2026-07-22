import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSignedInRole } from "@/lib/auth-roles";

// Every onboarded creator, for the "who's on the app" list at
// /influencer/creators — the onboarding page itself has no memory once you
// navigate away (you'd have to re-enter their phone and hit Load), so this
// is the actual way to find a creator again afterward. Admin-only: it lists
// every creator's phone/photo/plans, which a single creator shouldn't see.
export async function GET() {
  const role = await getSignedInRole();
  if (role.role !== "admin") return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const profiles = await prisma.creatorProfile.findMany({
    include: {
      user: {
        include: {
          createdPlans: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    creators: profiles.map((p) => ({
      userId: p.userId,
      name: p.user.name,
      stageName: p.stageName,
      phone: p.user.phone,
      photoUrl: p.photoUrl,
      plans: p.user.createdPlans,
    })),
  });
}
