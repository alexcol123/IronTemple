import { SplitDay } from "./types"

// Strength-focused — low reps (3-8) on the big compound lifts, minimal accessory clutter.
// Rotates Squat / Bench / Deadlift focus days, repeated twice across the week.
export const GET_STRONGER_SPLIT: SplitDay[] = [
  {
    day: 1,
    name: "Squat Day",
    muscles: "Quads, Glutes, Lower Back",
    exercises: [
      { name: "Back Squat", sets: 5, reps: 5 },
      { name: "Romanian Deadlift", sets: 3, reps: 6 },
      { name: "Barbell Row", sets: 3, reps: 6 },
      { name: "Hanging Leg Raise", sets: 3, reps: 10 },
    ],
  },
  {
    day: 2,
    name: "Bench Day",
    muscles: "Chest, Shoulders, Triceps, Back",
    exercises: [
      { name: "Bench Press", sets: 5, reps: 5 },
      { name: "Overhead Press", sets: 3, reps: 6 },
      { name: "Pull-ups", sets: 3, reps: 6, type: "bodyweight" },
      { name: "Barbell Curl", sets: 3, reps: 10 },
    ],
  },
  {
    day: 3,
    name: "Deadlift Day",
    muscles: "Back, Hamstrings, Glutes",
    exercises: [
      { name: "Deadlift", sets: 5, reps: 3 },
      { name: "Front Squat", sets: 3, reps: 6 },
      { name: "Chin-Up", sets: 3, reps: 8, type: "bodyweight" },
      { name: "Face Pull", sets: 3, reps: 12 },
    ],
  },
  {
    day: 4,
    name: "Squat Day",
    muscles: "Quads, Glutes, Lower Back",
    exercises: [
      { name: "Back Squat", sets: 5, reps: 5 },
      { name: "Romanian Deadlift", sets: 3, reps: 6 },
      { name: "Barbell Row", sets: 3, reps: 6 },
      { name: "Hanging Leg Raise", sets: 3, reps: 10 },
    ],
  },
  {
    day: 5,
    name: "Bench Day",
    muscles: "Chest, Shoulders, Triceps, Back",
    exercises: [
      { name: "Bench Press", sets: 5, reps: 5 },
      { name: "Overhead Press", sets: 3, reps: 6 },
      { name: "Pull-ups", sets: 3, reps: 6, type: "bodyweight" },
      { name: "Barbell Curl", sets: 3, reps: 10 },
    ],
  },
  {
    day: 6,
    name: "Deadlift Day",
    muscles: "Back, Hamstrings, Glutes",
    exercises: [
      { name: "Deadlift", sets: 5, reps: 3 },
      { name: "Front Squat", sets: 3, reps: 6 },
      { name: "Chin-Up", sets: 3, reps: 8, type: "bodyweight" },
      { name: "Face Pull", sets: 3, reps: 12 },
    ],
  },
]
