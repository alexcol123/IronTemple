import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// One-time curation pass: marks the exercises hand-picked across all 11 body
// parts (with a second advisor review round per body part) as featured=true.
// Everything else defaults to featured=false and shows only under "See all"
// in the picker — there's no real usage data yet to sort by, so this list is
// pure human judgment, same as the original 26 hand-curated exercises.

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

const FEATURED: string[] = [
  // Chest
  "Bench Press", "Barbell Bench Press", "Barbell Incline Bench Press", "Barbell Decline Bench Press",
  "Smith Bench Press", "Dumbbell Bench Press", "Incline Dumbbell Press", "Dumbbell Decline Bench Press",
  "Dumbbell Fly", "Dumbbell Incline Fly", "Cable Cross-over Variation", "Cable Decline Fly",
  "Cable Incline Fly", "Lever Chest Press", "Lever Seated Fly", "Chest Dip",
  "Assisted Chest Dip (kneeling)", "Dumbbell Pullover", "Push-up", "Push-ups",
  "Incline Push-up", "Decline Push-up", "Kneeling Push-up (male)", "Clap Push Up",
  "Wide Hand Push Up", "Archer Push Up", "Single Arm Push-up",

  // Back
  "Pull-up", "Pull-ups", "Chin-up", "Wide Grip Pull-up", "Close Grip Chin-up",
  "Chin-ups (narrow Parallel Grip)", "Assisted Pull-up", "Weighted Pull-up", "Lat Pulldown",
  "Cable Lateral Pulldown With V-bar", "Cable Underhand Pulldown", "Cable Straight Arm Pulldown",
  "Barbell Row", "Barbell Pendlay Row", "Barbell One Arm Bent Over Row", "Barbell Reverse Grip Bent Over Row",
  "Dumbbell Bent Over Row", "Dumbbell One Arm Bent-over Row", "Dumbbell Incline Row",
  "Cable Seated Row", "Cable Straight Back Seated Row", "Cable Seated Wide-grip Row",
  "Lever T Bar Row", "Lever Seated Row", "Lever Bent Over Row", "Smith Bent Over Row",
  "Kettlebell Alternating Renegade Row", "Hyperextension", "Lever Back Extension",
  "Inverted Row", "Muscle Up", "Lever Pullover", "Medicine Ball Overhead Slam", "Barbell Pullover",

  // Shoulders
  "Shoulder Press", "Barbell Seated Overhead Press", "Dumbbell Seated Shoulder Press",
  "Dumbbell Arnold Press", "Dumbbell Push Press", "Smith Shoulder Press", "Lever Shoulder Press",
  "Cable Shoulder Press", "Lateral Raise", "Dumbbell Lateral Raise", "Cable Lateral Raise",
  "Dumbbell Seated Lateral Raise", "Cable One Arm Lateral Raise", "Lever Lateral Raise",
  "Dumbbell Reverse Fly", "Cable Standing Cross-over High Reverse Fly", "Lever Seated Reverse Fly",
  "Dumbbell Incline Rear Lateral Raise", "Cable Standing Rear Delt Row (with Rope)", "Barbell Rear Delt Row",
  "Dumbbell Rear Lateral Raise", "Dumbbell Front Raise", "Barbell Front Raise", "Barbell Upright Row",
  "Dumbbell Upright Row", "Smith Upright Row", "Barbell Thruster", "Kettlebell One Arm Snatch",
  "Battling Ropes", "Kettlebell Arnold Press",

  // Traps
  "Barbell Shrug", "Dumbbell Shrug", "Kettlebell Sumo High Pull", "Smith Shrug", "Smith Back Shrug",
  "Lever Shrug", "Dumbbell Incline Shrug", "Dumbbell Decline Shrug", "Band Shrug",
  "Scapular Pull-up", "Cable Shrug", "Scapula Dips",

  // Biceps
  "Barbell Curl", "Dumbbell Biceps Curl", "Dumbbell Seated Bicep Curl", "Ez Barbell Curl",
  "Dumbbell Zottman Curl", "Barbell Drag Curl", "Dumbbell Alternate Biceps Curl", "Dumbbell Hammer Curl",
  "Dumbbell Cross Body Hammer Curl", "Dumbbell Incline Hammer Curl", "Cable Hammer Curl (with Rope)",
  "Dumbbell Seated Hammer Curl", "Barbell Preacher Curl", "Preacher Curl", "Dumbbell Preacher Curl",
  "Ez Barbell Close Grip Preacher Curl", "Ez Barbell Spider Curl", "Barbell Prone Incline Curl",
  "Lever Preacher Curl", "Cable Preacher Curl", "Cable Curl", "Cable One Arm Curl", "Cable Overhead Curl",
  "Cable Close Grip Curl", "Cable Rope Hammer Preacher Curl", "Barbell Reverse Curl",
  "Dumbbell Standing Reverse Curl", "Lever Bicep Curl", "Smith Machine Bicep Curl",
  "Biceps Pull-up", "Biceps Narrow Pull-ups",

  // Triceps
  "Close Grip Bench Press", "Barbell Jm Bench Press", "Dumbbell Close-grip Press", "Smith Close-grip Bench Press",
  "Barbell Incline Close Grip Bench Press", "Ez-bar Close-grip Bench Press",
  "Barbell Lying Triceps Extension Skull Crusher", "Ez Bar Lying Close Grip Triceps Extension Behind Head",
  "Barbell Seated Overhead Triceps Extension", "Barbell Standing Overhead Triceps Extension",
  "Dumbbell Seated Triceps Extension", "Dumbbell Standing Triceps Extension", "Dumbbell Lying Triceps Extension",
  "Dumbbell Tate Press", "Cable Pushdown", "Cable Pushdown (with Rope Attachment)",
  "Cable Triceps Pushdown (v-bar)", "Cable One Arm Tricep Pushdown", "Cable Overhead Triceps Extension (rope Attachment)",
  "Cable Reverse-grip Pushdown", "Dumbbell Kickback", "Dumbbell One Arm Kickback", "Lever Triceps Extension",
  "Lever Seated Dip", "Triceps Dip", "Weighted Tricep Dips", "Assisted Triceps Dip (kneeling)",
  "Ring Dips", "Diamond Push-up", "Close-grip Push-up", "Bench Dip (knees Bent)", "Tricep Extension",

  // Forearms
  "Wrist Curl", "Reverse Wrist Curl", "Barbell Wrist Curl", "Barbell Reverse Wrist Curl",
  "Barbell Palms Up Wrist Curl Over A Bench", "Barbell Palms Down Wrist Curl Over A Bench",
  "Barbell Standing Back Wrist Curl", "Dumbbell Over Bench One Arm Wrist Curl",
  "Dumbbell Over Bench One Arm Reverse Wrist Curl", "Dumbbell Reverse Wrist Curl",
  "Dumbbell Seated Palms Up Wrist Curl", "Cable Wrist Curl", "Cable Reverse Wrist Curl",
  "Finger Curls", "Wrist Rollerer", "Kettlebell Alternating Hang Clean",

  // Legs
  "Squat", "Barbell Wide Squat", "Barbell Bench Front Squat", "Barbell Overhead Squat",
  "Dumbbell Goblet Squat", "Smith Chair Squat", "Split Squats", "Barbell Single Leg Split Squat",
  "Dumbbell Single Leg Split Squat", "Dumbbell Step-up Lunge", "Sissy Squat", "Romanian Deadlift",
  "Barbell Straight Leg Deadlift", "Barbell Good Morning", "Leg Press", "Lever Leg Extension",
  "Lever Seated Leg Curl", "Lever Lying Leg Curl", "Glute-ham Raise", "Lever Seated Hip Abduction",
  "Lever Seated Hip Adduction", "Standing Calf Raise", "Barbell Standing Calf Raise",
  "Dumbbell Standing Calf Raise", "Barbell Seated Calf Raise", "Dumbbell Seated Calf Raise",
  "Lever Standing Calf Raise", "Lever Seated Calf Raise", "Donkey Calf Raise", "Sled Calf Press On Leg Press",
  "Bodyweight Standing Calf Raise", "Farmers Walk", "Power Clean", "Kettlebell Hang Clean",

  // Glutes
  "Hip Thrust", "Barbell Glute Bridge", "Cable Kickback", "Glute Bridge March", "Barbell Deadlift",
  "Barbell Sumo Deadlift", "Barbell Romanian Deadlift", "Trap Bar Deadlift", "Barbell Rack Pull",
  "Barbell Front Squat", "Barbell Full Squat", "Walking Lunge", "Barbell Rear Lunge",
  "Dumbbell Romanian Deadlift", "Dumbbell Single Leg Deadlift", "Single Leg Squat (pistol) Male",
  "Barbell Step-up", "Dumbbell Step-up", "Kettlebell Swing", "Kettlebell Goblet Squat",
  "Dumbbell Squat", "Dumbbell Lunge", "Curtsey Squat", "Sled 45° Leg Press (side Pov)",
  "Sled Hack Squat", "Cable Pull Through (with Rope)", "Lever Reverse Hyperextension",
  "Smith Squat", "Monster Walk", "Smith Deadlift",

  // Abs
  "Crunches", "Decline Sit-up", "3/4 Sit-up", "V-sit On Floor", "Air Bike", "Reverse Crunch",
  "Cable Kneeling Crunch", "Weighted Russian Twist", "Dumbbell Side Bend", "Weighted Crunch",
  "Landmine 180", "Cable Twist", "Hanging Leg Raise", "Assisted Hanging Knee Raise",
  "Vertical Leg Raise (on Parallel Bars)", "Lying Leg Raise Flat Bench", "Hanging Oblique Knee Raise",
  "Seated Leg Raise", "Russian Twist", "Cable Side Bend", "Dead Bug", "Weighted Front Plank",
  "Push-up To Side Plank", "Band Horizontal Pallof Press", "Shoulder Tap", "Wheel Rollerout",
  "Barbell Rollerout", "L-sit On Floor", "Front Lever",

  // Cardio
  "Treadmill", "Stairs", "Run", "Jump Rope", "Short Stride Run", "Burpee", "Dumbbell Burpee",
  "Mountain Climber", "Bear Crawl", "Skater Hops", "Star Jump (male)", "Walking High Knees Lunge",
  "Cycle Cross Trainer", "Walk Elliptical Cross Trainer", "Walking On Incline Treadmill",
  "Walking On Stepmill", "Stationary Bike Run V. 3",
];

async function run() {
  const unique = [...new Set(FEATURED)];
  console.log(`Marking ${unique.length} unique exercises as featured...`);

  const result = await prisma.exerciseLibrary.updateMany({
    where: { name: { in: unique } },
    data: { featured: true },
  });

  console.log(`Matched and updated ${result.count} rows.`);

  const matchedNames = new Set(
    (await prisma.exerciseLibrary.findMany({ where: { name: { in: unique } }, select: { name: true } })).map((e) => e.name),
  );
  const missing = unique.filter((n) => !matchedNames.has(n));
  if (missing.length > 0) {
    console.log(`\n${missing.length} names had no exact match in the database:`);
    console.log(missing.join(", "));
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
