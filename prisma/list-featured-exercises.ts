import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// One-off script: prints the current `featured` pool grouped by body part,
// for building the 4 real goal-based workout plans around this curated set.

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

const BODY_PART_ORDER = [
  "Chest", "Back", "Shoulders", "Traps", "Biceps", "Triceps",
  "Forearms", "Legs", "Glutes", "Abs", "Cardio",
];

async function run() {
  const exercises = await prisma.exerciseLibrary.findMany({
    where: { featured: true },
    orderBy: { name: "asc" },
  });

  const lines: string[] = [];
  lines.push("# Most Common Exercises in Database — Featured Only");
  lines.push("");
  lines.push(`Total featured: ${exercises.length}`);
  lines.push("");
  lines.push(
    "This is the curated pool of exercises to build the 4 real goal-based workout plans around (Lose Weight, Build Muscle, Get Stronger, General Fitness).",
  );
  lines.push("");

  for (const bp of BODY_PART_ORDER) {
    const list = exercises.filter((e) => e.bodyPart === bp);
    lines.push(`## ${bp} (${list.length})`);
    lines.push("");
    for (const ex of list) {
      lines.push(`- ${ex.name} — ${ex.type}, default ${ex.defaultSets}x${ex.defaultReps}`);
    }
    lines.push("");
  }

  const fs = await import("fs");
  fs.writeFileSync("most-common-exercises-in-data.md", lines.join("\n"));
  console.log(`Wrote ${exercises.length} featured exercises to most-common-exercises-in-data.md`);
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
