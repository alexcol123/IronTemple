"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ReadNav } from "@/components/read-nav";

type ExerciseHistory = {
  name: string;
  hasData: boolean;
  chart?: { week: string; weight: number }[];
  monthly?: { month: string; weight: number }[];
  currentBest?: number;
  currentBestDate?: string;
  lastSession?: { date: string; summary: string };
  totalSessions?: number;
  progress?: { startWeight: number; percentGain: number } | null;
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtMonth(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function Bars({ points }: { points: { key: string; label: string; weight: number }[] }) {
  const max = Math.max(...points.map((p) => p.weight));
  const min = Math.min(...points.map((p) => p.weight));
  const range = max - min || 1;
  return (
    <div className="flex items-end gap-2 h-28 overflow-x-auto">
      {points.map((point, i) => {
        const heightPct = 30 + ((point.weight - min) / range) * 70;
        const isLast = i === points.length - 1;
        return (
          <div key={point.key} className="flex-1 min-w-8 flex flex-col items-center justify-end gap-1.5 h-full">
            <div
              className={`w-full rounded-t ${isLast ? "bg-amber-500" : "bg-amber-200 dark:bg-amber-900"}`}
              style={{ height: `${heightPct}%` }}
            />
            <div className={`text-[10px] font-mono ${isLast ? "text-amber-500 font-bold" : "text-muted-foreground"}`}>
              {point.weight}
            </div>
            <div className="text-[9px] text-muted-foreground">{point.label}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function ExerciseHistoryPage() {
  const { userId, name } = useParams<{ userId: string; name: string }>();
  const router = useRouter();
  const [data, setData] = useState<ExerciseHistory | null>(null);
  const exerciseName = decodeURIComponent(name);

  useEffect(() => {
    fetch(`/api/exercise-history/${userId}?name=${encodeURIComponent(exerciseName)}`)
      .then((r) => r.json())
      .then(setData);
  }, [userId, exerciseName]);

  return (
    <div className="min-h-screen bg-background">
      <ReadNav userId={userId} />
      <div className="max-w-lg mx-auto p-6 pb-16">
        {/* Back link */}
        <button
          onClick={() => router.push(`/prs/${userId}`)}
          className="text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          ← Back to PRs
        </button>

        {/* Nameplate */}
        <div className="flex items-baseline justify-between pb-4 mb-6 border-b-2 border-border">
          <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">Iron Temple</p>
          <p className="text-sm font-mono font-medium text-foreground">{exerciseName}</p>
        </div>

        {!data && <p className="text-sm text-muted-foreground text-center mt-8">Loading...</p>}

        {data && !data.hasData && (
          <p className="text-sm text-muted-foreground text-center mt-8">
            No logged sets for {exerciseName} yet.
          </p>
        )}

        {data?.hasData && (
          <>
            {/* Current best */}
            <div className="border border-border rounded-xl p-5 mb-6 text-center">
              <p className="text-xs font-bold tracking-widest uppercase text-amber-500 mb-1">Current PR</p>
              <p className="text-3xl font-extrabold font-mono text-foreground">{data.currentBest} lbs</p>
              <p className="text-xs text-muted-foreground mt-1">
                {data.currentBestDate ? fmt(data.currentBestDate) : ""}
              </p>
              {data.progress && (
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-2">
                  ↑ {data.progress.percentGain}% since you started at {data.progress.startWeight} lbs
                </p>
              )}
            </div>

            {/* Weekly chart — recent, fine-grained */}
            {data.chart && data.chart.length > 1 && (
              <div className="mb-6">
                <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-3">
                  Last {data.chart.length} weeks
                </p>
                <div className="border border-border rounded-xl p-5">
                  <Bars
                    points={data.chart.map((p) => ({ key: p.week, label: "", weight: p.weight }))}
                  />
                </div>
              </div>
            )}

            {/* Monthly rollup — all-time trendline */}
            {data.monthly && data.monthly.length > 1 && (
              <div className="mb-6">
                <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-3">
                  All-time, by month
                </p>
                <div className="border border-border rounded-xl p-5">
                  <Bars
                    points={data.monthly.map((p) => ({ key: p.month, label: fmtMonth(p.month), weight: p.weight }))}
                  />
                </div>
              </div>
            )}

            {/* Last session + total */}
            {data.lastSession && (
              <div className="border border-border rounded-xl p-4 mb-4">
                <p className="text-xs font-semibold text-foreground mb-0.5">
                  Last session ({fmt(data.lastSession.date)})
                </p>
                <p className="text-xs text-muted-foreground">{data.lastSession.summary}</p>
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
              {data.totalSessions} session{data.totalSessions === 1 ? "" : "s"} logged total
            </p>
          </>
        )}
      </div>
    </div>
  );
}
