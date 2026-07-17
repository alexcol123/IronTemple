"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type ExerciseStatus = "pending" | "done" | "skipped";
// gifUrl/instructions/videoUrls/imageUrls now come straight from the database
// (ExerciseLibrary, joined via PlannedExercise.libraryExerciseId) instead of a
// client-side match against a static file.
type SessionExercise = {
  id: string;
  name: string;
  type: string;
  targetSets: number;
  targetReps: number;
  status: ExerciseStatus;
  loggedSummary: string | null;
  loggedSets: { weight: number; reps: number }[];
  recommendation: string | null;
  gifUrl?: string | null;
  instructions?: string[];
  videoUrls?: string[];
  imageUrls?: string[];
};
type Session =
  | { allDone: true; totalDays: number; bonusOptions: { workoutDayId: string; name: string }[] }
  | {
      allDone: false;
      sessionId: string | null;
      isBonus: boolean;
      workoutDayId: string;
      dayName: string;
      nextDayNumber: number;
      totalDays: number;
      exercises: SessionExercise[];
    };

// The real exercise picker library, fetched from the database instead of the
// old static body-parts.ts file.
type LibraryExercise = {
  id: string;
  name: string;
  displayName?: string | null;
  sets: number;
  reps: number;
  type?: string;
  gifUrl?: string | null;
  instructions?: string[];
  videoUrls?: string[];
  imageUrls?: string[];
  featured: boolean;
};
type LibraryBodyPart = { name: string; exercises: LibraryExercise[] };

type SummaryLine = { text: string; isPR: boolean };
type Completion = { lines: SummaryLine[]; doneCount: number; totalSets: number; hasPR: boolean };

const CARDIO_PLACEHOLDER = "e.g. 20 (minutes)";

type SetRow = { weight: string; reps: string };
function makeSetRows(count: number): SetRow[] {
  return Array.from({ length: Math.max(count, 1) }, () => ({ weight: "", reps: "" }));
}

// Picked straight from the same body-part library /build uses — the name,
// type, and target sets/reps are already known, so logging it works exactly
// like logging a planned exercise, just without a plannedExerciseId. Carries
// its own gif/instructions/videos along since there's no plannedExerciseId to
// join through until it's actually logged.
type AdHocPick = {
  name: string;
  type: string;
  targetSets: number;
  targetReps: number;
  gifUrl?: string | null;
  instructions?: string[];
  videoUrls?: string[];
  imageUrls?: string[];
};

// Turns a normal youtube.com/watch or youtu.be link (whatever gets pasted in
// when adding an exercise) into the /embed/ form needed for an inline iframe,
// so a real tutorial plays right in the how-to panel instead of sending
// someone to youtube.com and away from the app.
function getYouTubeEmbedUrl(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

// Shared "are you sure" block for ending a session before every exercise is
// logged — reused on both the resume-prompt screen and the active exercise
// list, since either place is a reasonable moment to decide to bail early.
function FinishConfirm({
  remaining,
  saving,
  onCancel,
  onConfirm,
}: {
  remaining: number;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="border border-border rounded-xl p-4 flex flex-col gap-3">
      <p className="text-sm">
        Finish this workout as-is?
        {remaining > 0 && ` The ${remaining} remaining exercise${remaining === 1 ? "" : "s"} will be marked skipped.`}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} className="flex-1 h-11 rounded-full">
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={saving} className="flex-1 h-11 rounded-full bg-amber-500 hover:bg-amber-600 text-white">
          {saving ? "Finishing..." : "Yes, finish"}
        </Button>
      </div>
    </div>
  );
}

