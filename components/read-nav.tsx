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

  // Personal side: Today/PRs/Menu — the real athlete pages. Labeled "Today"
  // rather than "History" even though it still points at /history — that
  // page leads with a Start/Continue Workout card (see
  // app/history/[userId]/page.tsx), so "Today" sets the right expectation
  // for what tapping it is actually for, matching the same word already
  // used everywhere else (the real /today route, "Type HERE to start
  // today's workout" over SMS) instead of a third synonym for the same
  // concept. Weekly Progress isn't in here on purpose (meant to arrive via
  // a proactive Sunday-evening SMS link per CLAUDE.md, not be browsed to);
  // still one tap away inside Menu until that send exists.
  //
  // Business side: Home/Subs — kept deliberately short. Profile and Workout
  // used to also be tabs, but most creators are on a phone and Subs (their
  // subscriber count/growth — the number they actually want to check often)
  // earns a permanent slot far more than Profile-editing or Workout-building
  // do, both rare/one-time actions. Those two now live as a button and a
  // card on /influencer/me itself instead. Exact match (not startsWith) for
  // Home so its own sub-pages (Profile, Subscribers) don't also light it up.
  const tabs = onBusinessSide
    ? [
        { label: "Home", href: "/influencer/me", active: pathname === "/influencer/me" },
        { label: "Subs", href: "/influencer/me/subscribers", active: pathname.startsWith("/influencer/me/subscribers") },
      ]
    : [
        { label: "Today", href: `/history/${userId}`, active: pathname.startsWith("/history/") },
        { label: "PRs", href: `/prs/${userId}`, active: pathname.startsWith("/prs/") },
        { label: "Menu", href: `/menu/${userId}`, active: pathname.startsWith("/menu/") },
      ];

  return (
    <div className="px-3 py-2 border-b flex items-center gap-1">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`flex-1 text-center text-xs px-2 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
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
          entirely until navigating elsewhere.
          flex-[2] (vs. flex-1 on the tabs above) since this one box holds two
          full labels ("Personal"/"Business") where each tab holds one — an
          equal flex-1 split left "Business" too narrow for its own text on a
          phone-width screen, clipping the last letters. Tighter internal
          padding (px-1.5 vs the tabs' px-2) buys a little more back too. */}
      {isCreator && (
        <div className="flex-2 flex rounded-lg overflow-hidden border border-border text-xs">
          <Link
            href={`/history/${userId}`}
            className={`flex-1 text-center px-1 py-1.5 whitespace-nowrap transition-colors ${
              !onBusinessSide ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Personal
          </Link>
          <Link
            href="/influencer/me"
            className={`flex-1 text-center px-1 py-1.5 whitespace-nowrap transition-colors ${
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
