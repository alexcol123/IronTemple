import { SplitDay } from "./types"

// Intermediate tier — 4 days/week, 6 exercises/day incl. cardio finisher
// (<60 min). Adds a 4th full-body day and restores ab work now that there's
// more time budget per session.
export const LOSE_WEIGHT_INTERMEDIATE_SPLIT: SplitDay[] = [
  {
    day: 1,
    name: "Full Body A",
    muscles: "Full Body",
    exercises: [
      { name: "Dumbbell Goblet Squat", sets: 3, reps: 15 },
      { name: "Push-up", sets: 3, reps: 15, type: "bodyweight" },
      { name: "Cable Seated Row", sets: 3, reps: 15 },
      { name: "Dumbbell Romanian Deadlift", sets: 3, reps: 12 },
      { name: "Dead Bug", sets: 3, reps: 20, type: "bodyweight" },
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
      { name: "Shoulder Tap", sets: 3, reps: 20, type: "bodyweight" },
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
      { name: "Russian Twist", sets: 3, reps: 20, type: "bodyweight" },
      { name: "Cycle Cross Trainer", sets: 1, reps: 20, type: "cardio" },
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
      { name: "Stationary Bike Run", sets: 1, reps: 20, type: "cardio" },
    ],
  },
]
