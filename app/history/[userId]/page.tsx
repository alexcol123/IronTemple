"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ReadNav } from "@/components/read-nav";

type SetLog = { setNumber: number; weight: number; reps: number };
type ExerciseLog = {
  id: string;
  skipped: boolean;
  plannedExercise: { name: string };
  sets: SetLog[];
};
type Session = {
  id: string;
  date: string;
  workoutDay: { name: string; day: number; plan: { name: string } };
  exercises: ExerciseLog[];
};

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

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetch(`/api/sessions?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((data) => setSessions(data.sessions ?? []))
      .finally(() => setLoading(false));
  }, [userId]);

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
      <div className="flex items-center justify-center h-screen text-sm text-muted-foreground">
        Loading...
      </div>
    );

  return (
    <div className="flex items-center justify-center h-screen bg-background overflow-hidden">
      <div className="flex flex-col w-full max-w-sm h-full sm:h-175 sm:border sm:rounded-3xl overflow-hidden sm:shadow-md">
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-center">
          <p className="font-semibold text-sm">Workout History</p>
        </div>

        <ReadNav userId={userId} />

        {/* Week navigation */}
        <div className="px-4 py-2 border-b flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            disabled={!hasPrev}
            className="text-xs px-3 py-1 rounded-md border disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted transition-colors"
          >
            ← Back
          </button>
          <p className="text-xs font-medium">{weekLabel}</p>
          <button
            onClick={() => navigate(1)}
            disabled={!hasNext}
            className="text-xs px-3 py-1 rounded-md border disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted transition-colors"
          >
            Next →
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
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
              <div key={session.id} className="border rounded-2xl overflow-hidden">
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
                  <div className="border-t px-4 py-3 flex flex-col gap-3">
                    {session.exercises.map((ex) => (
                      <div key={ex.id}>
                        <p className="text-xs font-semibold">
                          {ex.plannedExercise.name}
                          {ex.skipped && (
                            <span className="ml-2 text-muted-foreground font-normal">
                              skipped
                            </span>
                          )}
                        </p>
                        {!ex.skipped && ex.sets.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {ex.sets.map((s) => `${s.weight}x${s.reps}`).join("  ")}
                          </p>
                        )}
                      </div>
                    ))}
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
