import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { BUILD_MUSCLE_BEGINNER_SPLIT } from "../lib/data/build-muscle-beginner";
import { BUILD_MUSCLE_INTERMEDIATE_SPLIT } from "../lib/data/build-muscle-intermediate";
import { BUILD_MUSCLE_ADVANCED_SPLIT } from "../lib/data/build-muscle-advanced";
import { GET_STRONGER_BEGINNER_SPLIT } from "../lib/data/get-stronger-beginner";
import { GET_STRONGER_INTERMEDIATE_SPLIT } from "../lib/data/get-stronger-intermediate";
import { GET_STRONGER_ADVANCED_SPLIT } from "../lib/data/get-stronger-advanced";
import { GLUTE_FOCUS_BEGINNER_SPLIT } from "../lib/data/glute-focus-beginner";
import { GLUTE_FOCUS_INTERMEDIATE_SPLIT } from "../lib/data/glute-focus-intermediate";
import { GLUTE_FOCUS_ADVANCED_SPLIT } from "../lib/data/glute-focus-advanced";
import { LOSE_WEIGHT_BEGINNER_SPLIT } from "../lib/data/lose-weight-beginner";
import { LOSE_WEIGHT_INTERMEDIATE_SPLIT } from "../lib/data/lose-weight-intermediate";
import { LOSE_WEIGHT_ADVANCED_SPLIT } from "../lib/data/lose-weight-advanced";

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
    { name: "Beginner Lose Weight", days: LOSE_WEIGHT_BEGINNER_SPLIT },
    { name: "Beginner Build Muscle", days: BUILD_MUSCLE_BEGINNER_SPLIT },
    { name: "Beginner Get Stronger", days: GET_STRONGER_BEGINNER_SPLIT },
    { name: "Beginner Glute Focus", days: GLUTE_FOCUS_BEGINNER_SPLIT },

    { name: "Intermediate Lose Weight", days: LOSE_WEIGHT_INTERMEDIATE_SPLIT },
    { name: "Intermediate Build Muscle", days: BUILD_MUSCLE_INTERMEDIATE_SPLIT },
    { name: "Intermediate Get Stronger", days: GET_STRONGER_INTERMEDIATE_SPLIT },
    { name: "Intermediate Glute Focus", days: GLUTE_FOCUS_INTERMEDIATE_SPLIT },

    { name: "Advanced Lose Weight", days: LOSE_WEIGHT_ADVANCED_SPLIT },
    { name: "Advanced Build Muscle", days: BUILD_MUSCLE_ADVANCED_SPLIT },
    { name: "Advanced Get Stronger", days: GET_STRONGER_ADVANCED_SPLIT },
    { name: "Advanced Glute Focus", days: GLUTE_FOCUS_ADVANCED_SPLIT },
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
