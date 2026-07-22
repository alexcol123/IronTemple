"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type MyPlan = { id: string; name: string; goal: string | null; visibility: "personal" | "public"; isActive: boolean };

// Matches the real /api/exercise-library response — not the old static
// body-parts.ts Exercise type, which is now only used by the seeded goal plan
// files (lose-weight.ts etc.), not the picker.
type Exercise = {
  id: string;
  name: string;
  displayName?: string | null;
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
  const searchParams = useSearchParams();

  const [planName, setPlanName] = useState("");
  const [goal, setGoal] = useState("");
  const [days, setDays] = useState<DayBuild[]>([{ bodyParts: [], selectedExercises: [] }]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [isCreator, setIsCreator] = useState(false);
  // Only meaningful for creators — a regular athlete's own split has no
  // followers to hide it from. Defaults based on which menu linked here:
  // /influencer/me's "My Workout" appends ?from=business (default Public,
  // they're likely building for subscribers); /menu's "Build Your Workout"
  // has no hint (default Personal). Either way it's editable per-plan below.
  const [visibility, setVisibility] = useState<"personal" | "public">(
    searchParams.get("from") === "business" ? "public" : "personal",
  );

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/profile?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => setIsCreator(!!data.user?.isCreator));
  }, [userId]);

  const [myPlans, setMyPlans] = useState<MyPlan[]>([]);
  const [myPlansLoaded, setMyPlansLoaded] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  // The create/edit form is hidden behind a button once someone already has
  // plans — no reason to greet a returning creator with a big blank form
  // every time. A first-time user with nothing yet sees it immediately.
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Editing an already-created plan loads it straight into this same form
  // (name/goal/days/exercises) instead of a separate editor — existingDayCount
  // tracks how many of the days currently in `days` came from the loaded
  // plan, so those specific days can't be removed here (a day with real
  // session history can't be deleted — see app/api/build-plan/[planId]).
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [existingDayCount, setExistingDayCount] = useState(0);

  // The real exercise picker library, now sourced from the database instead
  // of the static body-parts.ts file.
  const [libraryBodyParts, setLibraryBodyParts] = useState<LibraryBodyPart[]>([]);

  // Lets someone preview an exercise before checking it — new users building
  // their first custom split shouldn't have to guess what "Cable Cross-over
  // Variation" looks like from the name alone. previewDayIndex is tracked
  // alongside it so the modal's "Add to Plan" button knows which day to
  // toggle it on — previewing several exercises in a row shouldn't leave
  // someone unsure which one they were just looking at.
  const [previewExercise, setPreviewExercise] = useState<Exercise | null>(null);
  const [previewDayIndex, setPreviewDayIndex] = useState<number | null>(null);
  // The exact list visible at the moment "How do I do this?" was clicked —
  // lets the modal's "Next" button step through the same list someone was
  // already browsing, instead of jumping somewhere unrelated.
  const [previewList, setPreviewList] = useState<Exercise[]>([]);

  useEffect(() => {
    fetch("/api/exercise-library")
      .then((r) => r.json())
      .then((data) => setLibraryBodyParts(data.bodyParts ?? []));
  }, []);

  // Non-featured exercises come back from the list endpoint without their
  // gif/instructions/videos/images (kept out to keep that payload small) —
  // fetch the real content here, only for the one exercise actually previewed.
  async function showPreview(ex: Exercise) {
    if (ex.featured) {
      setPreviewExercise(ex);
      return;
    }
    const full = await fetch(`/api/exercise-library/${ex.id}`).then((r) => r.json());
    setPreviewExercise({ ...ex, ...full });
  }

  function previewExerciseContent(ex: Exercise, dayIndex: number, list: Exercise[]) {
    setPreviewDayIndex(dayIndex);
    setPreviewList(list);
    showPreview(ex);
  }

  function nextPreview() {
    if (!previewExercise || previewList.length < 2) return;
    const currentIndex = previewList.findIndex((e) => e.name === previewExercise.name);
    const next = previewList[(currentIndex + 1) % previewList.length];
    showPreview(next);
  }

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
      .then((data) => setMyPlans(data.plans ?? []))
      .finally(() => setMyPlansLoaded(true));
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

  // Loads an existing plan straight into this same create-flow form — same
  // name/goal fields, same day/exercise picker — so editing feels identical
  // to building, just pre-filled instead of starting blank.
  async function startEditPlan(planId: string) {
    setError("");
    const data = await fetch(`/api/plan/${planId}`).then((r) => r.json());
    const plan = data.plan;
    if (!plan) return;

    type LoadedDay = { muscles: string; exercises: { name: string; targetSets: number; targetReps: number }[] };
    const loadedDays: DayBuild[] = plan.days.map((d: LoadedDay) => ({
      bodyParts: d.muscles.split(", ").filter(Boolean),
      selectedExercises: d.exercises.map((e) => e.name),
    }));

    const sets: Record<string, number> = {};
    const reps: Record<string, number> = {};
    for (const d of plan.days as LoadedDay[]) {
      for (const e of d.exercises) {
        sets[e.name] = e.targetSets;
        reps[e.name] = e.targetReps;
      }
    }

    setEditingPlanId(planId);
    setExistingDayCount(loadedDays.length);
    setPlanName(plan.name);
    setGoal(plan.goal ?? "");
    setVisibility(plan.visibility ?? "public");
    setDays(loadedDays);
    setCustomSets(sets);
    setCustomReps(reps);
  }

  function cancelEdit() {
    setEditingPlanId(null);
    setExistingDayCount(0);
    setShowCreateForm(false);
    setPlanName("");
    setGoal("");
    setVisibility(searchParams.get("from") === "business" ? "public" : "personal");
    setDays([{ bodyParts: [], selectedExercises: [] }]);
    setCustomSets({});
    setCustomReps({});
    setError("");
  }

  function addDay() {
    setDays((prev) => (prev.length >= 7 ? prev : [...prev, { bodyParts: [], selectedExercises: [] }]));
  }

  function removeDay(index: number) {
    // A day with real session history can't be deleted (WorkoutSession rows
    // reference it directly) — pre-existing days loaded via edit just don't
    // get a Remove button at all (see the render below).
    if (editingPlanId && index < existingDayCount) return;
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
      // Non-creators never see the toggle, so this always stays "public" for
      // them — harmless, since they have no followers to hide it from anyway.
      visibility: isCreator ? visibility : "public",
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

    const res = await fetch(editingPlanId ? `/api/build-plan/${editingPlanId}` : "/api/build-plan", {
      method: editingPlanId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      if (editingPlanId) {
        cancelEdit();
        loadMyPlans();
      } else {
        router.push(`/menu/${userId}`);
      }
    } else {
      const data = await res.json();
      setError(data.error ?? "Something went wrong.");
    }
  }

  // Show the form outright for a first-timer with nothing yet; otherwise
  // it stays behind "+ Add New Plan" (or "Edit") until asked for.
  const formVisible = editingPlanId !== null || showCreateForm || (myPlansLoaded && myPlans.length === 0);

  const previewIsChecked =
    previewDayIndex !== null && previewExercise
      ? (days[previewDayIndex]?.selectedExercises.includes(previewExercise.name) ?? false)
      : false;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-6 pb-16">
        {/* Back link — goes back to wherever this page was actually entered
            from (see the ?from=business hint from /influencer/me and other
            business-side links), not always the athlete menu. */}
        {searchParams.get("from") === "business" ? (
          <Link href="/influencer/me" className="text-xs text-muted-foreground hover:text-foreground mb-3 inline-block">
            ← Creator Home
          </Link>
        ) : (
          <Link href={`/menu/${userId}`} className="text-xs text-muted-foreground hover:text-foreground mb-3 inline-block">
            ← Menu
          </Link>
        )}

        {/* Nameplate */}
        <div className="flex items-baseline justify-between pb-4 mb-6 border-b-2 border-border">
          <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">Iron Temple</p>
          <p className="text-xs text-muted-foreground">Build Your Workout</p>
        </div>

        <div className="flex flex-col gap-5">
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
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium">{p.name}</p>
                        {isCreator && (
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                              p.visibility === "personal"
                                ? "bg-muted text-muted-foreground"
                                : "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                            }`}
                          >
                            {p.visibility === "personal" ? "Personal" : "Public"}
                          </span>
                        )}
                      </div>
                      {p.goal && <p className="text-xs text-muted-foreground">{p.goal}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/plan/${p.id}?userId=${userId}${searchParams.get("from") === "business" ? "&from=business" : ""}`}
                        target="_blank"
                        className="text-xs px-2.5 py-1 rounded-full border hover:bg-muted transition-colors"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => startEditPlan(p.id)}
                        className="text-xs px-2.5 py-1 rounded-full border hover:bg-muted transition-colors"
                      >
                        Edit
                      </button>
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

          {myPlansLoaded && myPlans.length > 0 && !formVisible && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="text-sm px-3 py-2.5 rounded-xl border border-dashed border-border text-muted-foreground hover:bg-muted transition-colors"
            >
              + Add New Plan
            </button>
          )}

          {formVisible && (editingPlanId || showCreateForm) && (
            <div className="flex items-center justify-between rounded-xl border border-amber-400/40 bg-amber-50 dark:bg-amber-950/20 px-3 py-2.5">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {editingPlanId ? "Editing this plan below — add days, add or remove exercises." : "Building a new plan below."}
              </p>
              <button onClick={cancelEdit} className="text-xs font-medium text-amber-700 dark:text-amber-400 underline">
                Cancel
              </button>
            </div>
          )}

          {formVisible && (
            <>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Plan Name</p>
                <Input value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="e.g. Jenny's Split" className="text-sm" />
              </div>

              {isCreator && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Visibility</p>
                  <div className="flex rounded-xl overflow-hidden border border-border text-sm">
                    <button
                      onClick={() => setVisibility("personal")}
                      className={`flex-1 text-center px-3 py-2 transition-colors ${
                        visibility === "personal" ? "bg-amber-500 text-white" : "text-foreground hover:bg-muted"
                      }`}
                    >
                      Personal
                    </button>
                    <button
                      onClick={() => setVisibility("public")}
                      className={`flex-1 text-center px-3 py-2 transition-colors ${
                        visibility === "public" ? "bg-amber-500 text-white" : "text-foreground hover:bg-muted"
                      }`}
                    >
                      Public
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {visibility === "personal"
                      ? "Just for you — not followable by anyone else, even with the link."
                      : "Followers can find and follow this program."}
                  </p>
                </div>
              )}

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Goal</p>
            <div className="flex flex-col gap-1.5">
              {GOAL_OPTIONS.map((g) => (
                <button
                  key={g.value}
                  onClick={() => setGoal(g.value)}
                  className={`flex items-center justify-between text-sm text-left px-3 py-2 rounded-xl border transition-colors ${
                    goal === g.value
                      ? "bg-amber-500 text-white border-amber-500"
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
              const matchingSearch = visibleExercises.filter(
                (ex) =>
                  ex.name.toLowerCase().includes(searchTerm) ||
                  (ex.displayName ?? "").toLowerCase().includes(searchTerm),
              );
              const showAll = expanded[dayIndex] || isSearching;
              const displayedExercises = showAll ? matchingSearch : matchingSearch.filter((ex) => ex.featured);
              const hiddenCount = matchingSearch.length - displayedExercises.length;
              return (
                <div key={dayIndex} className="border border-border rounded-xl p-3 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Day {dayIndex + 1}</p>
                    {days.length > 1 && !(editingPlanId && dayIndex < existingDayCount) && (
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
                              ? "bg-amber-500 text-white border-amber-500"
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
                                  {ex.displayName || ex.name}
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
                              <button
                                type="button"
                                onClick={() => previewExerciseContent(ex, dayIndex, displayedExercises)}
                                className="text-xs font-medium text-muted-foreground underline text-left pl-6"
                              >
                                How do I do this?
                              </button>
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

              <Button onClick={handleSave} disabled={saving} className="w-full rounded-full bg-amber-500 hover:bg-amber-600 text-white">
                {saving ? "Saving..." : editingPlanId ? "Save Changes" : "Save Plan"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Preview overlay: lets someone see an exercise before checking it,
          same GIF/instructions/video content as /today's how-to panel, just
          reachable earlier in the flow since this page is one continuous
          form rather than separate list/detail views. */}
      {previewExercise && (previewExercise.gifUrl || previewExercise.imageUrls?.[0]) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto bg-background rounded-3xl border shadow-md flex flex-col">
            <div className="px-4 py-3 border-b flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">How To</p>
                <p className="font-semibold text-sm truncate">{previewExercise.displayName || previewExercise.name}</p>
              </div>
              <button
                onClick={() => {
                  setPreviewExercise(null);
                  setPreviewDayIndex(null);
                }}
                className="text-sm text-muted-foreground shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Add/Next right up top — reachable the instant the modal opens,
                no scrolling past the gif/instructions/videos required. */}
            <div className="px-4 pt-3 flex gap-2">
              <button
                onClick={() => {
                  if (previewDayIndex !== null) toggleExercise(previewDayIndex, previewExercise);
                }}
                className={`flex-1 text-sm text-center px-4 py-2 rounded-full transition-colors ${
                  previewIsChecked
                    ? "border hover:bg-muted"
                    : "bg-amber-500 hover:bg-amber-600 text-white"
                }`}
              >
                {previewIsChecked ? "Remove from Plan" : "+ Add to Plan"}
              </button>
              {previewList.length > 1 && (
                <button
                  onClick={nextPreview}
                  className="flex-1 text-sm text-center px-4 py-2 rounded-full border hover:bg-muted transition-colors"
                >
                  Next →
                </button>
              )}
            </div>

            <div className="p-4 flex flex-col gap-3">
              <div className="border border-border rounded-xl overflow-hidden">
                <img
                  src={previewExercise.gifUrl ?? previewExercise.imageUrls?.[0]}
                  alt={previewExercise.displayName || previewExercise.name}
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
                      title={`${previewExercise.displayName || previewExercise.name} video tutorial ${i + 1}`}
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
                onClick={() => {
                  setPreviewExercise(null);
                  setPreviewDayIndex(null);
                  setPreviewList([]);
                }}
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

