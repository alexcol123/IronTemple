import Link from "next/link";
import { requireCreator } from "@/lib/auth-roles";
import { ReadNav } from "@/components/read-nav";
import { getCreatorSubscribers, timeAgo } from "@/lib/creator-subscribers";

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

export default async function CreatorSubscribersPage() {
  const { userId } = await requireCreator();
  const { memberships, newThisWeek } = await getCreatorSubscribers(userId);

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
