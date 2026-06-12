import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

// Base weights + weekly increment per exercise name.
// Week 0 = base, week 1 = base + increment, etc.
const WEIGHTS: Record<string, { base: number; inc: number }> = {
  // Day 1 — Back, Biceps, Calves
  "Deadlift":                         { base: 315, inc: 20 },
  "Barbell Row":                       { base: 185, inc: 10 },
  "T-Bar Row":                         { base: 135, inc: 10 },
  "One Arm Dumbbell Row":              { base: 100, inc: 10 },
  "Standing EZ Bar Curl 21s":          { base: 65,  inc: 5  },
  "One Arm Dumbbell Preacher Curl":    { base: 35,  inc: 2.5 },
  "Seated Dumbbell Hammer Curl":       { base: 40,  inc: 2.5 },
  "Seated Calf Raise":                 { base: 135, inc: 10 },
  "Standing Calf Raise":               { base: 185, inc: 10 },
  "Leg Press Calf Raise":              { base: 270, inc: 10 },
  // Day 2 — Chest, Triceps
  "Dumbbell Bench Press":              { base: 80,  inc: 5  },
  "Incline Dumbbell Bench Press":      { base: 65,  inc: 5  },
  "Flat Dumbbell Fly":                 { base: 40,  inc: 2.5 },
  "Skull Crusher":                     { base: 85,  inc: 5  },
  "Dumbbell Overhead Triceps Extension": { base: 55, inc: 2.5 },
  "Dumbbell Kickback":                 { base: 25,  inc: 2.5 },
  // Day 3 — Legs
  "Barbell Back Squat":                { base: 275, inc: 20 },
  "Leg Press":                         { base: 405, inc: 20 },
  "Lying Leg Curl":                    { base: 100, inc: 5  },
  "Seated Leg Curl":                   { base: 100, inc: 5  },
  "Walking Lunges":                    { base: 95,  inc: 10 },
  // Day 4 — Shoulders, Traps
  "Seated Barbell Shoulder Press":     { base: 135, inc: 10 },
  "Machine Side Raise":                { base: 45,  inc: 5  },
  "Dumbbell Front Raise":              { base: 35,  inc: 2.5 },
  "Standing Cable Reverse Fly":        { base: 30,  inc: 2.5 },
  "Bent Over Cable Reverse Fly":       { base: 25,  inc: 2.5 },
  "Behind The Back Barbell Shrug":     { base: 225, inc: 10 },
  // Day 5 — Back, Biceps, Calves (pulldown focus)
  "Pull Up":                           { base: 0,   inc: 10 },
  "Lat Pulldown":                      { base: 130, inc: 10 },
  "Seated Cable Row":                  { base: 140, inc: 10 },
  // Day 6 — Chest, Triceps (barbell focus)
  "Barbell Bench Press":               { base: 185, inc: 10 },
  "Incline Barbell Bench Press":       { base: 155, inc: 10 },
};

// 4 weeks of Mon–Sat sessions.
// Week 0: May 19–24  |  Week 1: May 26–31
// Week 2: Jun  2–7   |  Week 3: Jun  9–12 (partial — today is Thu Jun 12)
function getSimDates(): { date: Date; weekIndex: number }[] {
  const weekStarts = [
    new Date(2026, 4, 19), // May 19 Mon
    new Date(2026, 4, 26), // May 26 Mon
    new Date(2026, 5,  2), // Jun  2 Mon
    new Date(2026, 5,  9), // Jun  9 Mon
  ];
  const today = new Date(2026, 5, 12); // Jun 12 (today per system date)
  const result: { date: Date; weekIndex: number }[] = [];

  for (let wi = 0; wi < weekStarts.length; wi++) {
    for (let d = 0; d < 6; d++) { // Mon (0-offset) through Sat (5-offset)
      const date = new Date(weekStarts[wi]);
      date.setDate(date.getDate() + d);
      date.setHours(0, 0, 0, 0); // midnight so date <= today works for same-day
      if (date <= today) result.push({ date, weekIndex: wi });
    }
  }
  return result;
}

async function main() {
  const user = await prisma.user.findUnique({
    where: { phone: "8044326474" },
    include: {
      planHistory: {
        where: { endDate: null },
        include: {
          plan: {
            include: {
              days: {
                include: { exercises: { orderBy: { order: "asc" } } },
              },
            },
          },
        },
      },
    },
  });

  if (!user) throw new Error("User 8044326474 not found");
  const activePlan = user.planHistory[0];
  if (!activePlan) throw new Error("No active plan found for user");

  console.log(`User: ${user.name}`);
  console.log(`Plan: ${activePlan.plan.name}`);

  // Map workout day number (1–6) → DB WorkoutDay
  const dayMap = new Map(activePlan.plan.days.map((d) => [d.day, d]));

  // Skip dates that already have a session
  const existing = await prisma.workoutSession.findMany({
    where: { userId: user.id },
    select: { date: true },
  });
  const existingDates = new Set(existing.map((s) => s.date.toDateString()));

  const simDates = getSimDates();
  let created = 0;
  let skipped = 0;

  for (const { date, weekIndex } of simDates) {
    if (existingDates.has(date.toDateString())) {
      console.log(`  skip  ${date.toDateString()} (already exists)`);
      skipped++;
      continue;
    }

    // JS getDay(): 1=Mon … 6=Sat  ←→  Ronnie split day numbers 1–6
    const workoutDayNumber = date.getDay();
    const workoutDay = dayMap.get(workoutDayNumber);
    if (!workoutDay) continue;

    const session = await prisma.workoutSession.create({
      data: { userId: user.id, workoutDayId: workoutDay.id, date },
    });

    for (const exercise of workoutDay.exercises) {
      const cfg = WEIGHTS[exercise.name] ?? { base: 45, inc: 5 };
      const weight = cfg.base + weekIndex * cfg.inc;

      const log = await prisma.exerciseLog.create({
        data: {
          sessionId: session.id,
          plannedExerciseId: exercise.id,
          order: exercise.order,
          skipped: false,
        },
      });

      for (let setNum = 1; setNum <= exercise.targetSets; setNum++) {
        await prisma.setLog.create({
          data: {
            exerciseLogId: log.id,
            setNumber: setNum,
            weight,
            reps: exercise.targetReps,
          },
        });
      }
    }

    console.log(`  ✓  ${date.toDateString()}  —  ${workoutDay.name}  (week ${weekIndex + 1}, +${weekIndex * 10}lb avg)`);
    created++;
  }

  console.log(`\nDone — ${created} sessions created, ${skipped} skipped.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