export default function TodayPage() {
  const { userId } = useParams<{ userId: string }>();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adHocPick, setAdHocPick] = useState<AdHocPick | null>(null);
  const [picking, setPicking] = useState(false);
  const [pickerBodyPart, setPickerBodyPart] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  // Same reasoning as /build: most body parts have 100+ exercises after the
  // bulk import, so show only the hand-curated "featured" ones until asked
  // to see everything. Search bypasses this — it should never be limited by
  // curation, someone typing a specific name wants to find it regardless.
  const [pickerExpanded, setPickerExpanded] = useState(false);
  const [input, setInput] = useState("");
  // One row per set (weight + reps) for weighted/bodyweight exercises — mirrors
  // the same per-set editing UI already used on /history, instead of a single
  // free-text field requiring "150x10 160x8" shorthand. Cardio stays a single
  // minutes field via `input` since there's only ever one number to log.
  const [setRows, setSetRows] = useState<SetRow[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [showHowTo, setShowHowTo] = useState(false);
  const [libraryBodyParts, setLibraryBodyParts] = useState<LibraryBodyPart[]>([]);
  // The backend now resolves "which session is open" unambiguously via
  // finishedAt — no need to track a session id here just to keep the right
  // one loading. This only tracks whether the CURRENT open session has
  // already been explicitly resumed this page visit, so returning to a
  // fresh/never-touched day never shows a pointless "Continue?" prompt, and
  // re-arriving at a genuinely different (new) session always asks again.
  const [confirmedSessionId, setConfirmedSessionId] = useState<string | null>(null);
  const [confirmingFinish, setConfirmingFinish] = useState(false);

  const load = useCallback(() => {
    if (!userId) return;
    fetch(`/api/today/session?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((data) => setSession(data.session));
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  async function startBonus(workoutDayId: string) {
    const res = await fetch("/api/today/bonus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, workoutDayId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    // Just explicitly chose this — skip the "Continue?" prompt for it.
    setConfirmedSessionId(data.sessionId);
    load();
  }

  async function finishWorkout() {
    if (!session || session.allDone || !session.sessionId) return;
    setSaving(true);
    const res = await fetch("/api/today/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, sessionId: session.sessionId }),
    });
    const data = await res.json();
    setSaving(false);
    setConfirmingFinish(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    if (data.summary) setCompletion(data.summary);
  }

  useEffect(() => {
    fetch("/api/exercise-library")
      .then((r) => r.json())
      .then((data) => setLibraryBodyParts(data.bodyParts ?? []));
  }, []);

  function openExercise(id: string) {
    setSelectedId(id);
    setAdHocPick(null);
    // Start with just one set row — a set gets logged after it's actually
    // done, so pre-filling every planned set's slot upfront would show blanks
    // for sets that haven't happened yet. "+ Add set" reveals the next one
    // when they're ready for it.
    setSetRows(makeSetRows(1));
    setInput("");
    setError("");
    setMessage("");
    setShowHowTo(false);
    setConfirmingFinish(false);
  }

  function backToList() {
    setSelectedId(null);
    setAdHocPick(null);
    setPicking(false);
    setPickerBodyPart(null);
    setPickerSearch("");
    setSetRows([]);
    setInput("");
    setError("");
    setMessage("");
    setShowHowTo(false);
    setConfirmingFinish(false);
  }

  function openPicker() {
    setPicking(true);
    setPickerBodyPart(libraryBodyParts[0]?.name ?? null);
    setPickerSearch("");
    setPickerExpanded(false);
  }

  function closePicker() {
    setPicking(false);
    setPickerBodyPart(null);
    setPickerSearch("");
    setPickerExpanded(false);
  }

  // Non-featured exercises come back from the list endpoint without their
  // gif/instructions/videos/images (kept out to keep that payload small) —
  // fetch the real content here, only for the one exercise actually picked.
  async function pickAdHocExercise(ex: LibraryExercise) {
    setPicking(false);
    setPickerSearch("");
    setPickerExpanded(false);
    const full = ex.featured ? ex : await fetch(`/api/exercise-library/${ex.id}`).then((r) => r.json());
    setAdHocPick({
      name: ex.displayName || ex.name,
      type: ex.type ?? "weighted",
      targetSets: ex.sets,
      targetReps: ex.reps,
      gifUrl: full.gifUrl,
      instructions: full.instructions,
      videoUrls: full.videoUrls,
      imageUrls: full.imageUrls,
    });
    setSetRows(makeSetRows(1));
    setInput("");
    setError("");
    setMessage("");
    setShowHowTo(false);
  }

  // Weighted rows need both fields filled to count; bodyweight only needs
  // reps (no weight to log). Empty rows are just dropped — someone doing
  // fewer sets than planned shouldn't have to delete rows first.
  function serializeRows(type: string): string {
    if (type === "bodyweight") {
      return setRows.map((r) => r.reps.trim()).filter(Boolean).join(" ");
    }
    return setRows
      .filter((r) => r.weight.trim() !== "" && r.reps.trim() !== "")
      .map((r) => `${r.weight.trim()}x${r.reps.trim()}`)
      .join(" ");
  }

  async function handleAction(action: "log" | "skip") {
    if (!session || session.allDone || (!selectedId && !adHocPick)) return;
    setError("");
    setSaving(true);
    const sessionIdField = session.sessionId ? { sessionId: session.sessionId } : {};
    const type = selected?.type ?? "weighted";
    const effectiveInput = type === "cardio" ? input : serializeRows(type);
    const body = adHocPick
      ? {
          userId,
          workoutDayId: session.workoutDayId,
          ...sessionIdField,
          adHocName: adHocPick.name,
          adHocType: adHocPick.type,
          adHocTargetReps: adHocPick.targetReps,
          action,
          input: effectiveInput,
        }
      : { userId, workoutDayId: session.workoutDayId, ...sessionIdField, plannedExerciseId: selectedId, action, input: effectiveInput };
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
  const selected =
    plannedSelected ??
    (adHocPick ? { ...adHocPick, status: "pending" as const, loggedSummary: null, loggedSets: [], recommendation: null } : undefined);

  const canSave = selected?.type === "cardio" ? input.trim().length > 0 : serializeRows(selected?.type ?? "weighted").length > 0;

  function updateRow(index: number, field: "weight" | "reps", value: string) {
    setSetRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }
  function addRow() {
    setSetRows((prev) => [...prev, { weight: "", reps: "" }]);
  }
  function removeRow(index: number) {
    setSetRows((prev) => prev.filter((_, i) => i !== index));
  }

  // Same how-to panel as before selection was ever a picker-level thing —
  // just the post-selection "How do I do this?" target.
  const howToTarget = showHowTo && selected ? selected : null;
  function closeHowTo() {
    setShowHowTo(false);
  }

  const doneCount = session && !session.allDone ? session.exercises.filter((e) => e.status !== "pending").length : 0;
  const totalCount = session && !session.allDone ? session.exercises.length : 0;
  // Only prompt to resume if there's real evidence this session was already
  // started (something logged/skipped) — a pristine, never-touched day just
  // goes straight to the list, nothing to "continue" yet.
  const needsResume =
    !!session && !session.allDone && !!session.sessionId && doneCount > 0 && confirmedSessionId !== session.sessionId;

  const pickerSearchTerm = pickerSearch.toLowerCase();
  const pickerIsSearching = pickerSearchTerm.length > 0;
  const pickerMatchingSearch = (libraryBodyParts.find((bp) => bp.name === pickerBodyPart)?.exercises ?? []).filter(
    (ex) =>
      ex.name.toLowerCase().includes(pickerSearchTerm) ||
      (ex.displayName ?? "").toLowerCase().includes(pickerSearchTerm),
  );
  const pickerShowAll = pickerExpanded || pickerIsSearching;
  const pickerDisplayed = pickerShowAll ? pickerMatchingSearch : pickerMatchingSearch.filter((ex) => ex.featured);
  const pickerHiddenCount = pickerMatchingSearch.length - pickerDisplayed.length;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-6 pb-16">
        {/* Back/close row */}
        <div className="flex items-center justify-between mb-3">
          {howToTarget ? (
            <div />
          ) : !completion && (selected || picking) ? (
            <button onClick={picking ? closePicker : backToList} className="text-xs text-muted-foreground hover:text-foreground">← Back</button>
          ) : (
            <Link href={`/menu/${userId}`} className="text-xs text-muted-foreground hover:text-foreground">← Menu</Link>
          )}
          {howToTarget && (
            <button onClick={closeHowTo} className="text-sm text-muted-foreground hover:text-foreground">✕</button>
          )}
        </div>

        {/* Nameplate */}
        <div className="flex items-baseline justify-between pb-4 mb-6 border-b-2 border-border">
          <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">Iron Temple</p>
          <p className="text-xs text-muted-foreground">
            {completion ? "Workout Complete!" : howToTarget ? "How To" : picking ? "Add Exercise" : "Today's Workout"}
          </p>
        </div>

        <div className="flex flex-col gap-4">
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
                className="text-sm text-center px-4 py-2 rounded-full border border-border hover:bg-muted transition-colors"
              >
                Back to Menu
              </Link>
            </div>
          )}

          {!completion && session === undefined && <p className="text-sm text-muted-foreground text-center mt-8">Loading...</p>}

          {!completion && session === null && <p className="text-sm text-muted-foreground text-center mt-8">No active plan found.</p>}

          {!completion && session?.allDone && (
            <div className="flex flex-col gap-3 mt-4">
              <p className="text-sm text-muted-foreground text-center">
                You&apos;ve already hit all {session.totalDays} sessions this week — nice work!
              </p>
              {session.bonusOptions.length > 0 && (
                <>
                  <p className="text-xs text-muted-foreground text-center">Want a bonus session anyway?</p>
                  <div className="flex flex-col gap-2">
                    {session.bonusOptions.map((opt) => (
                      <button
                        key={opt.workoutDayId}
                        onClick={() => startBonus(opt.workoutDayId)}
                        className="border border-border rounded-xl px-4 py-3 text-sm font-medium hover:bg-muted transition-colors"
                      >
                        {opt.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Resume prompt — shown instead of the list whenever a session
              already has real progress on it, so coming back (same day or
              days later) always leads with "continue this," never a picker
              or a silent jump back into the exercise list. */}
          {!completion && !picking && needsResume && session && !session.allDone && !selected && (
            <div className="flex flex-col gap-3">
              <div className="border border-amber-400 bg-amber-50 dark:bg-amber-950/20 rounded-xl p-5 text-center">
                <p className="text-xs font-bold tracking-widest uppercase text-amber-600 dark:text-amber-500 mb-1">
                  {session.isBonus ? "Bonus session" : "In progress"}
                </p>
                <p className="text-base font-semibold">{session.dayName}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {doneCount} of {totalCount} done
                </p>
              </div>

              <Button
                onClick={() => setConfirmedSessionId(session.sessionId)}
                className="w-full h-12 text-base rounded-full bg-amber-500 hover:bg-amber-600 text-white"
              >
                Continue
              </Button>

              {!confirmingFinish ? (
                <button
                  onClick={() => setConfirmingFinish(true)}
                  className="text-sm text-muted-foreground hover:text-foreground underline text-center"
                >
                  Finish workout instead
                </button>
              ) : (
                <FinishConfirm
                  remaining={totalCount - doneCount}
                  saving={saving}
                  onCancel={() => setConfirmingFinish(false)}
                  onConfirm={finishWorkout}
                />
              )}
            </div>
          )}

          {/* List view */}
          {!completion && !picking && !needsResume && session && !session.allDone && !selected && (
            <>
              <div>
                <p className="text-sm font-medium">
                  {session.isBonus ? "Bonus session" : `Day ${session.nextDayNumber} of ${session.totalDays} this week`}
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
                    className="border border-border rounded-xl px-4 py-3 flex items-center justify-between text-left hover:bg-muted transition-colors"
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

              {doneCount > 0 &&
                doneCount < totalCount &&
                (!confirmingFinish ? (
                  <button
                    onClick={() => setConfirmingFinish(true)}
                    className="text-xs text-muted-foreground hover:text-foreground underline self-start"
                  >
                    Finish workout early
                  </button>
                ) : (
                  <FinishConfirm
                    remaining={totalCount - doneCount}
                    saving={saving}
                    onCancel={() => setConfirmingFinish(false)}
                    onConfirm={finishWorkout}
                  />
                ))}
            </>
          )}

          {/* Add-exercise picker: same body-part-tabbed library as /build,
              now sourced from the database instead of a static file */}
          {!completion && picking && !howToTarget && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-1.5">
                {libraryBodyParts.map((bp) => (
                  <button
                    key={bp.name}
                    onClick={() => setPickerBodyPart(bp.name)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      pickerBodyPart === bp.name
                        ? "bg-amber-500 text-white border-amber-500"
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
                {pickerDisplayed.map((ex) => (
                  <button
                    key={ex.name}
                    onClick={() => pickAdHocExercise(ex)}
                    className="border border-border rounded-xl px-4 py-3 flex items-center justify-between text-left hover:bg-muted transition-colors"
                  >
                    <p className="text-sm font-medium">{ex.displayName || ex.name}</p>
                    <span className="text-xs text-muted-foreground">
                      {ex.sets} x {ex.reps} {ex.type === "cardio" ? "min" : ex.type === "bodyweight" ? "reps" : ""}
                    </span>
                  </button>
                ))}
              </div>

              {!pickerShowAll && pickerHiddenCount > 0 && (
                <button
                  onClick={() => setPickerExpanded(true)}
                  className="text-xs text-muted-foreground underline"
                >
                  See all {pickerMatchingSearch.length} →
                </button>
              )}
              {pickerExpanded && !pickerIsSearching && (
                <button
                  onClick={() => setPickerExpanded(false)}
                  className="text-xs text-muted-foreground underline"
                >
                  Show featured only
                </button>
              )}
            </div>
          )}

          {/* How-to takeover: same panel whether triggered by previewing an
              exercise straight from the picker (before selecting anything) or
              the post-selection "How do I do this?" — replaces the whole
              view either way, closed via X or the button below. Falls back
              to the static image when an exercise has no gif yet. */}
          {!completion && howToTarget && (howToTarget.gifUrl || howToTarget.imageUrls?.[0]) && (
            <div className="flex flex-col gap-3">
              <div className="border border-border rounded-xl overflow-hidden">
                <img
                  src={howToTarget.gifUrl ?? howToTarget.imageUrls?.[0]}
                  alt={howToTarget.name}
                  className="w-full bg-black"
                />
                {howToTarget.instructions && howToTarget.instructions.length > 0 && (
                  <ol className="px-4 py-3 flex flex-col gap-1.5 list-decimal list-inside">
                    {howToTarget.instructions.map((step, i) => (
                      <li key={i} className="text-xs text-muted-foreground">{step}</li>
                    ))}
                  </ol>
                )}
              </div>

              {howToTarget.videoUrls?.map((url, i) => {
                const embedUrl = getYouTubeEmbedUrl(url);
                return embedUrl ? (
                  <div key={i} className="rounded-xl overflow-hidden aspect-video">
                    <iframe
                      src={embedUrl}
                      title={`${howToTarget.name} video tutorial ${i + 1}`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-center px-4 py-2 rounded-full border border-border hover:bg-muted transition-colors"
                  >
                    Watch video {i + 1}
                  </a>
                );
              })}

              <button
                onClick={closeHowTo}
                className="text-sm text-center px-4 py-2 rounded-full border border-border hover:bg-muted transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {/* Detail view */}
          {!completion && !picking && selected && !howToTarget && (
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-base font-semibold">{selected.name}</p>
                <p className="text-sm text-muted-foreground">Aiming for {selected.targetSets} sets</p>
              </div>

              {selected.recommendation && <p className="text-sm text-muted-foreground">{selected.recommendation}</p>}

              {(selected.gifUrl || selected.imageUrls?.[0]) && (
                <button
                  onClick={() => setShowHowTo(true)}
                  className="text-sm font-medium text-muted-foreground underline text-left py-1"
                >
                  How do I do this?
                </button>
              )}

              {selected.type === "cardio" ? (
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={CARDIO_PLACEHOLDER}
                  className="text-sm"
                />
              ) : (
                <div className="flex flex-col gap-2.5">
                  {/* Already-logged sets — read-only, so reopening an exercise
                      shows what's actually saved instead of a blank slate.
                      New rows below get appended on top of these, matching
                      how the backend already accumulates sets onto the same
                      log rather than replacing them. */}
                  {selected.loggedSets.map((s, i) => (
                    <div key={`logged-${i}`} className="flex items-center gap-2 opacity-60">
                      <span className="text-xs font-semibold text-muted-foreground w-4 text-center">{i + 1}</span>
                      {selected.type !== "bodyweight" && (
                        <>
                          <div className="w-20 text-lg font-medium text-center border border-border rounded-xl px-2 py-3">
                            {s.weight}
                          </div>
                          <span className="text-sm text-muted-foreground">lbs ×</span>
                        </>
                      )}
                      <div className="w-20 text-lg font-medium text-center border border-border rounded-xl px-2 py-3">
                        {s.reps}
                      </div>
                      <span className="text-sm text-muted-foreground">reps</span>
                      <span className="ml-auto text-xs text-muted-foreground">saved</span>
                    </div>
                  ))}
                  {setRows.map((row, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground w-4 text-center">
                        {selected.loggedSets.length + i + 1}
                      </span>
                      {selected.type !== "bodyweight" && (
                        <>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={row.weight}
                            onChange={(e) => updateRow(i, "weight", e.target.value)}
                            placeholder="0"
                            className="w-20 text-lg font-medium text-center border border-border rounded-xl px-2 py-3 bg-background"
                          />
                          <span className="text-sm text-muted-foreground">lbs ×</span>
                        </>
                      )}
                      <input
                        type="number"
                        inputMode="numeric"
                        value={row.reps}
                        onChange={(e) => updateRow(i, "reps", e.target.value)}
                        placeholder="0"
                        className="w-20 text-lg font-medium text-center border border-border rounded-xl px-2 py-3 bg-background"
                      />
                      <span className="text-sm text-muted-foreground">reps</span>
                      {setRows.length > 1 && (
                        <button
                          onClick={() => removeRow(i)}
                          className="ml-auto text-muted-foreground hover:text-foreground text-lg px-2 py-2"
                          aria-label="Remove set"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addRow}
                    className="text-sm font-medium px-3 py-2.5 rounded-xl border border-dashed border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    + Add set
                  </button>
                </div>
              )}

              {error && <p className="text-xs text-destructive">{error}</p>}
              {message && <p className="text-xs text-muted-foreground">{message}</p>}

              <div className="flex gap-2 mt-1">
                {selected.status === "pending" && !adHocPick && (
                  <Button
                    variant="outline"
                    onClick={() => handleAction("skip")}
                    disabled={saving}
                    className="flex-1 h-12 text-base rounded-full"
                  >
                    Skip
                  </Button>
                )}
                <Button
                  onClick={() => handleAction("log")}
                  disabled={saving || !canSave}
                  className="flex-1 h-12 text-base rounded-full bg-amber-500 hover:bg-amber-600 text-white"
                >
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
