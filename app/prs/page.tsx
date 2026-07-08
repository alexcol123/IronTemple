"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type PR = {
  name: string;
  weightPR: number;
  weightPRDate: string;
  lastSession: string;
  lastSessionDate: string;
  nextTarget: string;
};

export default function PRsPage() {
  const [prs, setPrs] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("it_phone");
    if (!saved) { setLoading(false); return; }
    setPhone(saved);
    fetch(`/api/prs?phone=${encodeURIComponent(saved)}`)
      .then((r) => r.json())
      .then((data) => setPrs(data.prs ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen text-sm text-muted-foreground">Loading...</div>;

  if (!phone) {
    return (
      <div className="flex items-center justify-center h-screen text-sm text-center px-4">
        <div>
          <p className="mb-2">No phone found.</p>
          <Link href="/" className="underline">Go back and sign in first.</Link>
        </div>
      </div>
    );
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="flex items-center justify-center h-screen bg-background overflow-hidden">
      <div className="flex flex-col w-full max-w-sm h-full sm:h-175 sm:border sm:rounded-3xl overflow-hidden sm:shadow-md">
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <Link href="/" className="text-xs text-muted-foreground">← Back</Link>
          <p className="font-semibold text-sm">Personal Records</p>
          <div className="w-10" />
        </div>

        {/* PR list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {prs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center mt-8">No PRs yet. Go lift!</p>
          )}
          {prs.map((pr) => (
            <div key={pr.name} className="border rounded-2xl px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{pr.name}</p>
                <div className="text-right">
                  <p className="text-sm font-semibold">{pr.weightPR} lbs (PR)</p>
                  <p className="text-xs text-muted-foreground">{fmt(pr.weightPRDate)}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Last session ({fmt(pr.lastSessionDate)}): {pr.lastSession}
              </p>
              <p className="text-xs font-medium text-foreground mt-1">
                🎯 Next target: {pr.nextTarget}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
