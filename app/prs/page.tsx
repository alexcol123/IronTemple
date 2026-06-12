"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type PR = { name: string; weight: number; reps: number; date: string };

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
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
          {prs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center mt-8">No PRs yet. Go lift!</p>
          )}
          {prs.map((pr) => {
            const date = new Date(pr.date).toLocaleDateString("en-US", {
              month: "short", day: "numeric", year: "numeric",
            });
            return (
              <div key={pr.name} className="flex items-center justify-between py-2 border-b last:border-0">
                <p className="text-sm font-medium flex-1 pr-4">{pr.name}</p>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">{pr.weight}lbs × {pr.reps}</p>
                  <p className="text-xs text-muted-foreground">{date}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
