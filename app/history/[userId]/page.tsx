"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ReadNav } from "@/components/read-nav";

type SetLog = { id: string; setNumber: number; weight: number; reps: number };
type ExerciseLog = {
  id: string;
  skipped: boolean;
  // null for ad-hoc (ADD) entries logged mid-workout — customName holds the
  // name instead, since there's no PlannedExercise row for those.
  plannedExercise: { name: string } | null;
  customName: string | null;
  sets: SetLog[];
};
type Session = {
  id: string;
  date: string;
  workoutDay: { name: string; day: number; plan: { name: string } };
  exercises: ExerciseLog[];
};

// Mirrors the /api/today/session response the today page consumes — just
// enough here to drive a "Start/Continue Workout" card, not the full detail view.
type TodaySession =
  | { allDone: true; totalDays: number }
  | { allDone: false; dayName: string; nextDayNumber: number; totalDays: number; exercises: { status: "pending" | "done" | "skipped" }[] };

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function HistoryByIdPage() {
  const { userId } = useParams<{ userId: string }>();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = last week, etc.
  const [todaySession, setTodaySession] = useState<TodaySession | null | undefined>(undefined);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [draftSets, setDraftSets] = useState<Record<string, { weight: string; reps: string }>>({});
  const [saving, setSaving] = useState(false);

  function loadSessions() {
    if (!userId) { setLoading(false); return; }
    fetch(`/api/sessions?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((data) => setSessions(data.sessions ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(loadSessions, [userId]);

  function startEditing(ex: ExerciseLog) {
    setEditingExerciseId(ex.id);
    const drafts: Record<string, { weight: string; reps: string }> = {};
    for (const s of ex.sets) drafts[s.id] = { weight: String(s.weight), reps: String(s.reps) };
    setDraftSets(drafts);
  }

  async function saveEditing(ex: ExerciseLog) {
    setSaving(true);
    await Promise.all(
      ex.sets.map((s) => {
        const draft = draftSets[s.id];
        if (!draft) return null;
        const weight = Number(draft.weight);
        const reps = Number(draft.reps);
        if (weight === s.weight && reps === s.reps) return null;
        return fetch(`/api/sets/${s.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weight, reps, userId }),
        });
      }),
    );
    setSaving(false);
    setEditingExerciseId(null);
    loadSessions();
  }

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/today/session?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((data) => setTodaySession(data.session));
  }, [userId]);

  const doneCount = todaySession && !todaySession.allDone ? todaySession.exercises.filter((e) => e.status !== "pending").length : 0;
  const totalCount = todaySession && !todaySession.allDone ? todaySession.exercises.length : 0;

  // Compute the Mon–Sun window for the current offset
  const thisMonday = getMondayOf(new Date());
  const weekStart = new Date(thisMonday);
  weekStart.setDate(thisMonday.getDate() + weekOffset * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const weekSessions = sessions.filter((s) => {
    const d = new Date(s.date);
    return d >= weekStart && d <= weekEnd;
  });

  const hasPrev = sessions.some((s) => new Date(s.date) < weekStart);
  const hasNext = weekOffset < 0;

  function navigate(dir: -1 | 1) {
    setWeekOffset((o) => o + dir);
    setExpanded(null);
  }

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const weekLabel =
    weekOffset === 0
      ? "This Week"
      : weekOffset === -1
      ? "Last Week"
      : `${fmt(weekStart)} – ${fmt(weekEnd)}`;

  if (loading)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      <ReadNav userId={userId} />
      <div className="max-w-lg mx-auto p-6 pb-16">
        {/* Nameplate */}
        <div className="flex items-baseline justify-between pb-4 mb-6 border-b-2 border-border">
          <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">Iron Temple</p>
          <p className="text-xs text-muted-foreground">History</p>
        </div>

        {/* Today's workout CTA */}
        {todaySession && !todaySession.allDone && (
          <Link
            href={`/today/${userId}`}
            className="mb-6 rounded-xl border border-border px-4 py-3 flex items-center justify-between hover:bg-muted transition-colors"
          >
            <div>
              <p className="text-sm font-semibold">{doneCount === 0 ? "Start Workout" : "Continue Workout"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Day {todaySession.nextDayNumber}: {todaySession.dayName}
                {doneCount > 0 && ` · ${doneCount} of ${totalCount} done`}
              </p>
            </div>
            <span className="text-amber-500">→</span>
          </Link>
        )}
        {todaySession && todaySession.allDone && (
          <Link
            href={`/today/${userId}`}
            className="mb-6 rounded-xl border border-border px-4 py-3 flex items-center justify-between hover:bg-muted transition-colors"
          >
            <div>
              <p className="text-sm font-semibold">All {todaySession.totalDays} sessions complete this week</p>
              <p className="text-xs text-muted-foreground mt-0.5">Nice work! Want to add a bonus session?</p>
            </div>
            <span className="text-amber-500">→</span>
          </Link>
        )}

        {/* Week navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate(-1)}
            disabled={!hasPrev}
            className="text-xs px-3 py-1 rounded-md border border-border disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted transition-colors"
          >
            ← Back
          </button>
          <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">{weekLabel}</p>
          <button
            onClick={() => navigate(1)}
            disabled={!hasNext}
            className="text-xs px-3 py-1 rounded-md border border-border disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted transition-colors"
          >
            Next →
          </button>
        </div>

        {/* Session list */}
        <div className="flex flex-col gap-3">
          {weekSessions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center mt-8">
              No workouts this week.
            </p>
          )}
          {weekSessions.map((session) => {
            const isOpen = expanded === session.id;
            const done = session.exercises.filter((e) => !e.skipped).length;
            const skipped = session.exercises.filter((e) => e.skipped).length;
            const date = new Date(session.date).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            });

            return (
              <div key={session.id} className="border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : session.id)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left"
                >
                  <div>
                    <p className="text-sm font-medium">{session.workoutDay.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.workoutDay.plan.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {done} done{skipped > 0 ? `, ${skipped} skipped` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isOpen ? "▲" : "▼"}
                    </p>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-border px-4 py-3 flex flex-col gap-3">
                    {session.exercises.map((ex) => {
                      const isEditing = editingExerciseId === ex.id;
                      return (
                        <div key={ex.id}>
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold">
                              {ex.plannedExercise?.name ?? ex.customName}
                              {ex.skipped && (
                                <span className="ml-2 text-muted-foreground font-normal">
                                  skipped
                                </span>
                              )}
                            </p>
                            {!ex.skipped && ex.sets.length > 0 && !isEditing && (
                              <button
                                onClick={() => startEditing(ex)}
                                className="text-xs text-muted-foreground hover:text-foreground underline py-1 px-1"
                              >
                                Edit
                              </button>
                            )}
                          </div>

                          {!ex.skipped && ex.sets.length > 0 && !isEditing && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {ex.sets.map((s) => `${s.weight}x${s.reps}`).join("  ")}
                            </p>
                          )}

                          {isEditing && (
                            <div className="mt-2 flex flex-col gap-2.5">
                              {ex.sets.map((s) => (
                                <div key={s.id} className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    value={draftSets[s.id]?.weight ?? ""}
                                    onChange={(e) =>
                                      setDraftSets((prev) => ({
                                        ...prev,
                                        [s.id]: { ...prev[s.id], weight: e.target.value },
                                      }))
                                    }
                                    className="w-20 text-lg font-medium text-center border border-border rounded-xl px-2 py-3 bg-background"
                                  />
                                  <span className="text-sm text-muted-foreground">lbs ×</span>
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    value={draftSets[s.id]?.reps ?? ""}
                                    onChange={(e) =>
                                      setDraftSets((prev) => ({
                                        ...prev,
                                        [s.id]: { ...prev[s.id], reps: e.target.value },
                                      }))
                                    }
                                    className="w-20 text-lg font-medium text-center border border-border rounded-xl px-2 py-3 bg-background"
                                  />
                                  <span className="text-sm text-muted-foreground">reps</span>
                                </div>
                              ))}
                              <div className="flex gap-2 mt-1">
                                <button
                                  onClick={() => saveEditing(ex)}
                                  disabled={saving}
                                  className="text-sm font-medium px-4 py-2.5 rounded-xl bg-amber-500 text-white disabled:opacity-50"
                                >
                                  {saving ? "Saving..." : "Save"}
                                </button>
                                <button
                                  onClick={() => setEditingExerciseId(null)}
                                  disabled={saving}
                                  className="text-sm px-4 py-2.5 rounded-xl border border-border disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
