import Link from "next/link";
import { requireCreator } from "@/lib/auth-roles";
import { prisma } from "@/lib/db";
import { ReadNav } from "@/components/read-nav";

// A creator's own landing page — link-cards instead of one long form, so
// Profile/Workout/Subscribers/Messaging can each grow independently (banking
// fields, a real subscriber list, broadcast messages) without turning this
// into one giant scrolling page. Messaging has no real page behind it yet
// (see CLAUDE.md) — shown as a disabled "Coming soon" card rather than
// pretending it's finished.
export default async function CreatorHomePage() {
  const { userId } = await requireCreator();
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { creatorProfile: true } });
  const displayName = user?.creatorProfile?.stageName || user?.name || "Creator";

  const LINKS = [
    {
      href: "/influencer/me/profile",
      title: "Profile & Banking",
      description: "Name, bio, socials, intro video. Payout/banking details coming later.",
    },
    {
      href: `/build/${userId}?from=business`,
      title: "My Workout",
      description: "Build or edit the program your subscribers follow.",
    },
    {
      href: "/influencer/me/subscribers",
      title: "Subscribers",
      description: "See who's following your plan.",
    },
  ];

  const COMING_SOON = [
    {
      title: "Messaging",
      description: "Send your subscribers an update or encouragement.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <ReadNav userId={userId} />
      <div className="max-w-lg mx-auto p-6 pb-16">
        <div className="flex items-baseline justify-between pb-4 mb-6 border-b-2 border-border">
          <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">Iron Temple</p>
          <div className="text-right">
            <p className="text-sm font-mono font-medium text-foreground">{displayName}</p>
            <p className="text-xs text-muted-foreground">Creator Home</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block rounded-xl border border-border p-4 hover:bg-muted transition-colors"
            >
              <p className="text-sm font-semibold text-foreground">{link.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{link.description}</p>
            </Link>
          ))}

          {COMING_SOON.map((item) => (
            <div key={item.title} className="rounded-xl border border-border p-4 opacity-50">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                  Coming soon
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
