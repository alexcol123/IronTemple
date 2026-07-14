"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type MyPlan = { id: string; name: string; goal: string | null; isActive: boolean };

// Matches the real /api/exercise-library response — not the old static
// body-parts.ts Exercise type, which is now only used by the seeded goal plan
// files (lose-weight.ts etc.), not the picker.
type Exercise = {
  name: string;
  sets: number;
  reps: number;
  type?: string;
  featured: boolean;
  gifUrl?: string | null;
  instructions?: string[];
  videoUrls?: string[];
  imageUrls?: string[];
};
type LibraryBodyPart = { name: string; exercises: Exercise[] };

// Turns a normal youtube.com/watch or youtu.be link into the /embed/ form
// needed for an inline iframe — same helper as /today's how-to panel.
function getYouTubeEmbedUrl(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

// Rep ranges shown here must match GOAL_REP_RANGE in lib/sms-engine.ts — this is
// just for the creator to see what they're picking, the actual math lives there.
const GOAL_OPTIONS = [
  { label: "Lose weight", value: "Lose Weight", range: "12-15 reps" },
  { label: "Build muscle", value: "Build Muscle", range: "8-12 reps" },
  { label: "Get stronger", value: "Get Stronger", range: "4-6 reps" },
  { label: "Glute focus", value: "Glute Focus", range: "10-15 reps" },
];

type DayBuild = {
  bodyParts: string[];
  selectedExercises: string[];
};

export default function BuildPage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();

  const [planName, setPlanName] = useState("");
  const [goal, setGoal] = useState("");
  const [days, setDays] = useState<DayBuild[]>([{ bodyParts: [], selectedExercises: [] }]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [myPlans, setMyPlans] = useState<MyPlan[]>([]);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  // The real exercise picker library, now sourced from the database instead
  // of the static body-parts.ts file.
  const [libraryBodyParts, setLibraryBodyParts] = useState<LibraryBodyPart[]>([]);

  // Lets someone preview an exercise before checking it — new users building
  // their first custom split shouldn't have to guess what "Cable Cross-over
  // Variation" looks like from the name alone.
  const [previewExercise, setPreviewExercise] = useState<Exercise | null>(null);

  useEffect(() => {
    fetch("/api/exercise-library")
      .then((r) => r.json())
      .then((data) => setLibraryBodyParts(data.bodyParts ?? []));
  }, []);

  function exercisesForBodyParts(bodyParts: string[]): Exercise[] {
    return libraryBodyParts.filter((bp) => bodyParts.includes(bp.name)).flatMap((bp) => bp.exercises);
  }

  // Which body part's exercise list is showing per day — keeps the picker to one
  // body part's worth of exercises at a time instead of every selected body
  // part's exercises combined in one long list. Keyed by day index.
  const [activeTab, setActiveTab] = useState<Record<number, string>>({});

  // Filters the active tab's exercise list by name (e.g. "bench" inside Chest) —
  // keyed by day index since each day has its own independent tab/search.
  const [search, setSearch] = useState<Record<number, string>>({});

  // Most body parts have 100+ exercises after the bulk import — showing only
  // the hand-curated "featured" ones by default keeps the picker usable.
  // Typing a search term bypasses this entirely (searching should never be
  // limited by curation), and "See all" expands permanently for that day/tab.
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  // Cardio ("reps" = minutes) and bodyweight reps are both real, literal numbers
  // someone actually performs — unlike weighted reps (an internal math anchor),
  // these are worth letting the builder customize. Keyed by exercise name, shared
  // across days if the same exercise appears more than once.
  const [customReps, setCustomReps] = useState<Record<string, number>>({});

  // Sets are always shown to the athlete regardless of exercise type, and real
  // programs vary them per exercise (5 sets on the main lift, 2-3 on accessories)
  // — unlike weighted reps, there's no reason to keep this hidden.
  const [customSets, setCustomSets] = useState<Record<string, number>>({});

  const loadMyPlans = useCallback(() => {
    fetch(`/api/my-plans?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((data) => setMyPlans(data.plans ?? []));
  }, [userId]);

  useEffect(() => {
    if (userId) loadMyPlans();
  }, [userId, loadMyPlans]);

  async function handleSwitch(planId: string) {
    setSwitchingId(planId);
    const res = await fetch("/api/follow-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, planId }),
    });
    setSwitchingId(null);
    if (res.ok) loadMyPlans();
  }

  function addDay() {
    setDays((prev) => (prev.length >= 7 ? prev : [...prev, { bodyParts: [], selectedExercises: [] }]));
  }

  function removeDay(index: number) {
    setDays((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleBodyPart(dayIndex: number, bodyPart: string) {
    setDays((prev) =>
      prev.map((day, i) => {
        if (i !== dayIndex) return day;
        const bodyParts = day.bodyParts.includes(bodyPart)
          ? day.bodyParts.filter((b) => b !== bodyPart)
          : [...day.bodyParts, bodyPart];
        // Drop any selected exercises that no longer belong to a chosen body part
        const available = exercisesForBodyParts(bodyParts).map((e) => e.name);
        const selectedExercises = day.selectedExercises.filter((name) => available.includes(name));
        return { bodyParts, selectedExercises };
      }),
    );
  }

  function toggleExercise(dayIndex: number, exercise: Exercise) {
    setDays((prev) =>
      prev.map((day, i) => {
        if (i !== dayIndex) return day;
        const selectedExercises = day.selectedExercises.includes(exercise.name)
          ? day.selectedExercises.filter((n) => n !== exercise.name)
          : [...day.selectedExercises, exercise.name];
        return { ...day, selectedExercises };
      }),
    );
    if (exercise.type === "cardio" || exercise.type === "bodyweight") {
      setCustomReps((prev) => (exercise.name in prev ? prev : { ...prev, [exercise.name]: exercise.reps }));
    }
    setCustomSets((prev) => (exercise.name in prev ? prev : { ...prev, [exercise.name]: exercise.sets }));
  }

  async function handleSave() {
    setError("");
    if (!planName.trim()) return setError("Give your plan a name.");
    if (!goal) return setError("Pick a goal.");
    if (days.length === 0) return setError("Add at least one day.");
    for (const day of days) {
      if (day.bodyParts.length === 0) return setError("Every day needs at least one body part.");
      if (day.selectedExercises.length === 0) return setError("Every day needs at least one exercise.");
    }

    setSaving(true);
    const payload = {
      userId,
      planName: planName.trim(),
      goal,
      days: days.map((day) => {
        const available = exercisesForBodyParts(day.bodyParts);
        return {
          bodyParts: day.bodyParts,
          // Follow the order exercises were checked in, not body-part library
          // order — lifters care about sequence (bench before push-ups before
          // pull-ups), and this is now also what the "1, 2, 3..." badges show.
          exercises: day.selectedExercises
            .map((name) => available.find((e) => e.name === name))
            .filter((e): e is Exercise => e !== undefined)
            .map((e) => ({
              name: e.name,
              sets: customSets[e.name] ?? e.sets,
              reps: e.type === "cardio" || e.type === "bodyweight" ? customReps[e.name] ?? e.reps : e.reps,
              type: e.type,
            })),
        };
      }),
    };

    const res = await fetch("/api/build-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      router.push(`/menu/${userId}`);
    } else {
      const data = await res.json();
      setError(data.error ?? "Something went wrong.");
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-background overflow-hidden">
      <div className="flex flex-col w-full max-w-sm h-full sm:h-175 sm:border sm:rounded-3xl overflow-hidden sm:shadow-md">
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <Link href={`/menu/${userId}`} className="text-xs text-muted-foreground">← Menu</Link>
          <p className="font-semibold text-sm">Build Your Workout</p>
          <div className="w-10" />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5">
          <p className="text-xs text-muted-foreground bg-muted rounded-xl px-3 py-2">
            Weeks reset every Monday. Day 1 just means your first workout that week — even if that&apos;s a Wednesday, not literally Monday.
          </p>

          {myPlans.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Your Plans</p>
              <div className="flex flex-col gap-1.5">
                {myPlans.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-sm px-3 py-2 rounded-xl border border-border"
                  >
                    <div>
                      <p className="font-medium">{p.name}</p>
                      {p.goal && <p className="text-xs text-muted-foreground">{p.goal}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/plan/${p.id}?userId=${userId}`}
                        target="_blank"
                        className="text-xs px-2.5 py-1 rounded-full border hover:bg-muted transition-colors"
                      >
                        View
                      </Link>
                      {p.isActive ? (
                        <span className="text-xs font-medium text-muted-foreground">Active</span>
                      ) : (
                        <button
                          onClick={() => handleSwitch(p.id)}
                          disabled={switchingId === p.id}
                          className="text-xs px-2.5 py-1 rounded-full border hover:bg-muted transition-colors"
                        >
                          {switchingId === p.id ? "..." : "Switch to this"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Plan Name</p>
            <Input value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="e.g. Jenny's Split" className="text-sm" />
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Goal</p>
            <div className="flex flex-col gap-1.5">
              {GOAL_OPTIONS.map((g) => (
                <button
                  key={g.value}
                  onClick={() => setGoal(g.value)}
                  className={`flex items-center justify-between text-sm text-left px-3 py-2 rounded-xl border transition-colors ${
                    goal === g.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-foreground hover:bg-muted"
                  }`}
                >
                  <span>{g.label}</span>
                  <span className={goal === g.value ? "text-primary-foreground/80" : "text-muted-foreground"}>
                    {g.range}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {days.map((day, dayIndex) => {
              const available = exercisesForBodyParts(day.bodyParts);
              const currentTab = activeTab[dayIndex] && day.bodyParts.includes(activeTab[dayIndex])
                ? activeTab[dayIndex]
                : day.bodyParts[0];
              const visibleExercises = exercisesForBodyParts(currentTab ? [currentTab] : []);
              const searchTerm = (search[dayIndex] ?? "").toLowerCase();
              const isSearching = searchTerm.length > 0;
              const matchingSearch = visibleExercises.filter((ex) => ex.name.toLowerCase().includes(searchTerm));
              const showAll = expanded[dayIndex] || isSearching;
              const displayedExercises = showAll ? matchingSearch : matchingSearch.filter((ex) => ex.featured);
              const hiddenCount = matchingSearch.length - displayedExercises.length;
              return (
                <div key={dayIndex} className="border rounded-2xl p-3 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Day {dayIndex + 1}</p>
                    {days.length > 1 && (
                      <button
                        onClick={() => removeDay(dayIndex)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Body Parts</p>
                    <div className="flex flex-wrap gap-1.5">
                      {libraryBodyParts.map((bp) => (
                        <button
                          key={bp.name}
                          onClick={() => toggleBodyPart(dayIndex, bp.name)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                            day.bodyParts.includes(bp.name)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border text-foreground hover:bg-muted"
                          }`}
                        >
                          {bp.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {available.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Exercises</p>

                      {day.bodyParts.length > 1 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {day.bodyParts.map((bp) => (
                            <button
                              key={bp}
                              onClick={() => setActiveTab((prev) => ({ ...prev, [dayIndex]: bp }))}
                              className={`text-xs px-2 py-1 rounded-md transition-colors ${
                                currentTab === bp
                                  ? "bg-foreground text-background"
                                  : "text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              {bp}
                            </button>
                          ))}
                        </div>
                      )}

                      <Input
                        value={search[dayIndex] ?? ""}
                        onChange={(e) => setSearch((prev) => ({ ...prev, [dayIndex]: e.target.value }))}
                        placeholder="Search exercises..."
                        className="text-xs h-8 mb-2"
                      />

                      <div className="flex flex-col gap-1">
                        {displayedExercises.map((ex) => {
                          const checked = day.selectedExercises.includes(ex.name);
                          return (
                            <div key={ex.name} className="flex flex-col gap-1 text-sm">
                              <div className="flex items-center gap-2">
                                <label className="flex items-center gap-2 flex-1">
                                  <input type="checkbox" checked={checked} onChange={() => toggleExercise(dayIndex, ex)} />
                                  {checked && (
                                    <span className="text-xs font-semibold text-muted-foreground w-4">
                                      {day.selectedExercises.indexOf(ex.name) + 1}.
                                    </span>
                                  )}
                                  {ex.name}
                                </label>
                                {checked && (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      min={1}
                                      value={customSets[ex.name] ?? ex.sets}
                                      onChange={(e) =>
                                        setCustomSets((prev) => ({ ...prev, [ex.name]: Number(e.target.value) }))
                                      }
                                      className="w-10 text-xs px-2 py-1 rounded-md border bg-background"
                                    />
                                    <span className="text-xs text-muted-foreground">sets</span>
                                  </div>
                                )}
                                {checked && (ex.type === "cardio" || ex.type === "bodyweight") && (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      min={1}
                                      value={customReps[ex.name] ?? ex.reps}
                                      onChange={(e) =>
                                        setCustomReps((prev) => ({ ...prev, [ex.name]: Number(e.target.value) }))
                                      }
                                      className="w-14 text-xs px-2 py-1 rounded-md border bg-background"
                                    />
                                    <span className="text-xs text-muted-foreground">
                                      {ex.type === "cardio" ? "min" : "reps"}
                                    </span>
                                  </div>
                                )}
                              </div>
                              {checked && (ex.gifUrl || ex.imageUrls?.[0]) && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewExercise(ex)}
                                  className="text-xs font-medium text-muted-foreground underline text-left pl-6"
                                >
                                  How do I do this?
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {!showAll && hiddenCount > 0 && (
                        <button
                          onClick={() => setExpanded((prev) => ({ ...prev, [dayIndex]: true }))}
                          className="text-xs text-muted-foreground underline mt-2"
                        >
                          See all {matchingSearch.length} →
                        </button>
                      )}
                      {expanded[dayIndex] && !isSearching && (
                        <button
                          onClick={() => setExpanded((prev) => ({ ...prev, [dayIndex]: false }))}
                          className="text-xs text-muted-foreground underline mt-2"
                        >
                          Show featured only
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={addDay}
            className="text-sm px-3 py-2 rounded-xl border border-dashed text-muted-foreground hover:bg-muted transition-colors"
          >
            + Add Day
          </button>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="px-4 py-3 border-t">
          <Button onClick={handleSave} disabled={saving} className="w-full rounded-full">
            {saving ? "Saving..." : "Save Plan"}
          </Button>
        </div>
      </div>

      {/* Preview overlay: lets someone see an exercise before checking it,
          same GIF/instructions/video content as /today's how-to panel, just
          reachable earlier in the flow since this page is one continuous
          form rather than separate list/detail views. */}
      {previewExercise && (previewExercise.gifUrl || previewExercise.imageUrls?.[0]) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto bg-background rounded-3xl border shadow-md flex flex-col">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="w-10" />
              <p className="font-semibold text-sm">How To</p>
              <button
                onClick={() => setPreviewExercise(null)}
                className="w-10 text-right text-sm text-muted-foreground"
              >
                ✕
              </button>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div className="border rounded-2xl overflow-hidden">
                <img
                  src={previewExercise.gifUrl ?? previewExercise.imageUrls?.[0]}
                  alt={previewExercise.name}
                  className="w-full bg-black"
                />
                {previewExercise.instructions && previewExercise.instructions.length > 0 && (
                  <ol className="px-4 py-3 flex flex-col gap-1.5 list-decimal list-inside">
                    {previewExercise.instructions.map((step, i) => (
                      <li key={i} className="text-xs text-muted-foreground">{step}</li>
                    ))}
                  </ol>
                )}
              </div>

              {previewExercise.videoUrls?.map((url, i) => {
                const embedUrl = getYouTubeEmbedUrl(url);
                return embedUrl ? (
                  <div key={i} className="rounded-2xl overflow-hidden aspect-video">
                    <iframe
                      src={embedUrl}
                      title={`${previewExercise.name} video tutorial ${i + 1}`}
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
                    className="text-sm text-center px-4 py-2 rounded-full border hover:bg-muted transition-colors"
                  >
                    Watch video {i + 1}
                  </a>
                );
              })}

              <button
                onClick={() => setPreviewExercise(null)}
                className="text-sm text-center px-4 py-2 rounded-full border hover:bg-muted transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
