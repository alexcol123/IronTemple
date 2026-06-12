import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function getTodayWorkoutDay(simDay?: number): number {
  const map: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 0: 0 };
  const day = simDay !== undefined ? simDay : new Date().getDay();
  return map[day];
}

type SetEntry = { setNumber: number; weight: number; reps: number };

// Parses "150x10 160x8 170x6" or "150 x 10, 160 x 8" into set objects
function parseSets(text: string): SetEntry[] | null {
  // Normalize: lowercase, replace commas with spaces, collapse whitespace around x
  const normalized = text.toLowerCase().replace(/,/g, " ").replace(/\s*x\s*/g, "x").trim();
  const tokens = normalized.split(/\s+/);

  const sets: SetEntry[] = [];
  for (const token of tokens) {
    const parts = token.split("x");
    if (parts.length !== 2) return null;
    const weight = parseFloat(parts[0]);
    const reps = parseInt(parts[1]);
    if (isNaN(weight) || isNaN(reps) || weight <= 0 || reps <= 0) return null;
    sets.push({ setNumber: sets.length + 1, weight, reps });
  }

  return sets.length > 0 ? sets : null;
}

type Exercise = { id: string; name: string; targetSets: number; targetReps: number };

function exercisePrompt(exercise: Exercise, lastSets?: SetEntry[]) {
  let msg = `${exercise.name} — ${exercise.targetSets} sets x ${exercise.targetReps} reps`;
  if (lastSets && lastSets.length > 0) {
    const summary = lastSets.map((s) => `${s.weight}x${s.reps}`).join(" ");
    msg += `\nLast time: ${summary}`;
  }
  msg += `\nLog your sets (e.g. 150x10 160x8) or type SKIP`;
  return msg;
}

