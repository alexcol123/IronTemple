import { SplitDay } from "./types"

// Beginner tier — 3 days/week, 5 exercises/day (~45 min). Squat/Bench/Deadlift
// focus days, low reps on the main lift, minimal accessory clutter.
export const GET_STRONGER_BEGINNER_SPLIT: SplitDay[] = [
  {
    day: 1,
    name: "Squat Day",
    muscles: "Quads, Glutes, Lower Back",
    exercises: [
      { name: "Barbell Full Squat", sets: 5, reps: 5 },
      { name: "Barbell Romanian Deadlift", sets: 3, reps: 6 },
      { name: "Cable Seated Row", sets: 3, reps: 10 },
      { name: "Lever Lying Leg Curl", sets: 3, reps: 10 },
      { name: "Hanging Oblique Knee Raise", sets: 3, reps: 10, type: "bodyweight" },
    ],
  },
  {
    day: 2,
    name: "Bench Day",
    muscles: "Chest, Shoulders, Triceps, Back",
    exercises: [
      { name: "Barbell Bench Press", sets: 5, reps: 5 },
      { name: "Barbell Seated Overhead Press", sets: 3, reps: 6 },
      { name: "Cable Lateral Pulldown With V-bar", sets: 3, reps: 10 },
      { name: "Barbell Curl", sets: 3, reps: 10 },
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
      { name: "Cable Underhand Pulldown", sets: 3, reps: 10 },
      { name: "Cable Standing Rear Delt Row (with Rope)", sets: 3, reps: 12 },
      { name: "Reverse Crunch", sets: 3, reps: 20, type: "bodyweight" },
    ],
  },
]
