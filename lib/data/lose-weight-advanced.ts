import { SplitDay } from "./types"

// Advanced tier — 5 days/week, 6 exercises/day (~60 min). Still full body,
// but each cardio finisher is a higher-intensity movement to match the
// "cardio days built in" framing from CLAUDE.md's plan table.
export const LOSE_WEIGHT_ADVANCED_SPLIT: SplitDay[] = [
  {
    day: 1,
    name: "Full Body A",
    muscles: "Full Body",
    exercises: [
      { name: "Barbell Sumo Deadlift", sets: 3, reps: 10 },
      { name: "Push-up", sets: 3, reps: 15, type: "bodyweight" },
      { name: "Cable Seated Row", sets: 3, reps: 15 },
      { name: "Sled 45 leg press", sets: 3, reps: 12 },
      { name: "Dead Bug", sets: 3, reps: 20, type: "bodyweight" },
      { name: "Burpee", sets: 1, reps: 5, type: "cardio" },
    ],
  },
  {
    day: 2,
    name: "Full Body B",
    muscles: "Full Body",
    exercises: [
      { name: "Walking Lunge", sets: 3, reps: 12, type: "bodyweight" },
      { name: "Incline Dumbbell Press", sets: 3, reps: 12 },
      { name: "Cable Underhand Pulldown", sets: 3, reps: 12 },
      { name: "Dumbbell Seated Shoulder Press", sets: 3, reps: 12 },
      { name: "Shoulder Tap", sets: 3, reps: 20, type: "bodyweight" },
      { name: "Mountain Climber", sets: 1, reps: 5, type: "cardio" },
    ],
  },
  {
    day: 3,
    name: "Full Body C",
    muscles: "Full Body",
    exercises: [
      { name: "Kettlebell Swing", sets: 3, reps: 15 },
      { name: "Dumbbell Bench Press", sets: 3, reps: 12 },
      { name: "Dumbbell Bent Over Row", sets: 3, reps: 12 },
      { name: "Barbell Step-up", sets: 3, reps: 12 },
      { name: "Russian Twist", sets: 3, reps: 20, type: "bodyweight" },
      { name: "Jump Rope", sets: 1, reps: 5, type: "cardio" },
    ],
  },
  {
    day: 4,
    name: "Full Body D",
    muscles: "Full Body",
    exercises: [
      { name: "Squat", sets: 3, reps: 12 },
      { name: "Dumbbell Incline Fly", sets: 3, reps: 12 },
      { name: "Cable Seated Wide-grip Row", sets: 3, reps: 12 },
      { name: "Dumbbell Lateral Raise", sets: 3, reps: 12 },
      { name: "Air Bike", sets: 3, reps: 20, type: "bodyweight" },
      { name: "Rowing Machine", sets: 1, reps: 3, type: "cardio" },
    ],
  },
  {
    day: 5,
    name: "Full Body E",
    muscles: "Full Body",
    exercises: [
      { name: "Dumbbell Goblet Squat", sets: 3, reps: 15 },
      { name: "Dumbbell Decline Bench Press", sets: 3, reps: 12 },
      { name: "Barbell One Arm Bent Over Row", sets: 3, reps: 12 },
      { name: "Dumbbell Arnold Press", sets: 3, reps: 12 },
      { name: "Weighted Russian Twist", sets: 3, reps: 15 },
      { name: "Skater Hops", sets: 1, reps: 5, type: "cardio" },
    ],
  },
]
