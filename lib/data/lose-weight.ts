import { SplitDay } from "./types"

// Full body, 3 rotating sessions repeated twice across the week.
// Higher reps (12-20), compound movements, plus a cardio finisher each session
// (type: "cardio" — reps field means recommended minutes, logged via DONE/SKIP).
export const LOSE_WEIGHT_SPLIT: SplitDay[] = [
  {
    day: 1,
    name: "Full Body A",
    muscles: "Full Body",
    exercises: [
      { name: "Goblet Squat", sets: 3, reps: 15 },
      { name: "Push-ups", sets: 3, reps: 15, type: "bodyweight" },
      { name: "Seated Cable Row", sets: 3, reps: 15 },
      { name: "Dumbbell Romanian Deadlift", sets: 3, reps: 12 },
      { name: "Crunches", sets: 3, reps: 20 },
      { name: "Treadmill", sets: 1, reps: 20, type: "cardio" },
    ],
  },
  {
    day: 2,
    name: "Full Body B",
    muscles: "Full Body",
    exercises: [
      { name: "Walking Lunge", sets: 3, reps: 12 },
      { name: "Incline Dumbbell Press", sets: 3, reps: 12 },
      { name: "Lat Pulldown", sets: 3, reps: 12 },
      { name: "Dumbbell Shoulder Press", sets: 3, reps: 12 },
      { name: "Mountain Climbers", sets: 3, reps: 20 },
      { name: "Stationary Bike", sets: 1, reps: 20, type: "cardio" },
    ],
  },
  {
    day: 3,
    name: "Full Body C",
    muscles: "Full Body",
    exercises: [
      { name: "Kettlebell Swing", sets: 3, reps: 15 },
      { name: "Dumbbell Bench Press", sets: 3, reps: 12 },
      { name: "One Arm Dumbbell Row", sets: 3, reps: 12 },
      { name: "Step Ups", sets: 3, reps: 12 },
      { name: "Bicycle Crunches", sets: 3, reps: 20 },
      { name: "Treadmill", sets: 1, reps: 20, type: "cardio" },
    ],
  },
  {
    day: 4,
    name: "Full Body A",
    muscles: "Full Body",
    exercises: [
      { name: "Goblet Squat", sets: 3, reps: 15 },
      { name: "Push-ups", sets: 3, reps: 15, type: "bodyweight" },
      { name: "Seated Cable Row", sets: 3, reps: 15 },
      { name: "Dumbbell Romanian Deadlift", sets: 3, reps: 12 },
      { name: "Crunches", sets: 3, reps: 20 },
      { name: "Treadmill", sets: 1, reps: 20, type: "cardio" },
    ],
  },
  {
    day: 5,
    name: "Full Body B",
    muscles: "Full Body",
    exercises: [
      { name: "Walking Lunge", sets: 3, reps: 12 },
      { name: "Incline Dumbbell Press", sets: 3, reps: 12 },
      { name: "Lat Pulldown", sets: 3, reps: 12 },
      { name: "Dumbbell Shoulder Press", sets: 3, reps: 12 },
      { name: "Mountain Climbers", sets: 3, reps: 20 },
      { name: "Stationary Bike", sets: 1, reps: 20, type: "cardio" },
    ],
  },
  {
    day: 6,
    name: "Full Body C",
    muscles: "Full Body",
    exercises: [
      { name: "Kettlebell Swing", sets: 3, reps: 15 },
      { name: "Dumbbell Bench Press", sets: 3, reps: 12 },
      { name: "One Arm Dumbbell Row", sets: 3, reps: 12 },
      { name: "Step Ups", sets: 3, reps: 12 },
      { name: "Bicycle Crunches", sets: 3, reps: 20 },
      { name: "Treadmill", sets: 1, reps: 20, type: "cardio" },
    ],
  },
]
