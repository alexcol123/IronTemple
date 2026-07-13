import "dotenv/config";
import fs from "fs";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// One-time enrichment pass: matches our ExerciseLibrary rows by name against
// the local MIT-licensed exercises.json dataset and fills in real instructions
// where we don't already have any. Text only — media (images/gifs) in that
// dataset is separately licensed (© Gym visual), so this script never touches
// gifUrl/imageUrls.

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

type DatasetRecord = {
  name: string;
  instruction_steps: { en: string[] };
};

function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Hand-verified — the dataset only has equipment/variant-qualified names (e.g.
// "barbell full squat", not "Squat"), so blind fuzzy matching risks picking
// the wrong variant (e.g. a single-leg or assisted version). Checked each of
// these against the dataset directly before mapping.
const EXPLICIT_MAP: Record<string, string> = {
  "Barbell Row": "barbell bent over row",
  "Squat": "barbell full squat",
  "Romanian Deadlift": "barbell romanian deadlift",
  "Standing Calf Raise": "barbell standing calf raise",
  "Wrist Curl": "barbell wrist curl",
  "Reverse Wrist Curl": "barbell reverse wrist curl",
  "Close Grip Bench Press": "barbell close-grip bench press",
  "Tricep Extension": "barbell lying triceps extension",
};

async function run() {
  const raw = fs.readFileSync("/Users/henrymunoz/Desktop/exercise-dataset/data/exercises.json", "utf-8");
  const dataset: DatasetRecord[] = JSON.parse(raw);
  const byName = new Map(dataset.map((d) => [normalize(d.name), d]));

  const ours = await prisma.exerciseLibrary.findMany();
  let filled = 0;
  let skipped = 0;
  const notFound: string[] = [];

  for (const ex of ours) {
    if (ex.instructions.length > 0) {
      skipped++;
      continue;
    }
    const targetName = EXPLICIT_MAP[ex.name] ?? ex.name;
    const match = byName.get(normalize(targetName));
    if (!match) {
      notFound.push(ex.name);
      continue;
    }
    await prisma.exerciseLibrary.update({
      where: { id: ex.id },
      data: { instructions: match.instruction_steps.en },
    });
    console.log(`  Filled: ${ex.name} <- ${match.name}`);
    filled++;
  }

  console.log(`\nFilled ${filled}, skipped ${skipped} (already had instructions), ${notFound.length} not found:`);
  console.log(notFound.join(", "));
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
