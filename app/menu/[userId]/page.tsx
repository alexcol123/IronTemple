"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ReadNav } from "@/components/read-nav";

const ITEMS = [
  { label: "How It Works", desc: "Quick videos on using the app", path: "how-it-works" },
  { label: "My Info", desc: "Name, goal, experience level", path: "profile" },
  { label: "Build Your Workout", desc: "Create your own custom split", path: "build" },
  { label: "Exercise Guide", desc: "How to do each move", path: "exercises" },
  // On-demand for now while testing — later this should only "release" on a
  // schedule (e.g. Sunday), like a weekly report card, instead of being
  // available to check any time.
  { label: "Weekly Progress", desc: "PRs, consistency, and your climb this week", path: "progress" },
  { label: "Commands", desc: "Every text command the app understands", path: "commands" },
  // Prototype-only shortcut — not user-scoped, just a straight link to the dev
  // admin tools. Remove or move once this isn't needed in the main menu anymore.
  { label: "Admin", desc: "Dev tools — exercise library, progression notes", path: "admin", static: true },
];

export default function MenuPage() {
  const { userId } = useParams<{ userId: string }>();

  return (
    <div className="min-h-screen bg-background">
      <ReadNav userId={userId} />
      <div className="max-w-lg mx-auto p-6 pb-16">
        {/* Nameplate */}
        <div className="flex items-baseline justify-between pb-4 mb-6 border-b-2 border-border">
          <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">Iron Temple</p>
          <p className="text-xs text-muted-foreground">Menu</p>
        </div>

        {/* Menu items */}
        <div className="flex flex-col gap-2">
          {ITEMS.map((item) => (
            <Link
              key={item.path}
              href={item.static ? `/${item.path}` : `/${item.path}/${userId}`}
              className="border border-border rounded-xl px-4 py-3 hover:bg-muted transition-colors"
            >
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
