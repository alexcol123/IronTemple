import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { LOSE_WEIGHT_SPLIT } from "../lib/data/lose-weight";
import { BUILD_MUSCLE_SPLIT } from "../lib/data/build-muscle";
import { GET_STRONGER_SPLIT } from "../lib/data/get-stronger";
import { GLUTE_FOCUS_SPLIT } from "../lib/data/glute-focus";

// Shared test content — same 3 base days (repeated per tier) across all 4 goals,
// so testing doesn't require real goal-specific content yet. See lib/data/shared-test/.
import { SHARED_TEST_BEGINNER_SPLIT } from "../lib/data/shared-test/beginner";
import { SHARED_TEST_INTERMEDIATE_SPLIT } from "../lib/data/shared-test/intermediate";
import { SHARED_TEST_ADVANCED_SPLIT } from "../lib/data/shared-test/advanced";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

async function seed() {
  console.log("Clearing old data...");
  await prisma.setLog.deleteMany({});
  await prisma.exerciseLog.deleteMany({});
  await prisma.workoutSession.deleteMany({});
  await prisma.userPlan.deleteMany({});
  await prisma.smsState.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.plannedExercise.deleteMany({});
  await prisma.workoutDay.deleteMany({});
  await prisma.workoutPlan.deleteMany({});

  console.log("Seeding database...");

  const plans = [
    { name: "Lose Weight", days: LOSE_WEIGHT_SPLIT },
    { name: "Build Muscle", days: BUILD_MUSCLE_SPLIT },
    { name: "Get Stronger", days: GET_STRONGER_SPLIT },
    { name: "Glute Focus", days: GLUTE_FOCUS_SPLIT },

    { name: "Beginner Lose Weight", days: SHARED_TEST_BEGINNER_SPLIT },
    { name: "Beginner Build Muscle", days: SHARED_TEST_BEGINNER_SPLIT },
    { name: "Beginner Get Stronger", days: SHARED_TEST_BEGINNER_SPLIT },
    { name: "Beginner Glute Focus", days: SHARED_TEST_BEGINNER_SPLIT },

    { name: "Intermediate Lose Weight", days: SHARED_TEST_INTERMEDIATE_SPLIT },
    { name: "Intermediate Build Muscle", days: SHARED_TEST_INTERMEDIATE_SPLIT },
    { name: "Intermediate Get Stronger", days: SHARED_TEST_INTERMEDIATE_SPLIT },
    { name: "Intermediate Glute Focus", days: SHARED_TEST_INTERMEDIATE_SPLIT },

    { name: "Advanced Lose Weight", days: SHARED_TEST_ADVANCED_SPLIT },
    { name: "Advanced Build Muscle", days: SHARED_TEST_ADVANCED_SPLIT },
    { name: "Advanced Get Stronger", days: SHARED_TEST_ADVANCED_SPLIT },
    { name: "Advanced Glute Focus", days: SHARED_TEST_ADVANCED_SPLIT },
  ];

  for (const plan of plans) {
    const days = await Promise.all(
      plan.days.map(async (day) => ({
        day: day.day,
        name: day.name,
        muscles: day.muscles,
        exercises: {
          create: await Promise.all(
            day.exercises.map(async (exercise, index) => {
              // Optional — connects to ExerciseLibrary only if a matching name
              // exists there, so a plan exercise with no library entry yet
              // still seeds fine, just without gif/instructions/video for now.
              const libraryMatch = await prisma.exerciseLibrary.findUnique({ where: { name: exercise.name } });
              return {
                name: exercise.name,
                targetSets: exercise.sets,
                targetReps: exercise.reps,
                type: exercise.type ?? "weighted",
                order: index + 1,
                libraryExerciseId: libraryMatch?.id,
              };
            }),
          ),
        },
      })),
    );

    const created = await prisma.workoutPlan.create({
      data: { name: plan.name, days: { create: days } },
    });

    console.log(`Created plan: ${created.name} (${created.id})`);
  }

  console.log("Done.");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
