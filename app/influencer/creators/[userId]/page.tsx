import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-roles";
import { prisma } from "@/lib/db";
import { getCreatorSubscribers, timeAgo } from "@/lib/creator-subscribers";

// Admin's per-creator view — everything needed to help one specific creator:
// how many subscribers they have, quick access to build/edit their program,
// and a couple of cheap, concrete "this blocks them from getting subscribers
// at all" flags (no public plan yet, no join code set) rather than anything
// speculative like churn analysis.
export default async function AdminCreatorDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  await requireAdmin();
  const { userId } = await params;

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { creatorProfile: true } });
  if (!user?.creatorProfile) notFound();

  const { plans, memberships, newThisWeek } = await getCreatorSubscribers(userId);
  const publicPlans = plans.filter((p) => p.visibility === "public");
  const displayName = user.creatorProfile.stageName || user.name;

  const issues = [
    publicPlans.length === 0 && "No public program yet — their JOIN code has nothing to route fans to.",
    !user.creatorProfile.joinCode && "No JOIN code set — fans can't text in to follow them yet.",
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-6 pb-16">
        <Link href="/influencer/creators" className="text-xs text-muted-foreground hover:text-foreground mb-3 inline-block">
          ← All Creators
        </Link>

        <div className="flex items-center gap-3 pb-4 mb-6 border-b-2 border-border">
          <div className="w-12 h-12 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center">
            {user.creatorProfile.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.creatorProfile.photoUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs text-muted-foreground">{displayName[0] ?? "?"}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{user.phone}</p>
          </div>
        </div>

        {issues.length > 0 && (
          <div className="rounded-xl border border-amber-400/40 bg-amber-50 dark:bg-amber-950/20 px-3 py-2.5 mb-6 flex flex-col gap-1">
            {issues.map((issue) => (
              <p key={issue} className="text-xs text-amber-700 dark:text-amber-400">
                ⚠ {issue}
              </p>
            ))}
          </div>
        )}

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

        <div className="flex flex-wrap gap-2 mb-8">
          <Link
            href={`/build/${userId}?from=business`}
            className="text-xs font-medium px-3 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white"
          >
            Build their plan →
          </Link>
          {publicPlans[0] && (
            <Link
              href={`/plan/${publicPlans[0].id}?userId=${userId}`}
              className="text-xs font-medium px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors"
            >
              View public plan →
            </Link>
          )}
          <Link
            href={`/menu/${userId}`}
            className="text-xs font-medium px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors"
          >
            Menu →
          </Link>
          <Link
            href={`/influencer/onboarding?phone=${encodeURIComponent(user.phone)}`}
            className="text-xs font-medium px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors"
          >
            Edit profile →
          </Link>
        </div>

        <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-3">Subscribers</p>

        {memberships.length === 0 && (
          <p className="text-sm text-muted-foreground">No subscribers yet.</p>
        )}

        <div className="flex flex-col gap-2">
          {memberships.map((m) => {
            const lastSession = m.user.sessions[0]?.date;
            return (
              <div key={m.id} className="border border-border rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{m.user.name}</p>
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
