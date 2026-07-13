import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Drops these 19 of the original 26 hand-curated exercises from "featured" —
// each has a bulk-imported twin (same or near-identical movement) already
// featured with real content, so keeping the empty original featured too was
// just a redundant, content-less duplicate in the same list.

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

const UNFEATURE: string[] = [
  "Push-ups", "Barbell Row", "Lat Pulldown", "Pull-ups", "Shoulder Press", "Lateral Raise",
  "Close Grip Bench Press", "Tricep Extension", "Wrist Curl", "Reverse Wrist Curl", "Squat",
  "Leg Press", "Romanian Deadlift", "Standing Calf Raise", "Hip Thrust", "Crunches",
  "Hanging Leg Raise", "Treadmill", "Stairs",
];

async function run() {
  const result = await prisma.exerciseLibrary.updateMany({
    where: { name: { in: UNFEATURE } },
    data: { featured: false },
  });
  console.log(`Unfeatured ${result.count} of ${UNFEATURE.length} exercises.`);
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
