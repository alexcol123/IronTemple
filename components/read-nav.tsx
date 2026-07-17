"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "History", path: "history" },
  { label: "PRs", path: "prs" },
  { label: "Progress", path: "progress" },
  { label: "Menu", path: "menu" },
];

export function ReadNav({ userId }: { userId: string }) {
  const pathname = usePathname();

  return (
    <div className="px-3 py-2 border-b flex items-center gap-1">
      {TABS.map((tab) => {
        const href = `/${tab.path}/${userId}`;
        const active = pathname.startsWith(`/${tab.path}/`);
        return (
          <Link
            key={tab.path}
            href={href}
            className={`flex-1 text-center text-xs px-2 py-1.5 rounded-lg transition-colors ${
              active
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
