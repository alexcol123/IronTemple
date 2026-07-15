import { SplitDay } from "./types"

// Beginner tier — 3 days/week, 5 exercises/day (~45 min: 5 x 3 sets = 15 sets).
// Names are exact ExerciseLibrary.name from the featured pool (see
// most-common-exercises-in-data.md) so these link straight to real gifs/instructions.
export const BUILD_MUSCLE_BEGINNER_SPLIT: SplitDay[] = [
  {
    day: 1,
    name: "Chest and Back",
    muscles: "Chest, Back",
    exercises: [
      { name: "Barbell Bench Press", sets: 3, reps: 6 },
      { name: "Barbell Incline Bench Press", sets: 3, reps: 8 },
      { name: "Cable Lateral Pulldown With V-bar", sets: 3, reps: 10 },
      { name: "Cable Seated Row", sets: 3, reps: 10 },
      { name: "Weighted Crunch", sets: 3, reps: 15 },
    ],
  },
  {
    day: 2,
    name: "Shoulders and Arms",
    muscles: "Shoulders, Biceps, Triceps",
    exercises: [
      { name: "Barbell Seated Overhead Press", sets: 3, reps: 8 },
      { name: "Dumbbell Lateral Raise", sets: 3, reps: 10 },
      { name: "Barbell Curl", sets: 3, reps: 10 },
      { name: "Cable Pushdown", sets: 3, reps: 8 },
      { name: "Reverse Crunch", sets: 3, reps: 20, type: "bodyweight" },
    ],
  },
  {
    day: 3,
    name: "Legs",
    muscles: "Quads, Hamstrings, Calves",
    exercises: [
      { name: "Barbell Full Squat", sets: 3, reps: 6 },
      { name: "Barbell Straight Leg Deadlift", sets: 3, reps: 8 },
      { name: "Dumbbell Lunge", sets: 3, reps: 10 },
      { name: "Barbell Standing Calf Raise", sets: 3, reps: 12 },
      { name: "Hanging Oblique Knee Raise", sets: 3, reps: 12, type: "bodyweight" },
    ],
  },
]
