"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ReadNav } from "@/components/read-nav";

type PR = { name: string; value: number; unit: string; previousBest: number };
type Hero = {
  name: string;
  unit: "lbs" | "reps";
  thisWeekValue: number;
  changeType: "increase" | "reps";
  change: number;
  chart: { week: string; weight: number }[];
  forward: { current: number; targetReps: number; nextWeight: number | null } | null;
};
type OtherTracked = { name: string; unit: "lbs" | "reps"; currentBest: number; lastLoggedDate: string };
type ProgressData = {
  hasData: boolean;
  name?: string;
  weekStart?: string;
  weekEnd?: string;
  prsThisWeek?: PR[];
  consistency?: { hit: number; planned: number; daysHit: string[]; missed: number };
  weekStreak?: number;
  heroes?: Hero[];
  others?: OtherTracked[];
  usingFavorites?: boolean;
  month?: { sessions: number; newPRs: number; weekStreak: number };
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatDateRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

  const {
    name,
    weekStart,
    weekEnd,
    prsThisWeek = [],
    consistency,
    weekStreak = 0,
    heroes = [],
    others = [],
    usingFavorites,
    month,
  } = data;
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

        {/* Hero progression cards — top 2 spotlight, favorites first (or
            curated brag-worthy lifts before any are starred), ranked by this
            week's weight increase, or by reps if nothing got heavier. */}
        {heroes.map((h) => (
          <div key={h.name} className="mb-9">
            <SectionLabel>
              {h.name} {h.chart.length > 1 ? `— ${h.chart.length} week climb` : ""}
            </SectionLabel>
            <div className="border border-border rounded-xl p-5">
              <div className="flex items-baseline justify-between mb-4">
                <span className="text-sm font-semibold text-foreground">{h.name}</span>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {h.changeType === "increase"
                    ? `↑ ${h.change} ${h.unit} since ${h.chart.length} week${h.chart.length === 1 ? "" : "s"} ago`
                    : `${h.change} reps this week`}
                </span>
              </div>
              {h.chart.length > 1 ? (
                <div className="flex items-end gap-2.5 h-24">
                  {h.chart.map((point, i, arr) => {
                    const max = Math.max(...arr.map((p) => p.weight));
                    const min = Math.min(...arr.map((p) => p.weight));
                    const range = max - min || 1;
                    const heightPct = 30 + ((point.weight - min) / range) * 70;
                    const isLast = i === arr.length - 1;
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
              ) : (
                <p className="text-2xl font-extrabold font-mono text-foreground">
                  {h.thisWeekValue} {h.unit}
                </p>
              )}

              {h.forward && (
                <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
                  You&apos;re at <strong className="text-amber-600 dark:text-amber-500">{h.forward.current} lbs</strong>.
                  Clear <strong className="text-amber-600 dark:text-amber-500">{h.forward.targetReps} reps</strong> on your
                  top set next time and {h.forward.nextWeight} lbs is yours.
                </p>
              )}
            </div>
          </div>
        ))}

        {/* Everything else you're tracking that didn't make the top-2
            spotlight this week — lighter treatment (no chart), so a quiet
            week on your top lifts doesn't make the rest of your progress
            vanish from the report. */}
        {others.length > 0 && (
          <>
            <SectionLabel>Also tracking</SectionLabel>
            <div className="flex flex-col gap-2 mb-9">
              {others.map((o) => (
                <div key={o.name} className="border border-border rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{o.name}</p>
                    <p className="text-xs text-muted-foreground">Last logged {formatShortDate(o.lastLoggedDate)}</p>
                  </div>
                  <p className="text-sm font-bold font-mono text-foreground">
                    {o.currentBest} {o.unit}
                  </p>
                </div>
              ))}
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

        {/* Month strip */}
        {month && (
          <div className="flex justify-between gap-3 pt-5 border-t-2 border-border">
            <MonthStat value={month.sessions} label="Workouts this month" />
            <MonthStat value={month.newPRs} label="New PRs this month" />
            <MonthStat value={month.weekStreak} label="Week streak" />
          </div>
        )}

        {(heroes.length > 0 || others.length > 0) && (
          <p className="text-xs text-muted-foreground text-center mt-9">
            {usingFavorites
              ? "This report highlights your favorited exercises — pick or change them anytime on the PRs page."
              : "Showing popular lifts from your plan — want different ones? Star your favorites on the PRs page."}
          </p>
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
