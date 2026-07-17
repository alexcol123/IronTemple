import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// One-time seed: creates a test user on the real "Advanced Get Stronger" plan
// with 5 weeks of backdated, realistic session history — deliberately built
// so a few lifts cross the real progression threshold (see
// calculateNextSuggestedWeight / getEffectiveTargetReps in lib/sms-engine.ts)
// with a couple of misses along the way, not a flawless straight line, so the
// weekly-recap page (and the "best of last 2 sessions" resilience rule) has
// something real to compute against instead of hand-typed mock data.
//
// Test phone: +15555559100 (fake 555 number, same convention as other test
// data in this project). Re-runnable — clears this specific user first.

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

const TEST_PHONE = "+15555559100";

// weight/reps per week for the "hero" lifts, on the day's top set — everything
// else in that day gets modest, roughly-flat filler sets since this is only
// testing the specific lifts a real athlete would actually watch closely.
const SQUAT = [
  { weight: 210, reps: 5 },
  { weight: 215, reps: 5 },
  { weight: 220, reps: 4 }, // missed target — no jump next week
  { weight: 220, reps: 5 }, // retried at same weight, hit it (best-of-last-2 resilience)
  { weight: 225, reps: 5 }, // new PR — "this week"
];
const BENCH = [
  { weight: 110, reps: 5 },
  { weight: 115, reps: 5 },
  { weight: 120, reps: 5 },
  { weight: 125, reps: 5 },
  { weight: 130, reps: 5 }, // new PR — "this week"
];
const DEADLIFT = [
  { weight: 300, reps: 3 },
  { weight: 305, reps: 3 },
  { weight: 310, reps: 2 }, // missed
  { weight: 310, reps: 3 }, // recovered
  { weight: 315, reps: 3 },
];
const PRESS = [
  { weight: 85, reps: 5 },
  { weight: 90, reps: 5 },
  { weight: 90, reps: 4 }, // missed
  { weight: 95, reps: 5 },
  { weight: 95, reps: 5 }, // holding, no jump this week — realistic, not everything climbs every week
];
const PULLUP_REPS = [8, 9, 8, 10, 12]; // bodyweight — PR tracked by reps, not weight

function weeksAgoMonday(weeksAgo: number): Date {
  const now = new Date();
  const day = now.getDay();
  const mondayThisWeek = new Date(now);
  mondayThisWeek.setDate(now.getDate() - ((day + 6) % 7));
  mondayThisWeek.setHours(9, 0, 0, 0);
  const target = new Date(mondayThisWeek);
  target.setDate(mondayThisWeek.getDate() - weeksAgo * 7);
  return target;
}

// The 15th of the month, N months back — set the day-of-month before
// adjusting the month so short months (e.g. Feb) never roll a late date
// into the following month.
function monthsAgoDate(monthsAgo: number): Date {
  const d = new Date();
  d.setDate(15);
  d.setMonth(d.getMonth() - monthsAgo);
  d.setHours(9, 0, 0, 0);
  return d;
}

