import { SplitDay } from "./types"

// Beginner tier — 3 days/week, 5 exercises/day incl. cardio finisher (~45 min).
// Basic/machine-based movements — this tier is for total newbies.
export const LOSE_WEIGHT_BEGINNER_SPLIT: SplitDay[] = [
  {
    day: 1,
    name: "Full Body A",
    muscles: "Full Body",
    exercises: [
      { name: "Dumbbell Goblet Squat", sets: 3, reps: 15 },
      { name: "Incline Push-up", sets: 3, reps: 15, type: "bodyweight" },
      { name: "Cable Seated Row", sets: 3, reps: 15 },
      { name: "Dumbbell Romanian Deadlift", sets: 3, reps: 12 },
      { name: "Walking On Incline Treadmill", sets: 1, reps: 20, type: "cardio" },
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
      { name: "Walk Elliptical Cross Trainer", sets: 1, reps: 20, type: "cardio" },
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
      { name: "Cycle Cross Trainer", sets: 1, reps: 20, type: "cardio" },
    ],
  },
]
