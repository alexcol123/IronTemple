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
  inCurrentPlan: boolean;
};

const MAX_FAVORITES = 7;

export default function PRsByIdPage() {
  const { userId } = useParams<{ userId: string }>();
  const [prs, setPrs] = useState<PR[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  // Whichever row just triggered a message (cap reached, or not in current
  // plan) — shown inline right at that row instead of one message up top,
  // which is easy to miss if you're scrolled down clicking a star further
  // down the list.
  const [rowNotice, setRowNotice] = useState<{ row: string; message: string } | null>(null);

  function showNotice(name: string, message: string) {
    setRowNotice({ row: name, message });
    setTimeout(() => setRowNotice((current) => (current?.row === name ? null : current)), 8000);
  }

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetch(`/api/prs?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((data) => {
        setPrs(data.prs ?? []);
        setFavorites(data.favoriteExercises ?? []);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  async function toggleFavorite(name: string, isFavorited: boolean, inCurrentPlan: boolean) {
    // Short-circuit client-side — no need to round-trip to the API for a
    // case we already know will fail.
    if (!isFavorited && !inCurrentPlan) {
      showNotice(name, "Not in your current plan — add it as a custom exercise to track it.");
      return;
    }
    setRowNotice(null);
    const res = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, exerciseName: name }),
    });
    const data = await res.json();
    if (!res.ok) {
      showNotice(name, data.error ?? "Something went wrong.");
      return;
    }
    setFavorites(data.favoriteExercises);
  }

  if (loading)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // Favorited exercises float to the top, in the order they were starred —
  // everything else stays below in its normal (alphabetical) order.
  const favoritedPrs = favorites.map((name) => prs.find((p) => p.name === name)).filter((p): p is PR => !!p);
  const otherPrs = prs.filter((p) => !favorites.includes(p.name));

  function renderRow(pr: PR) {
    const isFavorited = favorites.includes(pr.name);
    const disabled = !isFavorited && !pr.inCurrentPlan;
    return (
      <div key={pr.name} className="flex flex-col gap-1.5">
        <div className="border border-border rounded-xl px-4 py-3 flex gap-2">
          <button
            onClick={() => toggleFavorite(pr.name, isFavorited, pr.inCurrentPlan)}
            aria-label={isFavorited ? "Remove favorite" : disabled ? "Not in current plan" : "Add favorite"}
            className={`text-lg leading-none pt-0.5 ${
              isFavorited
                ? "text-amber-500"
                : disabled
                  ? "text-muted-foreground/40"
                  : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {isFavorited ? "★" : "☆"}
          </button>
          <Link href={`/exercise/${userId}/${encodeURIComponent(pr.name)}`} className="flex-1 block hover:opacity-80">
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
        </div>
        {rowNotice?.row === pr.name && (
          <p className="text-xs text-destructive border border-destructive/30 bg-destructive/10 rounded-lg px-3 py-2">
            {rowNotice.message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ReadNav userId={userId} />
      <div className="max-w-lg mx-auto p-6 pb-16">
        {/* Nameplate */}
        <div className="flex items-baseline justify-between pb-4 mb-2 border-b-2 border-border">
          <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">Iron Temple</p>
          <p className="text-xs text-muted-foreground">Personal Records</p>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-amber-400/40 bg-amber-50 dark:bg-amber-950/20 px-3 py-2.5 mb-4">
          <span className="text-amber-500 text-base leading-none">★</span>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Star up to {MAX_FAVORITES} exercises — whichever have the biggest gains that week (top 2) get featured on
            your Weekly Progress report.
          </p>
        </div>

        {prs.length === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-8">No PRs yet. Go lift!</p>
        )}

        {favoritedPrs.length > 0 && (
          <>
            <div className="flex items-center gap-2.5 mb-3">
              <p className="text-xs font-bold tracking-widest uppercase text-amber-500 whitespace-nowrap">★ Favorites</p>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="flex flex-col gap-3 mb-6">{favoritedPrs.map(renderRow)}</div>
          </>
        )}

        {otherPrs.length > 0 && (
          <>
            {favoritedPrs.length > 0 && (
              <div className="flex items-center gap-2.5 mb-3">
                <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground whitespace-nowrap">
                  All Exercises
                </p>
                <div className="h-px flex-1 bg-border" />
              </div>
            )}
            <div className="flex flex-col gap-3">{otherPrs.map(renderRow)}</div>
          </>
        )}
      </div>
    </div>
  );
}
