"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function ReadNav({ userId }: { userId: string }) {
  const pathname = usePathname();
  const [isCreator, setIsCreator] = useState(false);

  useEffect(() => {
    fetch(`/api/profile?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => setIsCreator(!!data.user?.isCreator));
  }, [userId]);

  const onBusinessSide = pathname.startsWith("/influencer");

  // Personal side: History/PRs/Menu — the real athlete pages. Weekly
  // Progress isn't in here on purpose (meant to arrive via a proactive
  // Sunday-evening SMS link per CLAUDE.md, not be browsed to); still one tap
  // away inside Menu until that send exists.
  //
  // Business side: Profile/Workout — the only two real creator pages today.
  // Subscribers/Messaging aren't built yet, so nothing to link to until they
  // exist (see the "Coming soon" cards on /influencer/me).
  const tabs = onBusinessSide
    ? [
        { label: "Profile", href: "/influencer/me/profile", active: pathname.startsWith("/influencer/me/profile") },
        { label: "Workout", href: `/build/${userId}?from=business`, active: pathname.startsWith("/build/") },
      ]
    : [
        { label: "History", href: `/history/${userId}`, active: pathname.startsWith("/history/") },
        { label: "PRs", href: `/prs/${userId}`, active: pathname.startsWith("/prs/") },
        { label: "Menu", href: `/menu/${userId}`, active: pathname.startsWith("/menu/") },
      ];

  return (
    <div className="px-3 py-2 border-b flex items-center gap-1">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`flex-1 text-center text-xs px-2 py-1.5 rounded-lg transition-colors ${
            tab.active ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          {tab.label}
        </Link>
      ))}

      {/* Personal/Business toggle — creators only. Just two fixed
          destinations with active state derived from the current path, same
          mechanism as the tabs above; nothing to persist. Personal lands on
          /history rather than /today — /today is the focused, no-nav workout
          logging screen, so landing there would mean losing the toggle
          entirely until navigating elsewhere. */}
      {isCreator && (
        <div className="flex-1 flex rounded-lg overflow-hidden border border-border text-xs">
          <Link
            href={`/history/${userId}`}
            className={`flex-1 text-center px-2 py-1.5 transition-colors ${
              !onBusinessSide ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Personal
          </Link>
          <Link
            href="/influencer/me"
            className={`flex-1 text-center px-2 py-1.5 transition-colors ${
              onBusinessSide ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Business
          </Link>
        </div>
      )}
    </div>
  );
}
