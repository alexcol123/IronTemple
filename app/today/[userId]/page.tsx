"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BODY_PARTS } from "@/lib/data/singleBodyPart/body-parts";
import type { Exercise as LibraryExercise } from "@/lib/data/types";

type ExerciseStatus = "pending" | "done" | "skipped";
type SessionExercise = {
  id: string;
  name: string;
  type: string;
  targetSets: number;
  targetReps: number;
  status: ExerciseStatus;
  loggedSummary: string | null;
  recommendation: string | null;
};
type Session =
  | { allDone: true; totalDays: number }
  | { allDone: false; workoutDayId: string; dayName: string; nextDayNumber: number; totalDays: number; exercises: SessionExercise[] };

type SummaryLine = { text: string; isPR: boolean };
type Completion = { lines: SummaryLine[]; doneCount: number; totalSets: number; hasPR: boolean };

const PLACEHOLDER: Record<string, string> = {
  weighted: "e.g. 150x10 160x8",
  bodyweight: "e.g. 15 12 10",
  cardio: "e.g. 20 (minutes)",
};

// Picked straight from the same body-part library /build uses — the name,
// type, and target sets/reps are already known, so logging it works exactly
// like logging a planned exercise, just without a plannedExerciseId.
type AdHocPick = { name: string; type: string; targetSets: number; targetReps: number };

