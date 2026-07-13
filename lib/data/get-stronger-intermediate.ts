import { SplitDay } from "./types"

// Intermediate tier — 4 days/week, 6 exercises/day (<60 min). Adds a Press day
// on top of Squat/Bench/Deadlift — the real 5/3/1-style 4-day template.
export const GET_STRONGER_INTERMEDIATE_SPLIT: SplitDay[] = [
  {
    day: 1,
    name: "Squat Day",
    muscles: "Quads, Glutes, Lower Back",
    exercises: [
      { name: "Barbell Full Squat", sets: 5, reps: 5 },
      { name: "Barbell Romanian Deadlift", sets: 3, reps: 6 },
      { name: "Pull-up", sets: 3, reps: 6, type: "bodyweight" },
      { name: "Lever Lying Leg Curl", sets: 3, reps: 10 },
      { name: "Barbell Standing Calf Raise", sets: 3, reps: 12 },
      { name: "Hanging Oblique Knee Raise", sets: 3, reps: 10, type: "bodyweight" },
    ],
  },
  {
    day: 2,
    name: "Bench Day",
    muscles: "Chest, Triceps, Back",
    exercises: [
      { name: "Barbell Bench Press", sets: 5, reps: 5 },
      { name: "Barbell Incline Bench Press", sets: 3, reps: 8 },
      { name: "Barbell Pendlay Row", sets: 3, reps: 6 },
      { name: "Barbell Curl", sets: 3, reps: 10 },
      { name: "Cable Pushdown", sets: 3, reps: 10 },
      { name: "Weighted Crunch", sets: 3, reps: 15 },
    ],
  },
  {
    day: 3,
    name: "Deadlift Day",
    muscles: "Back, Hamstrings, Glutes",
    exercises: [
      { name: "Barbell Deadlift", sets: 5, reps: 3 },
      { name: "Barbell Front Squat", sets: 3, reps: 6 },
      { name: "Chin-up", sets: 3, reps: 8, type: "bodyweight" },
      { name: "Cable Seated Row", sets: 3, reps: 10 },
      { name: "Cable Standing Rear Delt Row (with Rope)", sets: 3, reps: 12 },
      { name: "Reverse Crunch", sets: 3, reps: 20, type: "bodyweight" },
    ],
  },
  {
    day: 4,
    name: "Press Day",
    muscles: "Shoulders, Triceps",
    exercises: [
      { name: "Barbell Seated Overhead Press", sets: 5, reps: 5 },
      { name: "Dumbbell Rear Lateral Raise", sets: 3, reps: 10 },
      { name: "Barbell Upright Row", sets: 3, reps: 10 },
      { name: "Dumbbell Lateral Raise", sets: 3, reps: 10 },
      { name: "Barbell Standing Overhead Triceps Extension", sets: 3, reps: 10 },
      { name: "Hanging Oblique Knee Raise", sets: 3, reps: 10, type: "bodyweight" },
    ],
  },
]
