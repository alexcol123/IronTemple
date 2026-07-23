import Link from "next/link";
import { requireCreator } from "@/lib/auth-roles";
import { prisma } from "@/lib/db";
import { ReadNav } from "@/components/read-nav";
import { getMondayOfThisWeek } from "@/lib/sms-engine";

// Everyone shows as "Trial" for now — there's no real Stripe billing yet
// (see CLAUDE.md's dependency order: this dashboard comes before payment),
// so there's no real trial/paid state to distinguish. The badge is here so
// the layout doesn't need to change shape once billing lands.
function StatusBadge() {
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 uppercase tracking-wide">
      Trial
    </span>
  );
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 3600) return "just now";
  const hours = Math.floor(seconds / 3600);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default async function CreatorSubscribersPage() {
  const { userId } = await requireCreator();

  const myPlans = await prisma.workoutPlan.findMany({ where: { createdByUserId: userId } });
  const planIds = myPlans.map((p) => p.id);

  const memberships = await prisma.userPlan.findMany({
    where: { planId: { in: planIds }, endDate: null, userId: { not: userId } },
    include: {
      user: { include: { sessions: { orderBy: { date: "desc" }, take: 1 } } },
      plan: true,
    },
    orderBy: { startDate: "desc" },
  });

  const monday = getMondayOfThisWeek();
  const newThisWeek = memberships.filter((m) => m.startDate >= monday).length;

  return (
    <div className="min-h-screen bg-background">
      <ReadNav userId={userId} />
      <div className="max-w-lg mx-auto p-6 pb-16">
        <Link href="/influencer/me" className="text-xs text-muted-foreground hover:text-foreground mb-3 inline-block">
          ← Creator Home
        </Link>

        <div className="flex items-baseline justify-between pb-4 mb-6 border-b-2 border-border">
          <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">Iron Temple</p>
          <p className="text-xs text-muted-foreground">Subscribers</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="border border-border rounded-xl p-4">
            <p className="text-2xl font-bold text-foreground">{memberships.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total subscribers</p>
          </div>
          <div className="border border-border rounded-xl p-4">
            <p className="text-2xl font-bold text-foreground">{newThisWeek}</p>
            <p className="text-xs text-muted-foreground mt-0.5">New this week</p>
          </div>
        </div>

        {memberships.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No subscribers yet — share your JOIN code to get your first one.
          </p>
        )}

        <div className="flex flex-col gap-2">
          {memberships.map((m) => {
            const lastSession = m.user.sessions[0]?.date;
            return (
              <div key={m.id} className="border border-border rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{m.user.name}</p>
                    <StatusBadge />
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{m.plan.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">
                    {lastSession ? `Active ${timeAgo(lastSession)}` : "Hasn't trained yet"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Joined {m.startDate.toLocaleDateString()}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