export default function TodayPage() {
  const { userId } = useParams<{ userId: string }>();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adHocPick, setAdHocPick] = useState<AdHocPick | null>(null);
  const [picking, setPicking] = useState(false);
  const [pickerBodyPart, setPickerBodyPart] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [completion, setCompletion] = useState<Completion | null>(null);

  const load = useCallback(() => {
    if (!userId) return;
    fetch(`/api/today/session?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((data) => setSession(data.session));
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  function openExercise(id: string) {
    setSelectedId(id);
    setAdHocPick(null);
    setInput("");
    setError("");
    setMessage("");
  }

  function backToList() {
    setSelectedId(null);
    setAdHocPick(null);
    setPicking(false);
    setPickerBodyPart(null);
    setPickerSearch("");
    setInput("");
    setError("");
    setMessage("");
  }

  function openPicker() {
    setPicking(true);
    setPickerBodyPart(BODY_PARTS[0]?.name ?? null);
    setPickerSearch("");
  }

  function closePicker() {
    setPicking(false);
    setPickerBodyPart(null);
    setPickerSearch("");
  }

  function pickAdHocExercise(ex: { name: string; type?: string; sets: number; reps: number }) {
    setPicking(false);
    setPickerSearch("");
    setAdHocPick({ name: ex.name, type: ex.type ?? "weighted", targetSets: ex.sets, targetReps: ex.reps });
    setInput("");
    setError("");
    setMessage("");
  }

  async function handleAction(action: "log" | "skip") {
    if (!session || session.allDone || (!selectedId && !adHocPick)) return;
    setError("");
    setSaving(true);
    const body = adHocPick
      ? {
          userId,
          workoutDayId: session.workoutDayId,
          adHocName: adHocPick.name,
          adHocType: adHocPick.type,
          adHocTargetReps: adHocPick.targetReps,
          action,
          input,
        }
      : { userId, workoutDayId: session.workoutDayId, plannedExerciseId: selectedId, action, input };
    const res = await fetch("/api/today/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    // Every exercise in today's day is accounted for — show the same
    // completion summary SMS would, instead of silently moving to the next
    // day's list (which would otherwise happen the moment this screen reloads).
    if (data.workoutComplete && data.summary) {
      setCompletion(data.summary);
      return;
    }
    setMessage(data.prMessage ?? "Logged!");
    load();
    setTimeout(() => backToList(), 900);
  }

  const plannedSelected =
    session && !session.allDone ? session.exercises.find((e) => e.id === selectedId) : undefined;
  const selected = plannedSelected ?? (adHocPick ? { ...adHocPick, status: "pending" as const, loggedSummary: null, recommendation: null } : undefined);

  const doneCount = session && !session.allDone ? session.exercises.filter((e) => e.status !== "pending").length : 0;
  const totalCount = session && !session.allDone ? session.exercises.length : 0;

  return (
    <div className="flex items-center justify-center h-screen bg-background overflow-hidden">
      <div className="flex flex-col w-full max-w-sm h-full sm:h-175 sm:border sm:rounded-3xl overflow-hidden sm:shadow-md">
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between">
          {!completion && (selected || picking) ? (
            <button onClick={picking ? closePicker : backToList} className="text-xs text-muted-foreground">← Back</button>
          ) : (
            <Link href={`/menu/${userId}`} className="text-xs text-muted-foreground">← Menu</Link>
          )}
          <p className="font-semibold text-sm">
            {completion ? "Workout Complete!" : picking ? "Add Exercise" : "Today's Workout"}
          </p>
          <div className="w-10" />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
          {completion && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col items-center text-center gap-1 py-2">
                <div
                  className={`h-14 w-14 rounded-full flex items-center justify-center text-2xl ${
                    completion.hasPR
                      ? "bg-amber-100 dark:bg-amber-950"
                      : "bg-emerald-100 dark:bg-emerald-950"
                  }`}
                >
                  {completion.hasPR ? "🏆" : "✓"}
                </div>
                <p className="text-base font-semibold">
                  {completion.hasPR ? "New PR! You're getting stronger." : "Workout complete!"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {completion.hasPR
                    ? "Check out what you crushed today."
                    : "Full session logged — that's how PRs get built."}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                {completion.lines.map((line, i) => (
                  <div
                    key={i}
                    className={`border rounded-2xl px-4 py-3 flex items-center justify-between gap-2 ${
                      line.isPR ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30" : ""
                    }`}
                  >
                    <p className="text-sm">{line.text}</p>
                    {line.isPR && (
                      <span className="text-xs font-medium text-amber-600 dark:text-amber-400 whitespace-nowrap">
                        New PR
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground text-center">
                {completion.doneCount} exercise{completion.doneCount !== 1 ? "s" : ""} · {completion.totalSets} total sets
              </p>

              <Link
                href={`/menu/${userId}`}
                className="text-sm text-center px-4 py-2 rounded-full border hover:bg-muted transition-colors"
              >
                Back to Menu
              </Link>
            </div>
          )}

          {!completion && session === undefined && <p className="text-sm text-muted-foreground text-center mt-8">Loading...</p>}

          {!completion && session === null && <p className="text-sm text-muted-foreground text-center mt-8">No active plan found.</p>}

          {!completion && session?.allDone && (
            <p className="text-sm text-muted-foreground text-center mt-8">
              You&apos;ve already hit all {session.totalDays} sessions this week — nice work! Text HERE for a bonus session.
            </p>
          )}

          {/* List view */}
          {!completion && !picking && session && !session.allDone && !selected && (
            <>
              <div>
                <p className="text-sm font-medium">
                  Day {session.nextDayNumber} of {session.totalDays} this week
                </p>
                <p className="text-xs text-muted-foreground">
                  {session.dayName} · {doneCount} of {totalCount} done
                </p>
              </div>

              <div className="flex flex-col gap-2">
                {session.exercises.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => openExercise(ex.id)}
                    className="border rounded-2xl px-4 py-3 flex items-center justify-between text-left hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{ex.name}</p>
                      {ex.loggedSummary && <p className="text-xs text-muted-foreground mt-0.5">{ex.loggedSummary}</p>}
                    </div>
                    <span className={`text-xs font-medium ${ex.status === "done" ? "text-foreground" : "text-muted-foreground"}`}>
                      {ex.status === "done" ? "✓ Done" : ex.status === "skipped" ? "Skipped" : "○ Pending"}
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={openPicker}
                className="text-sm px-3 py-2 rounded-xl border border-dashed text-muted-foreground hover:bg-muted transition-colors"
              >
                + Add Exercise
              </button>
            </>
          )}

          {/* Add-exercise picker: same body-part-tabbed library as /build */}
          {!completion && picking && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-1.5">
                {BODY_PARTS.map((bp) => (
                  <button
                    key={bp.name}
                    onClick={() => setPickerBodyPart(bp.name)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      pickerBodyPart === bp.name
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    {bp.name}
                  </button>
                ))}
              </div>

              <Input
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="Search exercises..."
                className="text-sm"
              />

              <div className="flex flex-col gap-2">
                {(BODY_PARTS.find((bp) => bp.name === pickerBodyPart)?.exercises as LibraryExercise[] | undefined)
                  ?.filter((ex) => ex.name.toLowerCase().includes(pickerSearch.toLowerCase()))
                  .map((ex) => (
                    <button
                      key={ex.name}
                      onClick={() => pickAdHocExercise(ex)}
                      className="border rounded-2xl px-4 py-3 flex items-center justify-between text-left hover:bg-muted transition-colors"
                    >
                      <p className="text-sm font-medium">{ex.name}</p>
                      <span className="text-xs text-muted-foreground">
                        {ex.sets} x {ex.reps} {ex.type === "cardio" ? "min" : ex.type === "bodyweight" ? "reps" : ""}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Detail view */}
          {!completion && !picking && selected && (
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-sm font-semibold">{selected.name}</p>
                <p className="text-xs text-muted-foreground">{selected.targetSets} sets</p>
              </div>

              {selected.recommendation && <p className="text-xs text-muted-foreground">{selected.recommendation}</p>}

              {selected.loggedSummary && (
                <p className="text-xs text-muted-foreground">Already logged: {selected.loggedSummary}</p>
              )}

              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={PLACEHOLDER[selected.type] ?? PLACEHOLDER.weighted}
                className="text-sm"
              />

              {error && <p className="text-xs text-destructive">{error}</p>}
              {message && <p className="text-xs text-muted-foreground">{message}</p>}

              <div className="flex gap-2">
                {selected.status === "pending" && !adHocPick && (
                  <Button
                    variant="outline"
                    onClick={() => handleAction("skip")}
                    disabled={saving}
                    className="flex-1 rounded-full"
                  >
                    Skip
                  </Button>
                )}
                <Button onClick={() => handleAction("log")} disabled={saving || !input.trim()} className="flex-1 rounded-full">
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
