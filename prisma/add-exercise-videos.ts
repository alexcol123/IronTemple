import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { EXERCISE_VIDEO_MAP } from "./exercise-video-map";

// One-time enrichment: bulk-adds a real YouTube tutorial/demo video to every
// featured exercise's videoUrls, sourced via WebSearch against the featured
// pool in most-common-exercises-in-data.md. Only ever adds — never overwrites
// gifUrl/instructions/imageUrls, and skips a name if it already has a video.

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

async function run() {
  const names = Object.keys(EXERCISE_VIDEO_MAP);
  console.log(`Video map has ${names.length} entries.`);

  let updated = 0;
  let alreadyHadVideo = 0;
  const notFound: string[] = [];

  for (const name of names) {
    const existing = await prisma.exerciseLibrary.findUnique({ where: { name } });
    if (!existing) {
      notFound.push(name);
      continue;
    }
    if (existing.videoUrls.length > 0) {
      alreadyHadVideo++;
      continue;
    }
    await prisma.exerciseLibrary.update({
      where: { name },
      data: { videoUrls: [EXERCISE_VIDEO_MAP[name]] },
    });
    updated++;
  }

  console.log(`Updated: ${updated}`);
  console.log(`Already had a video (skipped): ${alreadyHadVideo}`);
  console.log(`Not found in DB (name mismatch): ${notFound.length}`);
  if (notFound.length > 0) console.log(notFound.join(", "));
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
