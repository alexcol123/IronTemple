import { SplitDay } from "./types"

// Intermediate tier — 4 days/week, 6 exercises/day (<60 min: 6 x 3 sets = 18 sets).
// Chest and Back split into separate days now that there's a 4th day to spend.
export const BUILD_MUSCLE_INTERMEDIATE_SPLIT: SplitDay[] = [
  {
    day: 1,
    name: "Chest",
    muscles: "Chest",
    exercises: [
      { name: "Barbell Bench Press", sets: 3, reps: 6 },
      { name: "Barbell Incline Bench Press", sets: 3, reps: 8 },
      { name: "Dumbbell Pullover", sets: 3, reps: 10 },
      { name: "Dumbbell Fly", sets: 3, reps: 10 },
      { name: "Cable Cross-over Variation", sets: 3, reps: 10 },
      { name: "Weighted Crunch", sets: 3, reps: 15 },
    ],
  },
  {
    day: 2,
    name: "Back",
    muscles: "Back",
    exercises: [
      { name: "Chin-up", sets: 3, reps: 8, type: "bodyweight" },
      { name: "Barbell Pendlay Row", sets: 3, reps: 8 },
      { name: "Cable Seated Row", sets: 3, reps: 10 },
      { name: "Cable Underhand Pulldown", sets: 3, reps: 10 },
      { name: "Barbell Curl", sets: 3, reps: 10 },
      { name: "Reverse Crunch", sets: 3, reps: 20, type: "bodyweight" },
    ],
  },
  {
    day: 3,
    name: "Shoulders and Arms",
    muscles: "Shoulders, Biceps, Triceps",
    exercises: [
      { name: "Barbell Seated Overhead Press", sets: 3, reps: 8 },
      { name: "Dumbbell Lateral Raise", sets: 3, reps: 10 },
      { name: "Dumbbell Reverse Fly", sets: 3, reps: 12 },
      { name: "Dumbbell Seated Hammer Curl", sets: 3, reps: 10 },
      { name: "Barbell Standing Overhead Triceps Extension", sets: 3, reps: 10 },
      { name: "Hanging Oblique Knee Raise", sets: 3, reps: 12, type: "bodyweight" },
    ],
  },
  {
    day: 4,
    name: "Legs",
    muscles: "Quads, Hamstrings, Calves",
    exercises: [
      { name: "Barbell Full Squat", sets: 3, reps: 6 },
      { name: "Barbell Straight Leg Deadlift", sets: 3, reps: 8 },
      { name: "Dumbbell Lunge", sets: 3, reps: 10 },
      { name: "Lever Lying Leg Curl", sets: 3, reps: 10 },
      { name: "Barbell Standing Calf Raise", sets: 3, reps: 12 },
      { name: "Weighted Crunch", sets: 3, reps: 15 },
    ],
  },
]