// Fetches the last session's sets for a specific exercise, for a specific user
async function getLastSets(userId: string, plannedExerciseId: string): Promise<SetEntry[]> {
  const lastLog = await prisma.exerciseLog.findFirst({
    where: {
      plannedExerciseId,
      skipped: false,
      session: { userId },
    },
    orderBy: { session: { date: "desc" } },
    include: { sets: { orderBy: { setNumber: "asc" } } },
  });

  if (!lastLog) return [];
  return lastLog.sets.map((s) => ({ setNumber: s.setNumber, weight: s.weight, reps: s.reps }));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { phone, text, state, context = {}, simDay } = body;
  const input = text.trim().toUpperCase();

  // Idle — entry point
  if (state === "idle") {
    if (input === "JOIN") {
      const existing = await prisma.user.findUnique({ where: { phone } });
      if (existing) {
        return NextResponse.json({
          reply: `Already signed up as ${existing.name}. Type HERE to start today's workout.`,
          nextState: "idle",
        });
      }
      return NextResponse.json({ reply: "Welcome to Iron Temple 🏋️ What's your name?", nextState: "onboarding_name" });
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

      if (!user) return NextResponse.json({ reply: "Phone not found. Text JOIN to sign up.", nextState: "idle" });

      const activePlan = user.planHistory[0];
      if (!activePlan) return NextResponse.json({ reply: "No active plan. Text JOIN to set one up.", nextState: "idle" });

      const dayNumber = getTodayWorkoutDay(simDay);
      if (dayNumber === 0) return NextResponse.json({ reply: "Today is Sunday — rest day. See you tomorrow 💪", nextState: "idle" });

      const workoutDay = activePlan.plan.days.find((d) => d.day === dayNumber);
      if (!workoutDay) return NextResponse.json({ reply: "No workout scheduled for today.", nextState: "idle" });

      const list = workoutDay.exercises.map((e, i) => `${i + 1}. ${e.name} — ${e.targetSets}x${e.targetReps}`).join("\n");

      return NextResponse.json({
        reply: `Hey ${user.name}! 👋\nDay ${dayNumber}: ${workoutDay.name}\n\n${list}\n\nType START when ready.`,
        nextState: "workout_ready",
        context: { userId: user.id, workoutDayId: workoutDay.id, exercises: workoutDay.exercises, exerciseIndex: 0 },
      });
    }

    if (input === "CHANGE") {
      const user = await prisma.user.findUnique({
        where: { phone },
        include: { planHistory: { where: { endDate: null }, include: { plan: true } } },
      });
      if (!user) return NextResponse.json({ reply: "Phone not found. Text JOIN to sign up.", nextState: "idle" });

      const currentPlan = user.planHistory[0]?.plan;
      const allPlans = await prisma.workoutPlan.findMany();
      const list = allPlans.map((p, i) => `${i + 1}. ${p.name}${currentPlan?.id === p.id ? " (current)" : ""}`).join("\n");

      return NextResponse.json({
        reply: `You're on ${currentPlan?.name ?? "no plan"}.\nPick a new split:\n\n${list}`,
        nextState: "changing_plan",
        context: { allPlans, currentUserPlanId: user.planHistory[0]?.id },
      });
    }

    return NextResponse.json({ reply: "Type JOIN to sign up or HERE to start your workout.", nextState: "idle" });
  }

  // Onboarding — collect name
  if (state === "onboarding_name") {
    const name = text.trim();
    const plans = await prisma.workoutPlan.findMany();
    const list = plans.map((p, i) => `${i + 1}. ${p.name}`).join("\n");
    return NextResponse.json({
      reply: `Nice to meet you, ${name}!\nPick your split:\n\n${list}`,
      nextState: "onboarding_plan",
      context: { name, plans },
    });
  }

  // Onboarding — pick plan
  if (state === "onboarding_plan") {
    const choice = parseInt(input);
    const { name, plans } = context as { name: string; plans: { id: string; name: string }[] };
    if (!choice || choice < 1 || choice > plans.length) {
      return NextResponse.json({ reply: `Pick a number between 1 and ${plans.length}.`, nextState: "onboarding_plan", context });
    }
    const plan = plans[choice - 1];
    const user = await prisma.user.create({
      data: { name, phone, planHistory: { create: { planId: plan.id } } },
    });
    return NextResponse.json({
      reply: `You're all set, ${name}! Following ${plan.name}.\nType HERE when you're at the gym to start your workout.`,
      nextState: "idle",
      context: { userId: user.id },
    });
  }

  // Workout ready — waiting for START
  if (state === "workout_ready") {
    if (input === "START") {
      const { exercises, userId, workoutDayId } = context as { exercises: Exercise[]; userId: string; workoutDayId: string };
      const session = await prisma.workoutSession.create({ data: { userId, workoutDayId } });
      const first = exercises[0];
      const lastSets = await getLastSets(userId, first.id);
      return NextResponse.json({
        reply: exercisePrompt(first, lastSets),
        nextState: "exercise_active",
        context: { ...context, sessionId: session.id, exerciseIndex: 0 },
      });
    }
    return NextResponse.json({ reply: "Type START when you're ready.", nextState: "workout_ready", context });
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

    if (input === "SKIP") {
      await prisma.exerciseLog.create({
        data: { sessionId, plannedExerciseId: current.id, order: exerciseIndex + 1, skipped: true },
      });
    } else {
      const sets = parseSets(text);
      if (!sets) {
        return NextResponse.json({
          reply: `Couldn't read that. Use format: 150x10 160x8 170x6\nEach set is weight x reps, separated by spaces.`,
          nextState: "exercise_active",
          context,
        });
      }
      await prisma.exerciseLog.create({
        data: {
          sessionId,
          plannedExerciseId: current.id,
          order: exerciseIndex + 1,
          skipped: false,
          sets: { create: sets },
        },
      });
    }

    const nextIndex = exerciseIndex + 1;
    if (nextIndex >= exercises.length) {
      return NextResponse.json({
        reply: `Workout complete! Great work 💪\nType HERE next time you're at the gym.`,
        nextState: "idle",
        context: {},
      });
    }

    const next = exercises[nextIndex];
    const lastSets = await getLastSets(userId, next.id);
    return NextResponse.json({
      reply: `✓ Done!\n\n${exercisePrompt(next, lastSets)}`,
      nextState: "exercise_active",
      context: { ...context, exerciseIndex: nextIndex },
    });
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
      return NextResponse.json({ reply: `Pick a number:\n\n${list}`, nextState: "changing_plan", context });
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

    return NextResponse.json({
      reply: `Switched to ${newPlan.name}! 💪\nType HERE when you're at the gym.`,
      nextState: "idle",
      context: {},
    });
  }

  return NextResponse.json({ reply: "Type JOIN or HERE.", nextState: "idle" });
}
