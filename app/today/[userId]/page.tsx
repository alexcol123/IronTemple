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
  recommendation: string | null;
  gifUrl?: string | null;
  instructions?: string[];
  videoUrls?: string[];
  imageUrls?: string[];
};
type Session =
  | { allDone: true; totalDays: number }
  | { allDone: false; workoutDayId: string; dayName: string; nextDayNumber: number; totalDays: number; exercises: SessionExercise[] };

// The real exercise picker library, fetched from the database instead of the
// old static body-parts.ts file.
type LibraryExercise = {
  name: string;
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

const PLACEHOLDER: Record<string, string> = {
  weighted: "e.g. 150x10 160x8",
  bodyweight: "e.g. 15 12 10",
  cardio: "e.g. 20 (minutes)",
};

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
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [showHowTo, setShowHowTo] = useState(false);
  const [libraryBodyParts, setLibraryBodyParts] = useState<LibraryBodyPart[]>([]);

  const load = useCallback(() => {
    if (!userId) return;
    fetch(`/api/today/session?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((data) => setSession(data.session));
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/exercise-library")
      .then((r) => r.json())
      .then((data) => setLibraryBodyParts(data.bodyParts ?? []));
  }, []);

  function openExercise(id: string) {
    setSelectedId(id);
    setAdHocPick(null);
    setInput("");
    setError("");
    setMessage("");
    setShowHowTo(false);
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
    setShowHowTo(false);
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

  function pickAdHocExercise(ex: LibraryExercise) {
    setPicking(false);
    setPickerSearch("");
    setPickerExpanded(false);
    setAdHocPick({
      name: ex.name,
      type: ex.type ?? "weighted",
      targetSets: ex.sets,
      targetReps: ex.reps,
      gifUrl: ex.gifUrl,
      instructions: ex.instructions,
      videoUrls: ex.videoUrls,
      imageUrls: ex.imageUrls,
    });
    setInput("");
    setError("");
    setMessage("");
    setShowHowTo(false);
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

  // Same how-to panel as before selection was ever a picker-level thing —
  // just the post-selection "How do I do this?" target.
  const howToTarget = showHowTo && selected ? selected : null;
  function closeHowTo() {
    setShowHowTo(false);
  }

  const doneCount = session && !session.allDone ? session.exercises.filter((e) => e.status !== "pending").length : 0;
  const totalCount = session && !session.allDone ? session.exercises.length : 0;

  const pickerSearchTerm = pickerSearch.toLowerCase();
  const pickerIsSearching = pickerSearchTerm.length > 0;
  const pickerMatchingSearch = (libraryBodyParts.find((bp) => bp.name === pickerBodyPart)?.exercises ?? []).filter((ex) =>
    ex.name.toLowerCase().includes(pickerSearchTerm),
  );
  const pickerShowAll = pickerExpanded || pickerIsSearching;
  const pickerDisplayed = pickerShowAll ? pickerMatchingSearch : pickerMatchingSearch.filter((ex) => ex.featured);
  const pickerHiddenCount = pickerMatchingSearch.length - pickerDisplayed.length;

  return (
    <div className="flex items-center justify-center h-screen bg-background overflow-hidden">
      <div className="flex flex-col w-full max-w-sm h-full sm:h-175 sm:border sm:rounded-3xl overflow-hidden sm:shadow-md">
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between">
          {howToTarget ? (
            <div className="w-10" />
          ) : !completion && (selected || picking) ? (
            <button onClick={picking ? closePicker : backToList} className="text-xs text-muted-foreground">← Back</button>
          ) : (
            <Link href={`/menu/${userId}`} className="text-xs text-muted-foreground">← Menu</Link>
          )}
          <p className="font-semibold text-sm">
            {completion ? "Workout Complete!" : howToTarget ? "How To" : picking ? "Add Exercise" : "Today's Workout"}
          </p>
          {howToTarget ? (
            <button onClick={closeHowTo} className="w-10 text-right text-sm text-muted-foreground">✕</button>
          ) : (
            <div className="w-10" />
          )}
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
                {pickerDisplayed.map((ex) => (
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
              <div className="border rounded-2xl overflow-hidden">
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

              {howToTarget.videoUrls?.[0] && getYouTubeEmbedUrl(howToTarget.videoUrls[0]) && (
                <div className="rounded-2xl overflow-hidden aspect-video">
                  <iframe
                    src={getYouTubeEmbedUrl(howToTarget.videoUrls[0])!}
                    title={`${howToTarget.name} video tutorial`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}

              <button
                onClick={closeHowTo}
                className="text-sm text-center px-4 py-2 rounded-full border hover:bg-muted transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {/* Detail view */}
          {!completion && !picking && selected && !howToTarget && (
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-sm font-semibold">{selected.name}</p>
                <p className="text-xs text-muted-foreground">{selected.targetSets} sets</p>
              </div>

              {selected.recommendation && <p className="text-xs text-muted-foreground">{selected.recommendation}</p>}

              {selected.loggedSummary && (
                <p className="text-xs text-muted-foreground">Already logged: {selected.loggedSummary}</p>
              )}

              {(selected.gifUrl || selected.imageUrls?.[0]) && (
                <button
                  onClick={() => setShowHowTo(true)}
                  className="text-xs font-medium text-muted-foreground underline text-left"
                >
                  How do I do this?
                </button>
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
