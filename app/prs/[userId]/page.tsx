"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ReadNav } from "@/components/read-nav";

type PR = {
  name: string;
  weightPR: number;
  weightPRDate: string;
  lastSession: string;
  lastSessionDate: string;
  nextTarget: string;
};

export default function PRsByIdPage() {
  const { userId } = useParams<{ userId: string }>();
  const [prs, setPrs] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetch(`/api/prs?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((data) => setPrs(data.prs ?? []))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="min-h-screen bg-background">
      <ReadNav userId={userId} />
      <div className="max-w-lg mx-auto p-6 pb-16">
        {/* Nameplate */}
        <div className="flex items-baseline justify-between pb-4 mb-6 border-b-2 border-border">
          <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">Iron Temple</p>
          <p className="text-xs text-muted-foreground">Personal Records</p>
        </div>

        {/* PR list */}
        <div className="flex flex-col gap-3">
          {prs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center mt-8">No PRs yet. Go lift!</p>
          )}
          {prs.map((pr) => (
            <Link
              key={pr.name}
              href={`/exercise/${userId}/${encodeURIComponent(pr.name)}`}
              className="border border-border rounded-xl px-4 py-3 block hover:bg-muted transition-colors"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{pr.name}</p>
                <div className="text-right">
                  <p className="text-sm font-bold font-mono text-amber-500">{pr.weightPR} lbs</p>
                  <p className="text-xs text-muted-foreground">{fmt(pr.weightPRDate)}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Last session ({fmt(pr.lastSessionDate)}): {pr.lastSession}
              </p>
              <p className="text-xs font-medium text-foreground mt-1">
                🎯 Next target: {pr.nextTarget}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