async function run() {
  await prisma.setLog.deleteMany({ where: { exerciseLog: { session: { user: { phone: TEST_PHONE } } } } });
  await prisma.exerciseLog.deleteMany({ where: { session: { user: { phone: TEST_PHONE } } } });
  await prisma.workoutSession.deleteMany({ where: { user: { phone: TEST_PHONE } } });
  await prisma.userPlan.deleteMany({ where: { user: { phone: TEST_PHONE } } });
  await prisma.user.deleteMany({ where: { phone: TEST_PHONE } });

  const user = await prisma.user.create({ data: { name: "John Doe", phone: TEST_PHONE } });

  const plan = await prisma.workoutPlan.findFirstOrThrow({
    where: { name: "Advanced Get Stronger" },
    include: { days: { orderBy: { day: "asc" }, include: { exercises: { where: { active: true }, orderBy: { order: "asc" } } } } },
  });

  await prisma.userPlan.create({ data: { userId: user.id, planId: plan.id } });

  const [squatDay, benchDay, deadliftDay, pressDay, accessoryDay] = plan.days;

  for (let week = 4; week >= 0; week--) {
    const monday = weeksAgoMonday(week);
    const dayOffset = (n: number) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + n);
      return d;
    };

    // Week 2 deliberately skips Accessory Day — real test data for the
    // "gentle note about a miss" copy, kept away from the current/most
    // recent week so that one still reads as a clean, fully-hit week.
    const skipAccessory = week === 2;

    await seedDay(user.id, squatDay, dayOffset(0), {
      [squatDay.exercises[0].id]: [SQUAT[4 - week]], // Squat
      [squatDay.exercises[2].id]: [{ weight: 0, reps: PULLUP_REPS[4 - week] }], // Pull-up
    });

    await seedDay(user.id, benchDay, dayOffset(1), {
      [benchDay.exercises[0].id]: [BENCH[4 - week]], // Bench Press
    });

    await seedDay(user.id, deadliftDay, dayOffset(3), {
      [deadliftDay.exercises[0].id]: [DEADLIFT[4 - week]], // Barbell Deadlift
    });

    await seedDay(user.id, pressDay, dayOffset(4), {
      [pressDay.exercises[0].id]: [PRESS[4 - week]], // Barbell Seated Overhead Press
    });

    if (!skipAccessory) {
      await seedDay(user.id, accessoryDay, dayOffset(5), {});
    }

    console.log(`Week ${5 - week} seeded (${monday.toDateString()})${skipAccessory ? " — Accessory Day skipped" : ""}`);
  }

  // Long-tail history — one lightweight session per month, 24 months back
  // down to 2 months ago (the detailed weekly loop above already covers the
  // most recent ~5 weeks). This exists purely to give the monthly rollup
  // chart (/api/exercise-history) more than 2 data points to show — real
  // multi-year progress, not just the recent weekly detail. `end` for each
  // lift matches that lift's earliest recent-week value so the two blocks
  // meet without a discontinuity; one deliberate 2-month plateau (11-12
  // months back) breaks up what would otherwise be a suspiciously smooth ramp.
  const LONG_HISTORY = [
    { day: squatDay, exerciseIndex: 0, start: 155, end: 210, reps: 5 }, // Squat
    { day: benchDay, exerciseIndex: 0, start: 95, end: 110, reps: 5 }, // Bench Press
    { day: deadliftDay, exerciseIndex: 0, start: 225, end: 300, reps: 3 }, // Barbell Deadlift
    { day: pressDay, exerciseIndex: 0, start: 60, end: 85, reps: 5 }, // Barbell Seated Overhead Press
  ];

  for (let monthsAgo = 23; monthsAgo >= 2; monthsAgo--) {
    const date = monthsAgoDate(monthsAgo);
    const session = await prisma.workoutSession.create({ data: { userId: user.id, workoutDayId: squatDay.id, date } });

    let t = (23 - monthsAgo) / 21;
    if (monthsAgo === 11 || monthsAgo === 12) t = (23 - 13) / 21; // plateau

    for (let i = 0; i < LONG_HISTORY.length; i++) {
      const { day, exerciseIndex, start, end, reps } = LONG_HISTORY[i];
      const ex = day.exercises[exerciseIndex];
      const weight = Math.round((start + (end - start) * t) / 5) * 5;
      const exerciseLog = await prisma.exerciseLog.create({
        data: { sessionId: session.id, order: i + 1, plannedExerciseId: ex.id },
      });
      await prisma.setLog.create({ data: { exerciseLogId: exerciseLog.id, setNumber: 1, weight, reps } });
    }

    console.log(`Long-history month seeded: ${monthsAgo} months ago (${date.toDateString()})`);
  }

  console.log(`\nDone. Test user: ${user.name} (${user.id}), phone ${TEST_PHONE}`);
}

// Creates one WorkoutSession for a day, logging every active exercise. `hero`
// maps a specific plannedExerciseId to its top-set weight/reps for this week;
// everything else in the day gets flat, modest filler sets (3 sets, +2.5%
// weight per week off a plausible baseline) since only the hero lifts are
// being tested for real progression math.
async function seedDay(
  userId: string,
  day: { id: string; exercises: { id: string; name: string; targetSets: number; targetReps: number; type: string }[] },
  date: Date,
  hero: Record<string, { weight: number; reps: number }[]>,
) {
  const session = await prisma.workoutSession.create({
    data: { userId, workoutDayId: day.id, date },
  });

  for (let i = 0; i < day.exercises.length; i++) {
    const ex = day.exercises[i];
    const exerciseLog = await prisma.exerciseLog.create({
      data: { sessionId: session.id, order: i + 1, plannedExerciseId: ex.id },
    });

    if (hero[ex.id]) {
      const { weight, reps } = hero[ex.id][0];
      await prisma.setLog.createMany({
        data: Array.from({ length: ex.targetSets }, (_, s) => ({
          exerciseLogId: exerciseLog.id,
          setNumber: s + 1,
          weight,
          reps: s === ex.targetSets - 1 ? reps : Math.max(reps - 1, 1), // top set last, matches real SMS logging order
        })),
      });
    } else {
      // Filler: modest, roughly-flat sets so every session has real data.
      const baseWeight = ex.type === "bodyweight" ? 0 : 45;
      await prisma.setLog.createMany({
        data: Array.from({ length: ex.targetSets }, (_, s) => ({
          exerciseLogId: exerciseLog.id,
          setNumber: s + 1,
          weight: baseWeight,
          reps: Math.min(ex.targetReps, 12),
        })),
      });
    }
  }
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
