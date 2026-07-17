"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ReadNav } from "@/components/read-nav";

type PR = { name: string; value: number; unit: string; previousBest: number };
type ProgressData = {
  hasData: boolean;
  name?: string;
  weekStart?: string;
  weekEnd?: string;
  prsThisWeek?: PR[];
  consistency?: { hit: number; planned: number; daysHit: string[]; missed: number };
  weekStreak?: number;
  hero?: {
    name: string;
    chart: { week: string; weight: number }[];
    forward: { current: number; targetReps: number; nextWeight: number | null } | null;
  } | null;
  month?: { sessions: number; newPRs: number; weekStreak: number };
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatDateRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
}

export default function WeeklyProgressPage() {
  const { userId } = useParams<{ userId: string }>();
  const [data, setData] = useState<ProgressData | null>(null);

  useEffect(() => {
    fetch(`/api/progress/${userId}`)
      .then((r) => r.json())
      .then(setData);
  }, [userId]);

  if (!data) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!data.hasData) {
    return (
      <div className="min-h-screen bg-background">
        <ReadNav userId={userId} />
        <div className="p-6 max-w-lg mx-auto">
          <p className="text-sm text-muted-foreground">
            No workouts logged yet — your first weekly recap will show up here once you've logged a session.
          </p>
        </div>
      </div>
    );
  }

  const { name, weekStart, weekEnd, prsThisWeek = [], consistency, weekStreak = 0, hero, month } = data;
  const headline = prsThisWeek[0];
  const weekStartDate = weekStart ? new Date(weekStart) : new Date();

  return (
    <div className="min-h-screen bg-background">
      <ReadNav userId={userId} />
      <div className="max-w-lg mx-auto p-6 pb-16">
        {/* Nameplate */}
        <div className="flex items-baseline justify-between pb-4 mb-6 border-b-2 border-border">
          <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">Iron Temple</p>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Weekly Recap</p>
            <p className="text-sm font-mono font-medium text-foreground">
              {weekStart && weekEnd ? formatDateRange(weekStart, weekEnd) : ""}
            </p>
          </div>
        </div>

        {/* Hero */}
        <div className="mb-9">
          <p className="text-xs font-bold tracking-widest uppercase text-amber-500 mb-2">
            {headline ? "Headline" : "This Week"}
          </p>
          <h1 className="text-2xl font-extrabold leading-tight text-foreground mb-2">
            {headline
              ? `New PR on ${headline.name} — ${headline.value} ${headline.unit}`
              : "Another week in the books"}
          </h1>
          <p className="text-sm text-muted-foreground max-w-md">
            {name ? name.split(" ")[0] : "You"}
            {headline
              ? `, you closed the week with your best ${headline.name.toLowerCase()} yet. Here's everything else you earned.`
              : ", keep showing up — the numbers move even on the weeks that don't feel flashy."}
          </p>
        </div>

        {/* PRs */}
        {prsThisWeek.length > 0 && (
          <>
            <SectionLabel>PRs this week</SectionLabel>
            <div className="grid grid-cols-3 gap-3 mb-9">
              {prsThisWeek.slice(0, 3).map((pr) => (
                <div key={pr.name} className="border border-border rounded-xl p-3 text-center">
                  <div className="w-14 h-14 rounded-full border-4 border-amber-500 flex items-center justify-center mx-auto mb-2">
                    <span className="text-sm font-mono font-bold text-amber-500">{pr.value}</span>
                  </div>
                  <p className="text-xs font-semibold text-foreground">{pr.name}</p>
                  <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                    +{pr.value - pr.previousBest} {pr.unit}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Consistency */}
        {consistency && (
          <>
            <SectionLabel>Consistency</SectionLabel>
            <div className="border border-border rounded-xl p-5 mb-9">
              <div className="flex items-baseline justify-between mb-4">
                <div className="text-2xl font-extrabold font-mono text-foreground">
                  {consistency.hit}
                  <span className="text-sm font-normal text-muted-foreground"> of {consistency.planned} planned</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">{weekStreak}</div>
                  <div className="text-[10px] tracking-wide uppercase text-muted-foreground">week streak</div>
                </div>
              </div>
              <div className="flex gap-2">
                {DAY_LABELS.map((label, i) => {
                  const d = new Date(weekStartDate);
                  d.setDate(weekStartDate.getDate() + i);
                  const hit = consistency.daysHit.includes(d.toDateString());
                  return (
                    <div key={label} className="flex-1 text-center">
                      <div
                        className={`aspect-square rounded-lg flex items-center justify-center text-xs font-bold mb-1 ${
                          hit
                            ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                            : "border border-dashed border-border text-muted-foreground"
                        }`}
                      >
                        {hit ? "✓" : "–"}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Hero progression chart */}
        {hero && hero.chart.length > 1 && (
          <>
            <SectionLabel>{hero.name} — {hero.chart.length} week climb</SectionLabel>
            <div className="border border-border rounded-xl p-5 mb-9">
              <div className="flex items-baseline justify-between mb-4">
                <span className="text-sm font-semibold text-foreground">{hero.name}</span>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  ↑ {hero.chart[hero.chart.length - 1].weight - hero.chart[0].weight} since {hero.chart.length} weeks ago
                </span>
              </div>
              <div className="flex items-end gap-2.5 h-24">
                {hero.chart.map((point, i) => {
                  const max = Math.max(...hero.chart.map((p) => p.weight));
                  const min = Math.min(...hero.chart.map((p) => p.weight));
                  const range = max - min || 1;
                  const heightPct = 30 + ((point.weight - min) / range) * 70;
                  const isLast = i === hero.chart.length - 1;
                  return (
                    <div key={point.week} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
                      <div
                        className={`w-full rounded-t ${isLast ? "bg-amber-500" : "bg-amber-200 dark:bg-amber-900"}`}
                        style={{ height: `${heightPct}%` }}
                      />
                      <div className={`text-xs font-mono ${isLast ? "text-amber-500 font-bold" : "text-muted-foreground"}`}>
                        {point.weight}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Gentle note on any miss */}
        {consistency && consistency.missed > 0 && (
          <p className="text-xs text-muted-foreground leading-relaxed pl-4 border-l-2 border-border mb-9">
            Quick note: you hit {consistency.hit} of {consistency.planned} planned sessions this week — no big deal,
            every week you show up counts. Keep stacking weeks like the good ones.
          </p>
        )}

        {/* Forward look */}
        {hero?.forward && (
          <div className="rounded-xl border border-border p-5 mb-9 bg-amber-50/50 dark:bg-amber-950/20">
            <p className="text-xs font-bold tracking-wide uppercase text-amber-600 dark:text-amber-500 mb-2">Next up</p>
            <p className="text-sm text-foreground max-w-md">
              You&apos;re at <strong className="text-amber-600 dark:text-amber-500">{hero.forward.current} lbs</strong> on{" "}
              {hero.name}. Clear <strong className="text-amber-600 dark:text-amber-500">{hero.forward.targetReps} reps</strong>{" "}
              on your top set next time and {hero.forward.nextWeight} lbs is yours.
            </p>
          </div>
        )}

        {/* Month strip */}
        {month && (
          <div className="flex justify-between gap-3 pt-5 border-t-2 border-border">
            <MonthStat value={month.sessions} label="Workouts this month" />
            <MonthStat value={month.newPRs} label="New PRs this month" />
            <MonthStat value={month.weekStreak} label="Week streak" />
          </div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground whitespace-nowrap">{children}</p>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function MonthStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex-1 text-center">
      <div className="text-xl font-extrabold font-mono text-foreground">{value}</div>
      <div className="text-[10px] tracking-wide uppercase text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
