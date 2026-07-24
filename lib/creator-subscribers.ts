import { prisma } from "@/lib/db";
import { getMondayOfThisWeek } from "@/lib/sms-engine";

// Shared by a creator's own dashboard (/influencer/me/subscribers) and
// admin's per-creator view (/influencer/creators/[userId]) — same query,
// same shape, just called for a different creatorUserId depending on who's
// asking. Excludes the creator's own row in case they follow their own plan.
export async function getCreatorSubscribers(creatorUserId: string) {
  const plans = await prisma.workoutPlan.findMany({ where: { createdByUserId: creatorUserId } });
  const planIds = plans.map((p) => p.id);

  const memberships = await prisma.userPlan.findMany({
    where: { planId: { in: planIds }, endDate: null, userId: { not: creatorUserId } },
    include: {
      user: { include: { sessions: { orderBy: { date: "desc" }, take: 1 } } },
      plan: true,
    },
    orderBy: { startDate: "desc" },
  });

  const monday = getMondayOfThisWeek();
  const newThisWeek = memberships.filter((m) => m.startDate >= monday).length;

  return { plans, memberships, newThisWeek };
}

export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 3600) return "just now";
  const hours = Math.floor(seconds / 3600);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
