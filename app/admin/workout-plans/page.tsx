"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type PlanExercise = { name: string; targetSets: number; targetReps: number; type: string };
type PlanDay = { day: number; name: string; muscles: string; exercises: PlanExercise[] };
type Tier = { tierLabel: string; tierDays: string; planId: string | null; planName: string | null; days: PlanDay[] };
type Goal = { goal: string; tiers: Tier[] };

// =============================================================================
// /admin/workout-plans — read-only view of the 12 real seeded plans (Beginner/
// Intermediate/Advanced x each goal), grouped by goal, so they can be reviewed
// before real SMS testing.
// =============================================================================

export default function AdminWorkoutPlansPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/admin/workout-plans")
      .then((r) => r.json())
      .then((data) => setGoals(data.goals ?? []));
  }, []);

  function toggle(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="min-h-screen bg-background p-6 max-w-2xl mx-auto">
      <Link href="/admin" className="text-xs text-muted-foreground">← Dev Reference</Link>
      <h1 className="text-2xl font-bold text-foreground mt-2">The 12 Workout Plans</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        Beginner / Intermediate / Advanced for each goal — exactly what onboarding assigns.
      </p>

      <div className="flex flex-col gap-6">
        {goals.map((g, gi) => (
          <div key={g.goal}>
            <p className="text-sm font-semibold text-foreground mb-2">
              {gi + 1}. {g.goal}
            </p>
            <div className="flex flex-col gap-2">
              {g.tiers.map((tier) => {
                const key = `${g.goal}-${tier.tierLabel}`;
                const isOpen = expanded[key];
                return (
                  <div key={key} className="border border-border rounded-xl p-3">
                    <button
                      onClick={() => toggle(key)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {tier.tierLabel} — {tier.tierDays}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {tier.planName ?? "Not seeded"} · {tier.days.length} day{tier.days.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{isOpen ? "▼" : "▶"}</span>
                    </button>

                    {isOpen && (
                      <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
                        {tier.days.length === 0 && (
                          <p className="text-xs text-muted-foreground">No plan seeded for this tier yet.</p>
                        )}
                        {tier.days.map((day) => (
                          <div key={day.day}>
                            <p className="text-xs font-semibold text-foreground">
                              Day {day.day}: {day.name}
                            </p>
                            <p className="text-xs text-muted-foreground mb-1">{day.muscles}</p>
                            <ul className="flex flex-col gap-0.5">
                              {day.exercises.map((ex, i) => (
                                <li key={i} className="text-xs text-muted-foreground">
                                  {ex.name} — {ex.targetSets}x{ex.targetReps}
                                  {ex.type !== "weighted" ? ` (${ex.type})` : ""}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
