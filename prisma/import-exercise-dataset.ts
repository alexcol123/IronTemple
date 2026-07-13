import "dotenv/config";
import fs from "fs";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// One-time bulk import: the local exercise-dataset (MIT-licensed text/instructions,
// media © Gym visual per NOTICE.md — see CLAUDE.md Feature Backlog for the
// planned Supabase migration) mapped into ExerciseLibrary. Skips any name
// already in the database so it never overwrites our hand-curated/verified
// entries (Bench Press, Preacher Curl, etc.) — only adds what's missing.
// English + Spanish instructions only; every other language in the source
// dataset is dropped on import, not stored.

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

type DatasetRecord = {
  name: string;
  target: string;
  equipment: string;
  instruction_steps: { en: string[]; es: string[] };
  image: string;
  gif_url: string;
};

// Verified against the real distinct `target` values in this dataset (19 total).
const TARGET_TO_BODY_PART: Record<string, string> = {
  "pectorals": "Chest",
  "serratus anterior": "Chest",
  "upper back": "Back",
  "lats": "Back",
  "spine": "Back",
  "delts": "Shoulders",
  "traps": "Traps",
  "levator scapulae": "Traps",
  "biceps": "Biceps",
  "triceps": "Triceps",
  "forearms": "Forearms",
  "quads": "Legs",
  "calves": "Legs",
  "hamstrings": "Legs",
  "adductors": "Legs",
  "abductors": "Legs",
  "glutes": "Glutes",
  "abs": "Abs",
  "cardiovascular system": "Cardio",
};

function titleCase(name: string): string {
  return name
    .split(" ")
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

async function run() {
  const raw = fs.readFileSync("/Users/henrymunoz/Desktop/exercise-dataset/data/exercises.json", "utf-8");
  const dataset: DatasetRecord[] = JSON.parse(raw);

  const existingNames = new Set((await prisma.exerciseLibrary.findMany({ select: { name: true } })).map((e) => e.name.toLowerCase()));
  const seenThisRun = new Set<string>();

  let created = 0;
  let skippedExisting = 0;
  let skippedNoMapping = 0;

  for (const record of dataset) {
    const displayName = titleCase(record.name);
    const key = displayName.toLowerCase();

    if (existingNames.has(key) || seenThisRun.has(key)) {
      skippedExisting++;
      continue;
    }

    const bodyPart = TARGET_TO_BODY_PART[record.target];
    if (!bodyPart) {
      skippedNoMapping++;
      continue;
    }

    const type = bodyPart === "Cardio" ? "cardio" : record.equipment === "body weight" ? "bodyweight" : "weighted";
    const imageFile = record.image.split("/").pop();
    const gifFile = record.gif_url.split("/").pop();

    await prisma.exerciseLibrary.create({
      data: {
        name: displayName,
        bodyPart,
        type,
        defaultSets: 3,
        defaultReps: 5,
        target: record.target,
        instructions: record.instruction_steps.en ?? [],
        instructionsEs: record.instruction_steps.es ?? [],
        gifUrl: gifFile ? `/exercises/videos/${gifFile}` : null,
        imageUrls: imageFile ? [`/exercises/images/${imageFile}`] : [],
      },
    });
    seenThisRun.add(key);
    created++;
  }

  console.log(`Created ${created} new exercises.`);
  console.log(`Skipped ${skippedExisting} already-existing names.`);
  console.log(`Skipped ${skippedNoMapping} with no target mapping.`);
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
