import Link from "next/link";
import { requireAdmin } from "@/lib/auth-roles";

// =============================================================================
// /influencer — Creator-side tools, prototype stage. Mirrors /admin's
// topic-index pattern. Add a new folder + page here per topic as the
// creator-monetization layer gets built (see CLAUDE.md's "What needs to be
// built next").
// =============================================================================

const TOPICS = [
  {
    href: "/influencer/onboarding",
    title: "Onboarding",
    description: "Set up a creator profile — photo, bio, socials, intro video. Real User + CreatorProfile rows, no payment yet.",
  },
  {
    href: "/influencer/creators",
    title: "All Creators",
    description: "Every onboarded creator so far, with links to build their plan, view their public plan page, or edit their profile.",
  },
];

// Admin-only — manages every creator. A creator signing in lands on
// /influencer/me instead (see the redirect logic in app/page.tsx).
export default async function InfluencerIndexPage() {
  await requireAdmin();
  return (
    <div className="min-h-screen bg-background p-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Creator Tools</h1>
        <p className="text-sm text-muted-foreground mt-1 mb-8">
          Prototype space for the creator/influencer side of the app — the monetization layer described in CLAUDE.md, built incrementally.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {TOPICS.map((topic) => (
          <Link
            key={topic.href}
            href={topic.href}
            className="block rounded-xl border border-border p-4 hover:bg-muted transition-colors"
          >
            <p className="text-sm font-semibold text-foreground">{topic.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{topic.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
