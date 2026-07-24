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

  // One count query per creator — same "small creator count for now" call
  // as getSignedInRole's plain findMany (see lib/auth-roles.ts), not worth a
  // fancier grouped query until there are enough creators for it to matter.
  const creators = await Promise.all(
    profiles.map(async (p) => ({
      userId: p.userId,
      name: p.user.name,
      stageName: p.stageName,
      phone: p.user.phone,
      photoUrl: p.photoUrl,
      plans: p.user.createdPlans,
      subscriberCount: await prisma.userPlan.count({
        where: { endDate: null, userId: { not: p.userId }, plan: { createdByUserId: p.userId } },
      }),
    })),
  );

  return NextResponse.json({ creators });
}
