import { prisma } from "@/lib/db";

// Monday of the current real-world week, 00:00 — the anchor for "sessions this week"
function getMondayOfThisWeek(): Date {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ... 6=Sat
  const diffFromMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffFromMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export const STATES = ["idle", "onboarding_name", "onboarding_goal", "onboarding_experience", "changing_plan", "workout_ready", "exercise_active", "bonus_day_choice"] as const;
export type State = typeof STATES[number];

export const GOALS = [
  { label: "Lose weight", planName: "Lose Weight" },
  { label: "Build muscle", planName: "Build Muscle" },
  { label: "Get stronger", planName: "Get Stronger" },
  { label: "Glute focus", planName: "Glute Focus" },
] as const;

// Each exercise's targetReps is authored as a strength/powerlifting baseline (the
// lowest realistic rep range). The goal picked at onboarding adds reps on top of
// that baseline — same exercise, same weight, but a bodybuilder needs more reps
// to prove readiness for the next weight than a powerlifter does.
const GOAL_REP_OFFSET: Record<string, number> = {
  "Get Stronger": 0,
  "Build Muscle": 5,
  "Glute Focus": 7,
  "Lose Weight": 8,
};

// The exercise prompt header shows this typical range for the goal instead of the
// raw baseline reps — baseline is an internal anchor for the offset math, not a
// number a lifter should ever be told to aim for directly.
const GOAL_REP_RANGE: Record<string, string> = {
  "Get Stronger": "4-6",
  "Build Muscle": "8-12",
  "Glute Focus": "10-15",
  "Lose Weight": "12-15",
};

export const EXPERIENCE_TIERS = [
  { label: "Beginner/Returning", key: "Beginner", days: "3 days/week" },
  { label: "Intermediate", key: "Intermediate", days: "4 days/week" },
  { label: "Advanced/Semi-Pro", key: "Advanced", days: "5-6 days/week" },
] as const;

type SetEntry = { setNumber: number; weight: number; reps: number };

type ExerciseType = "weighted" | "cardio" | "bodyweight";

type Exercise = { id: string; name: string; targetSets: number; targetReps: number; type?: ExerciseType };

function exerciseLine(e: Exercise, i: number, goalKey?: string) {
  if (e.type === "cardio") return `${i + 1}. ${e.name} - ${e.targetReps} min`;
  // Weighted exercises show the goal's typical range here too, matching the
  // exercisePrompt header — bodyweight keeps its fixed rep count regardless of goal.
  const reps = e.type === "bodyweight" || !goalKey ? e.targetReps : GOAL_REP_RANGE[goalKey] ?? e.targetReps;
  return `${i + 1}. ${e.name} - ${e.targetSets}x${reps}`;
}

// The "failure set" is whichever set had the heaviest weight, not necessarily the
// last one logged — people often add a lighter back-off set after their real top
// effort, so "last logged" and "hardest effort" aren't always the same set.
export function heaviestSet<T extends { weight: number }>(sets: T[]): T {
  return sets.reduce((best, s) => (s.weight > best.weight ? s : best), sets[0]);
}

function exercisePrompt(
  exercise: Exercise,
  lastSets: SetEntry[] | undefined,
  goalKey: string | undefined,
  referenceSet: SetEntry | null | undefined,
  hasNext: boolean,
) {
  // BUSY only makes sense if there's another exercise today to swap places with —
  // offering it on the last exercise would just be a dead end (see the BUSY
  // handler in handleMessage, which blocks it in that case too).
  const busyHint = hasNext ? ", or BUSY if the machine's taken" : "";
  if (exercise.type === "cardio") {
    return `${exercise.name} - aim for ${exercise.targetReps} min.\nReply with how long you went (e.g. 20 or 35), or SKIP${busyHint}.`;
  }
  if (exercise.type === "bodyweight") {
    let msg = `${exercise.name} - ${exercise.targetSets} sets x ${exercise.targetReps} reps`;
    if (lastSets && lastSets.length > 0) {
      msg += `\nLast time: ${lastSets.map((s) => s.reps).join(" ")}`;
    }
    msg += `\nLog your reps per set (e.g. 15 12 10), or type SKIP${busyHint}`;
    return msg;
  }
  // The header shows the goal's typical rep range, not the raw baseline reps —
  // baseline is only an internal anchor for the offset math (see GOAL_REP_RANGE),
  // never something a lifter should be told to aim for directly.
  const repRange = goalKey ? GOAL_REP_RANGE[goalKey] ?? exercise.targetReps : exercise.targetReps;
  let msg = `${exercise.name} - ${exercise.targetSets} sets x ${repRange} reps (push your heaviest set to failure)`;
  // "Recent heavy set" instead of "Last time" — the reference is the best of the
  // last 2 sessions (see getReferenceSet), not necessarily the most recent one, so
  // "last time" would sometimes be factually wrong. This is the one place the
  // challenge is shown — logging a set no longer echoes it back immediately after.
  if (referenceSet && goalKey) {
    const suggestedWeight = calculateNextSuggestedWeight(referenceSet.weight, referenceSet.reps, exercise.targetReps, goalKey);
    const effectiveTarget = getEffectiveTargetReps(exercise.targetReps, goalKey);
    msg +=
      suggestedWeight !== null
        ? `\nRecent heavy set: ${referenceSet.weight}x${referenceSet.reps} - try ${suggestedWeight} lbs today, even 1-2 more reps builds real strength.`
        : `\nRecent heavy set: ${referenceSet.weight}x${referenceSet.reps} - try for ${nextRepGoal(referenceSet.reps, effectiveTarget)} reps today.`;
  }
  msg += `\nLog your sets (e.g. 150x10 160x8) or type SKIP${busyHint}`;
  return msg;
}

// Fetches the last session's sets for a specific exercise, for a specific user.
// Matched by exercise NAME, not plannedExerciseId — the same exercise (e.g. "Bench
// Press") is a different database row in every plan/day, so matching by ID alone
// would lose someone's history the moment they change plans or tiers.
async function getLastSets(userId: string, exerciseName: string): Promise<SetEntry[]> {
  const lastLog = await prisma.exerciseLog.findFirst({
    where: {
      skipped: false,
      session: { userId },
      plannedExercise: { name: exerciseName },
    },
    orderBy: { session: { date: "desc" } },
    include: { sets: { orderBy: { setNumber: "asc" } } },
  });

  if (!lastLog) return [];
  return lastLog.sets.map((s) => ({ setNumber: s.setNumber, weight: s.weight, reps: s.reps }));
}

// Best of the last 2 sessions' failure sets — comparing today's most recent
// session against the one before it and using whichever was heavier. This is
// what lets one rough day (fatigue, minor tweak) get absorbed without resetting
// the target, while a real, sustained change still shows up within 2 sessions,
// since the older session ages out of the window the next time this runs.
async function getReferenceSet(userId: string, exerciseName: string): Promise<SetEntry | null> {
  const logs = await prisma.exerciseLog.findMany({
    where: {
      skipped: false,
      session: { userId },
      plannedExercise: { name: exerciseName },
    },
    orderBy: { session: { date: "desc" } },
    take: 2,
    include: { sets: { orderBy: { setNumber: "asc" } } },
  });

  const failureSets = logs.filter((l) => l.sets.length > 0).map((l) => heaviestSet(l.sets));
  if (failureSets.length === 0) return null;
  // Ties keep the more recent session — failureSets[0] is most recent since logs
  // are ordered newest-first, and reduce only replaces it on a strictly higher weight.
  return failureSets.reduce((best, s) => (s.weight > best.weight ? s : best), failureSets[0]);
}

// Highest weight ever logged for this exercise, any rep count — the classic PR.
// Matched by name for the same reason as getLastSets above.
async function getBestWeightPR(userId: string, exerciseName: string): Promise<number | null> {
  const best = await prisma.setLog.findFirst({
    where: {
      exerciseLog: {
        skipped: false,
        session: { userId },
        plannedExercise: { name: exerciseName },
      },
    },
    orderBy: { weight: "desc" },
  });
  return best?.weight ?? null;
}

// Which goal (Lose Weight / Build Muscle / Get Stronger / Glute Focus) the user is
// currently training toward. Drives the rep offset in calculateNextSuggestedWeight.
// Prefers the plan's explicit `goal` field (set at creation for custom/creator-built
// plans, whose names don't follow a fixed convention) and falls back to matching the
// plan name's suffix for plans seeded before that field existed.
export async function getUserGoalKey(userId: string): Promise<string> {
  const userPlan = await prisma.userPlan.findFirst({
    where: { userId, endDate: null },
    include: { plan: true },
  });
  if (userPlan?.plan.goal) return userPlan.plan.goal;
  const planName = userPlan?.plan.name ?? "";
  for (const goal of GOALS) {
    if (planName.endsWith(goal.planName)) return goal.planName;
  }
  return "Build Muscle";
}

// Which experience tier (Beginner/Intermediate/Advanced) the user is currently on,
// derived the same way as getUserGoalKey — used on the profile page, since changing
// goal or tier there needs to know both halves of the current plan name.
export async function getUserTierKey(userId: string): Promise<string> {
  const userPlan = await prisma.userPlan.findFirst({
    where: { userId, endDate: null },
    include: { plan: true },
  });
  const planName = userPlan?.plan.name ?? "";
  for (const tier of EXPERIENCE_TIERS) {
    if (planName.startsWith(tier.key)) return tier.key;
  }
  return "Intermediate";
}

// Clamped to a strength-rep baseline (max 5) regardless of what a plan's targetReps
// says — Get Stronger has a +0 offset, so an uncapped baseline (e.g. a hypertrophy
// exercise seeded with targetReps: 10) would silently demand 10 reps on a heavy set
// to progress. Capping here means any exercise data is safe to reuse across goals.
export function getEffectiveTargetReps(baseTargetReps: number, goalKey: string): number {
  return Math.min(baseTargetReps, 5) + (GOAL_REP_OFFSET[goalKey] ?? 5);
}

// The graduated rep ladder: each exercise's targetReps is a strength baseline, and
// the user's goal adds reps on top of it (see GOAL_REP_OFFSET). Clearing that
// effective target on the heaviest set is the only proof needed to jump — no tier
// margin, no formula prediction. The jump itself is always a flat +5 lbs, since
// that's the smallest real increment either a barbell (2.5/side) or a dumbbell
// rack actually offers.
export function calculateNextSuggestedWeight(
  currentWeight: number,
  currentReps: number,
  baseTargetReps: number,
  goalKey: string,
): number | null {
  const effectiveTarget = getEffectiveTargetReps(baseTargetReps, goalKey);
  return currentReps >= effectiveTarget ? currentWeight + 5 : null;
}

// A small, bounded next step (+1 to +2 reps) instead of an open-ended "beat X or
// more" — never suggests further than the effective target actually requires, so
// if only 1 more rep clears it, that's the only number shown.
export function nextRepGoal(currentReps: number, effectiveTarget: number): string {
  const gap = effectiveTarget - currentReps;
  if (gap <= 1) return `${currentReps + 1}`;
  return `${currentReps + 1}-${currentReps + 2}`;
}

function parseSets(text: string): SetEntry[] | null {
  const normalized = text.toLowerCase().replace(/,/g, " ").replace(/\s*x\s*/g, "x").trim();
  const tokens = normalized.split(/\s+/);
  const sets: SetEntry[] = [];
  for (const token of tokens) {
    const match = token.match(/^(\d+(?:\.\d+)?)x(\d+)$/);
    if (match) {
      sets.push({ setNumber: sets.length + 1, weight: parseFloat(match[1]), reps: parseInt(match[2]) });
    }
  }
  return sets.length > 0 ? sets : null;
}

// Grabs the leading number from cardio replies like "20", "20 mins", "35 minutes"
function parseMinutes(text: string): number | null {
  const match = text.trim().match(/^(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

// Parses bare rep counts for bodyweight exercises, e.g. "15 12 10" -> [15, 12, 10]
function parseReps(text: string): number[] | null {
  const tokens = text.trim().replace(/,/g, " ").split(/\s+/);
  const reps: number[] = [];
  for (const token of tokens) {
    const match = token.match(/^(\d+)$/);
    if (match) reps.push(parseInt(match[1]));
  }
  return reps.length > 0 ? reps : null;
}

// Looks at what someone typed and guesses which format they were actually using,
// so a mismatch (e.g. weight x reps during a cardio exercise) gets a targeted
// correction instead of a generic "couldn't read that."
function detectInputFormat(text: string): "weighted" | "bareNumbers" | "unknown" {
  const normalized = text.trim().toLowerCase();
  if (/\d+\s*x\s*\d+/.test(normalized)) return "weighted";
  if (/^\d+(\.\d+)?(\s+\d+(\.\d+)?)*$/.test(normalized)) return "bareNumbers";
  return "unknown";
}

export type MessageResult = { reply: string; nextState: State; context?: Record<string, unknown> };

export async function handleMessage(
  phone: string,
  text: string,
  state: State,
  context: Record<string, unknown> = {},
): Promise<MessageResult> {
  const input = text.trim().toUpperCase();

  // HISTORY works from any state — doesn't disturb whatever they were doing
  if (input === "HISTORY") {
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) return { reply: "Phone not found. Text JOIN to sign up.", nextState: "idle" };
    return {
      reply: `Here's your workout history:\n${process.env.APP_URL}/history/${user.id}`,
      nextState: state,
      context,
    };
  }

  // APP works from any state — one link to the hub (history, PRs, my info, etc).
  if (input === "APP") {
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) return { reply: "Phone not found. Text JOIN to sign up.", nextState: "idle" };
    return {
      reply: `Here's your app:\n${process.env.APP_URL}/menu/${user.id}`,
      nextState: state,
      context,
    };
  }

  // DEV ONLY — works from any state, since the whole point is bailing out when
  // stuck somewhere (mid-onboarding, mid-workout, etc). Wipes just this phone's
  // own data so testers can re-JOIN without resetting the whole database.
  // Remove or gate this before real users onboard.
  if (input === "RESET123") {
    const user = await prisma.user.findUnique({ where: { phone } });
    if (user) {
      const sessions = await prisma.workoutSession.findMany({ where: { userId: user.id }, select: { id: true } });
      const sessionIds = sessions.map((s) => s.id);
      const logs = await prisma.exerciseLog.findMany({ where: { sessionId: { in: sessionIds } }, select: { id: true } });
      const logIds = logs.map((l) => l.id);
      await prisma.setLog.deleteMany({ where: { exerciseLogId: { in: logIds } } });
      await prisma.exerciseLog.deleteMany({ where: { sessionId: { in: sessionIds } } });
      await prisma.workoutSession.deleteMany({ where: { userId: user.id } });
      await prisma.userPlan.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
    return { reply: "Reset done - text JOIN to start fresh.", nextState: "idle", context: {} };
  }

  // Idle — entry point
  if (state === "idle") {
    if (input === "MENU" || input === "HEY ARNOLD") {
      return {
        reply: `What do you need?\n\nText APP to open your app\nText HISTORY to see your workout history\nText CHANGE to switch plans\nText HERE to start today's workout`,
        nextState: "idle",
      };
    }

    if (input === "JOIN") {
      const existing = await prisma.user.findUnique({ where: { phone } });
      if (existing) {
        return {
          reply: `Already signed up as ${existing.name}. Type HERE to start today's workout.`,
          nextState: "idle",
        };
      }
      return { reply: "Welcome to Iron Temple! What's your name?", nextState: "onboarding_name" };
    }

    if (input === "HERE") {
      const user = await prisma.user.findUnique({
        where: { phone },
        include: {
          planHistory: {
            where: { endDate: null },
            include: {
              plan: { include: { days: { include: { exercises: { orderBy: { order: "asc" } } } } } },
            },
          },
        },
      });

      if (!user) return { reply: "Phone not found. Text JOIN to sign up.", nextState: "idle" };

      const activePlan = user.planHistory[0];
      if (!activePlan) return { reply: "No active plan. Text JOIN to set one up.", nextState: "idle" };

      const monday = getMondayOfThisWeek();
      const sessionsThisWeek = await prisma.workoutSession.count({
        where: { userId: user.id, date: { gte: monday } },
      });
      const nextDayNumber = sessionsThisWeek + 1;

      const workoutDay = activePlan.plan.days.find((d) => d.day === nextDayNumber);
      if (!workoutDay) {
        const distinctDays = new Map<string, (typeof activePlan.plan.days)[number]>();
        for (const d of activePlan.plan.days) {
          if (!distinctDays.has(d.name)) distinctDays.set(d.name, d);
        }
        const options = [...distinctDays.values()];
        const list = options.map((d, i) => `${i + 1}. ${d.name}`).join("\n");
        return {
          reply: `You've already hit all ${activePlan.plan.days.length} sessions this week - nice work! Want a bonus session anyway?\n\n${list}\n\nReply with just the number (e.g. 1).`,
          nextState: "bonus_day_choice",
          context: { userId: user.id, options: options.map((d) => ({ workoutDayId: d.id, name: d.name, exercises: d.exercises })) },
        };
      }

      const goalKey = await getUserGoalKey(user.id);
      const list = workoutDay.exercises.map((e, i) => exerciseLine(e, i, goalKey)).join("\n");

      return {
        reply: `Hey ${user.name}!\nDay ${nextDayNumber} of ${activePlan.plan.days.length} this week: ${workoutDay.name}\n\n${list}\n\nType START when ready.`,
        nextState: "workout_ready",
        context: { userId: user.id, workoutDayId: workoutDay.id, exercises: workoutDay.exercises, exerciseIndex: 0 },
      };
    }

    if (input === "CHANGE") {
      const user = await prisma.user.findUnique({
        where: { phone },
        include: { planHistory: { where: { endDate: null }, include: { plan: true } } },
      });
      if (!user) return { reply: "Phone not found. Text JOIN to sign up.", nextState: "idle" };

      const currentPlan = user.planHistory[0]?.plan;
      const allPlans = await prisma.workoutPlan.findMany();
      const list = allPlans.map((p, i) => `${i + 1}. ${p.name}${currentPlan?.id === p.id ? " (current)" : ""}`).join("\n");

      return {
        reply: `You're on ${currentPlan?.name ?? "no plan"}.\nPick a new split:\n\n${list}\n\nReply with just the number (e.g. 1).`,
        nextState: "changing_plan",
        context: { allPlans, currentUserPlanId: user.planHistory[0]?.id },
      };
    }

    return { reply: "Type JOIN to sign up or HERE to start your workout.", nextState: "idle" };
  }

  // Bonus day — picked an extra session on an off day
  if (state === "bonus_day_choice") {
    const { userId, options } = context as {
      userId: string;
      options: { workoutDayId: string; name: string; exercises: Exercise[] }[];
    };

    const choice = parseInt(input);
    if (!choice || choice < 1 || choice > options.length) {
      return { reply: `Pick a number between 1 and ${options.length}.`, nextState: "bonus_day_choice", context };
    }

    const chosen = options[choice - 1];
    const goalKey = await getUserGoalKey(userId);
    const list = chosen.exercises.map((e, i) => exerciseLine(e, i, goalKey)).join("\n");
    return {
      reply: `Bonus session: ${chosen.name}\n\n${list}\n\nType START when ready.`,
      nextState: "workout_ready",
      context: { userId, workoutDayId: chosen.workoutDayId, exercises: chosen.exercises, exerciseIndex: 0 },
    };
  }

  // Onboarding — collect name
  if (state === "onboarding_name") {
    const name = text.trim();
    const list = GOALS.map((g, i) => `${i + 1}. ${g.label}`).join("\n");
    return {
      reply: `Nice to meet you, ${name}! What's your goal?\n\n${list}\n\nReply with just the number (e.g. 1).`,
      nextState: "onboarding_goal",
      context: { name },
    };
  }

  // Onboarding — pick goal, then ask experience level
  if (state === "onboarding_goal") {
    const choice = parseInt(input);
    const { name } = context as { name: string };
    if (!choice || choice < 1 || choice > GOALS.length) {
      return { reply: `Pick a number between 1 and ${GOALS.length}.`, nextState: "onboarding_goal", context };
    }
    const goal = GOALS[choice - 1];
    const list = EXPERIENCE_TIERS.map((t, i) => `${i + 1}. ${t.label} - ${t.days}`).join("\n");
    return {
      reply: `${goal.label}, love it! What's your experience level?\n\n${list}\n\nReply with just the number (e.g. 1).`,
      nextState: "onboarding_experience",
      context: { name, goal },
    };
  }

  // Onboarding — pick experience tier, auto-assign the matching plan
  if (state === "onboarding_experience") {
    const choice = parseInt(input);
    const { name, goal } = context as { name: string; goal: (typeof GOALS)[number] };
    if (!choice || choice < 1 || choice > EXPERIENCE_TIERS.length) {
      return { reply: `Pick a number between 1 and ${EXPERIENCE_TIERS.length}.`, nextState: "onboarding_experience", context };
    }
    const tier = EXPERIENCE_TIERS[choice - 1];
    const planName = `${tier.key} ${goal.planName}`;
    const plan = await prisma.workoutPlan.findFirst({ where: { name: planName } });
    if (!plan) return { reply: `Something went wrong setting up your plan. Text JOIN to try again.`, nextState: "idle" };

    const user = await prisma.user.create({
      data: { name, phone, planHistory: { create: { planId: plan.id } } },
    });
    return {
      reply: `You're all set, ${name}! You're on ${plan.name} - ${tier.days}.\nType HERE when you're at the gym to start.`,
      nextState: "idle",
      context: { userId: user.id },
    };
  }

  // Workout ready — waiting for START
  if (state === "workout_ready") {
    if (input === "START") {
      const { exercises, userId, workoutDayId } = context as { exercises: Exercise[]; userId: string; workoutDayId: string };
      const session = await prisma.workoutSession.create({ data: { userId, workoutDayId } });
      const first = exercises[0];
      const lastSets = await getLastSets(userId, first.name);
      const referenceSet = await getReferenceSet(userId, first.name);
      const goalKey = await getUserGoalKey(userId);
      return {
        reply: exercisePrompt(first, lastSets, goalKey, referenceSet, exercises.length > 1),
        nextState: "exercise_active",
        context: { ...context, sessionId: session.id, exerciseIndex: 0 },
      };
    }
    return { reply: "Type START when you're ready.", nextState: "workout_ready", context };
  }

  // Exercise active — log sets or skip
  if (state === "exercise_active") {
    const { exercises, sessionId, exerciseIndex, userId } = context as {
      exercises: Exercise[];
      sessionId: string;
      exerciseIndex: number;
      userId: string;
    };
    const current = exercises[exerciseIndex];

    if (input === "MENU" || input === "HEY ARNOLD") {
      const lastSets = await getLastSets(userId, current.name);
      const referenceSet = await getReferenceSet(userId, current.name);
      const goalKey = await getUserGoalKey(userId);
      return {
        reply: `Here's where you're at:\n\n${exercisePrompt(current, lastSets, goalKey, referenceSet, exerciseIndex + 1 < exercises.length)}\n\n(Text HISTORY anytime to see your past workouts.)`,
        nextState: "exercise_active",
        context,
      };
    }

    // BUSY — equipment's taken, not skipping it, just swapping it one spot down
    // so whatever's next gets done first. No log written; this exercise is still
    // pending. Swapping only one position (not moving to the end of the day)
    // keeps it inside its natural body-part cluster — someone doing Chest+Biceps
    // shouldn't end up doing bench press after their biceps are already fried.
    if (input === "BUSY") {
      if (exerciseIndex + 1 >= exercises.length) {
        return {
          reply: "This is your last exercise - nothing to swap it with. Log it, or SKIP if you're not doing it today.",
          nextState: "exercise_active",
          context,
        };
      }
      const reordered = [...exercises];
      [reordered[exerciseIndex], reordered[exerciseIndex + 1]] = [reordered[exerciseIndex + 1], reordered[exerciseIndex]];
      const next = reordered[exerciseIndex];
      const lastSets = await getLastSets(userId, next.name);
      const referenceSet = await getReferenceSet(userId, next.name);
      const goalKey = await getUserGoalKey(userId);
      return {
        reply: `No worries - we'll come back to ${current.name} shortly.\n\n${exercisePrompt(next, lastSets, goalKey, referenceSet, exerciseIndex + 1 < reordered.length)}`,
        nextState: "exercise_active",
        context: { ...context, exercises: reordered },
      };
    }

    let prMessage = "";

    if (input === "SKIP") {
      await prisma.exerciseLog.create({
        data: { sessionId, plannedExerciseId: current.id, order: exerciseIndex + 1, skipped: true },
      });
    } else if (current.type === "cardio") {
      const minutes = input === "DONE" ? current.targetReps : parseMinutes(text);
      if (minutes === null) {
        const format = detectInputFormat(text);
        const reply =
          format === "weighted"
            ? `That looks like weight x reps - this is cardio, just reply with your time in minutes (e.g. 30), or SKIP.`
            : `Reply with how long you went in minutes (e.g. 20 or 35), or SKIP.`;
        return { reply, nextState: "exercise_active", context };
      }
      await prisma.exerciseLog.create({
        data: {
          sessionId,
          plannedExerciseId: current.id,
          order: exerciseIndex + 1,
          skipped: false,
          sets: { create: [{ setNumber: 1, weight: 0, reps: minutes }] },
        },
      });
    } else if (current.type === "bodyweight") {
      const reps = parseReps(text);
      if (!reps) {
        const format = detectInputFormat(text);
        const reply =
          format === "weighted"
            ? `This is a bodyweight exercise - just your reps per set (e.g. 15 12 10), no weight needed.`
            : `Couldn't read that. Reply with your reps per set (e.g. 15 12 10), or SKIP.`;
        return { reply, nextState: "exercise_active", context };
      }
      await prisma.exerciseLog.create({
        data: {
          sessionId,
          plannedExerciseId: current.id,
          order: exerciseIndex + 1,
          skipped: false,
          sets: { create: reps.map((r, i) => ({ setNumber: i + 1, weight: 0, reps: r })) },
        },
      });
    } else {
      const sets = parseSets(text);
      if (!sets) {
        const format = detectInputFormat(text);
        const reply =
          format === "bareNumbers"
            ? `Looks like you're missing the weight - reply with weight x reps (e.g. 150x10), or SKIP.`
            : `Couldn't read that. Use format: 150x10 160x8 170x6\nEach set is weight x reps, separated by spaces.`;
        return { reply, nextState: "exercise_active", context };
      }

      // Check PR against history BEFORE logging today's sets
      const previousBestWeight = await getBestWeightPR(userId, current.name);

      await prisma.exerciseLog.create({
        data: {
          sessionId,
          plannedExerciseId: current.id,
          order: exerciseIndex + 1,
          skipped: false,
          sets: { create: sets },
        },
      });

      const newMaxWeight = Math.max(...sets.map((s) => s.weight));

      const isWeightPR = previousBestWeight === null || newMaxWeight > previousBestWeight;

      // Only a real PR gets called out here — the coaching challenge (recent
      // heavy set vs. target) only ever shows in the next session's opening
      // prompt (see exercisePrompt), not immediately after logging.
      if (isWeightPR && previousBestWeight !== null) {
        prMessage = `\n\nCongrats, new PR! ${newMaxWeight} lbs (up from ${previousBestWeight}).`;
      }
    }

    const nextIndex = exerciseIndex + 1;
    if (nextIndex >= exercises.length) {
      const logs = await prisma.exerciseLog.findMany({
        where: { sessionId },
        include: { sets: { orderBy: { setNumber: "asc" } } },
        orderBy: { order: "asc" },
      });

      const lines = logs.map((log) => {
        const ex = exercises.find((e) => e.id === log.plannedExerciseId);
        const name = ex?.name ?? "Unknown";
        if (log.skipped) return `- ${name}: SKIPPED`;
        if (ex?.type === "cardio") return `- ${name}: ${log.sets[0]?.reps ?? "?"} min`;
        if (ex?.type === "bodyweight") {
          const reps = log.sets.map((s) => s.reps);
          const total = reps.reduce((a, b) => a + b, 0);
          return `- ${name}: ${total} reps (${reps.join(", ")})`;
        }
        const setStr = log.sets.map((s) => `${s.weight}x${s.reps}`).join(" ");
        return `- ${name}: ${setStr}`;
      });

      const totalSets = logs.reduce((sum, log) => sum + (log.skipped ? 0 : log.sets.length), 0);
      const doneCount = logs.filter((l) => !l.skipped).length;

      const reply = [
        `Workout complete! Great work!${prMessage}`,
        ``,
        `Today's session:`,
        ...lines,
        ``,
        `${doneCount} exercise${doneCount !== 1 ? "s" : ""} - ${totalSets} total sets`,
        `See your full history: ${process.env.APP_URL}/history/${userId}`,
        `Type HERE next time you're at the gym.`,
      ].join("\n");

      return { reply, nextState: "idle", context: {} };
    }

    const next = exercises[nextIndex];
    const lastSets = await getLastSets(userId, next.name);
    const referenceSet = await getReferenceSet(userId, next.name);
    const goalKey = await getUserGoalKey(userId);
    return {
      reply: `Done!${prMessage}\n\n${exercisePrompt(next, lastSets, goalKey, referenceSet, nextIndex + 1 < exercises.length)}`,
      nextState: "exercise_active",
      context: { ...context, exerciseIndex: nextIndex },
    };
  }

  // Plan change — pick new plan
  if (state === "changing_plan") {
    const { allPlans, currentUserPlanId } = context as {
      allPlans: { id: string; name: string }[];
      currentUserPlanId: string;
    };
    const choice = parseInt(input);
    if (!choice || choice < 1 || choice > allPlans.length) {
      const list = allPlans.map((p, i) => `${i + 1}. ${p.name}`).join("\n");
      return { reply: `Pick a number:\n\n${list}`, nextState: "changing_plan", context };
    }

    const newPlan = allPlans[choice - 1];

    // Close current plan, open new one
    await prisma.userPlan.update({
      where: { id: currentUserPlanId },
      data: { endDate: new Date() },
    });
    await prisma.userPlan.create({
      data: {
        user: { connect: { phone } },
        plan: { connect: { id: newPlan.id } },
      },
    });

    return {
      reply: `Switched to ${newPlan.name}!\nType HERE when you're at the gym.`,
      nextState: "idle",
      context: {},
    };
  }

  return { reply: "Type JOIN or HERE.", nextState: "idle" };
}
