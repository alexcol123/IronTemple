import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { ARNOLD_SPLIT } from "../lib/data/arnold";
import { RONNIE_SPLIT } from "../lib/data/ronnie";
import { FOUNDER_SPLIT } from "../lib/data/founder";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

async function seed() {
  console.log("Seeding database...");

  const plans = [
    { name: "Arnold Split", days: ARNOLD_SPLIT },
    { name: "Ronnie Coleman Split", days: RONNIE_SPLIT },
    { name: "Founder Split", days: FOUNDER_SPLIT },
  ];

  for (const plan of plans) {
    const created = await prisma.workoutPlan.create({
      data: {
        name: plan.name,
        days: {
          create: plan.days.map((day) => ({
            day: day.day,
            name: day.name,
            muscles: day.muscles,
            exercises: {
              create: day.exercises.map((exercise, index) => ({
                name: exercise.name,
                targetSets: exercise.sets,
                targetReps: exercise.reps,
                order: index + 1,
              })),
            },
          })),
        },
      },
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
