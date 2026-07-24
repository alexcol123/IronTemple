import Link from "next/link";
import { requireCreator } from "@/lib/auth-roles";
import { prisma } from "@/lib/db";
import { ReadNav } from "@/components/read-nav";

// A creator's own landing page — Home in the nav bar (see
// components/read-nav.tsx). Deliberately not just a stub: Profile-editing
// and Workout-building both used to be permanent nav tabs, but they're
// rare/one-time actions, not things a creator wants a thumb-reach slot for
// on every screen — they live here instead as a quiet button and a card.
export default async function CreatorHomePage() {
  const { userId } = await requireCreator();
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { creatorProfile: true } });
  const displayName = user?.creatorProfile?.stageName || user?.name || "Creator";
  const photoUrl = user?.creatorProfile?.photoUrl;
  const bio = user?.creatorProfile?.bio;

  const LINKS = [
    {
      href: `/build/${userId}?from=business`,
      title: "My Workout",
      description: "Build or edit the program your subscribers follow.",
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
          <p className="text-xs text-muted-foreground">Creator Home</p>
        </div>

        {/* The photo/bio a creator set on their own profile — surfaced here
            too, not just on the public plan page, since this is their own
            landing spot every time they log in. */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-16 h-16 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center">
            {photoUrl ? (
              <img src={photoUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-semibold text-muted-foreground">{displayName[0] ?? "?"}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold text-foreground truncate">{displayName}</p>
            {bio ? (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{bio}</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">No photo or bio yet</p>
            )}
          </div>
        </div>

        <Link
          href="/influencer/me/profile"
          className="text-xs text-muted-foreground hover:text-foreground underline inline-block mb-6"
        >
          Edit profile →
        </Link>

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
