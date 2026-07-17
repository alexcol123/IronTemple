import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// One-time addition of exercises found genuinely missing from the entire
// bulk-imported dataset during a "most popular gym exercises" gap audit —
// these aren't just unfeatured, they never existed as rows at all. Video URLs
// sourced via WebSearch, same process as the rest of the featured library.
// Hanging Leg Raise already existed (unfeatured, partial content) — just
// finishing it here alongside the new ones.

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

const NEW_EXERCISES = [
  {
    name: "Face Pull",
    bodyPart: "Shoulders",
    type: "weighted" as const,
    defaultSets: 3,
    defaultReps: 15,
    instructions: [
      "Attach a rope handle to a cable machine set at upper-chest to head height.",
      "Grab the rope with both hands, palms facing each other, and step back until the cable is taut.",
      "Keeping your elbows high and out to the sides, pull the rope toward your face, aiming to bring your hands past either side of your head.",
      "Squeeze your shoulder blades together and pause briefly at the peak of the movement.",
      "Slowly return to the starting position with control.",
      "Repeat for the desired number of repetitions.",
    ],
    videoUrls: ["https://www.youtube.com/watch?v=0Po47vvj9g4"],
  },
  {
    name: "Barbell Standing Overhead Press",
    bodyPart: "Shoulders",
    type: "weighted" as const,
    defaultSets: 3,
    defaultReps: 5,
    instructions: [
      "Stand with your feet shoulder-width apart, holding a barbell at shoulder height with an overhand grip.",
      "Brace your core and keep your ribs stacked over your hips.",
      "Press the bar straight overhead, moving your head slightly back to let the bar pass, then pushing your head through at the top.",
      "Lock out your arms fully overhead with the bar directly above your shoulders.",
      "Lower the bar back down to shoulder height with control.",
      "Repeat for the desired number of repetitions.",
    ],
    videoUrls: ["https://www.youtube.com/watch?v=3VpI0V_9D0Y"],
  },
  {
    name: "Plank",
    bodyPart: "Abs",
    type: "bodyweight" as const,
    defaultSets: 3,
    defaultReps: 30,
    instructions: [
      "Get into a forearm plank position with your elbows directly under your shoulders and forearms flat on the floor.",
      "Extend your legs behind you with only your toes touching the ground, forming a straight line from head to heels.",
      "Brace your core and squeeze your glutes to keep your hips from sagging or piking up.",
      "Keep your neck neutral by looking at a spot on the floor just ahead of your hands.",
      "Hold this position for the target time, breathing steadily throughout.",
      "Rest and repeat for the desired number of sets.",
    ],
    videoUrls: ["https://www.youtube.com/watch?v=A2b2EmIg0dA"],
  },
  {
    name: "Cable Fly",
    bodyPart: "Chest",
    type: "weighted" as const,
    defaultSets: 3,
    defaultReps: 12,
    instructions: [
      "Set both cable pulleys to chest height and attach single-grip handles.",
      "Stand centered between the two towers with a staggered stance, holding a handle in each hand, arms extended out to your sides with a slight bend in the elbows.",
      "Step forward slightly so there's tension on the cables at the start.",
      "Keeping the slight elbow bend fixed, bring your hands together in front of your chest in a wide arcing motion.",
      "Squeeze your chest at the point where your hands meet, then slowly return to the starting position.",
      "Repeat for the desired number of repetitions.",
    ],
    videoUrls: ["https://www.youtube.com/watch?v=ETtXO4FW1EU"],
  },
  {
    name: "Rowing Machine",
    bodyPart: "Cardio",
    type: "cardio" as const,
    defaultSets: 1,
    defaultReps: 15,
    instructions: [
      "Sit on the rower with your feet strapped securely into the footplates and knees bent.",
      "Grab the handle with both hands and lean slightly forward with a flat back.",
      "Drive through your legs first, pushing the seat back, then lean your torso back slightly and pull the handle to your lower ribs.",
      "Reverse the sequence to return: extend your arms, lean your torso forward, then bend your knees to slide back to the starting position.",
      "Keep a steady, controlled rhythm rather than rushing each stroke.",
      "Continue for the target time.",
    ],
    videoUrls: ["https://www.youtube.com/watch?v=6_eLpWiNijE"],
  },
];

async function run() {
  for (const ex of NEW_EXERCISES) {
    const created = await prisma.exerciseLibrary.create({
      data: {
        name: ex.name,
        bodyPart: ex.bodyPart,
        type: ex.type,
        defaultSets: ex.defaultSets,
        defaultReps: ex.defaultReps,
        instructions: ex.instructions,
        videoUrls: ex.videoUrls,
        featured: true,
      },
    });
    console.log(`Created: ${created.name}`);
  }

  const hangingLegRaise = await prisma.exerciseLibrary.update({
    where: { name: "Hanging Leg Raise" },
    data: {
      videoUrls: ["https://www.youtube.com/watch?v=Pr1ieGZ5atk"],
      featured: true,
    },
  });
  console.log(`Updated: ${hangingLegRaise.name}`);
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
