import { SplitDay } from "./types"

// Advanced tier — 5 days/week, 6-7 exercises/day (~60 min). Classic 5-day
// bodybuilder "bro split": Chest, Back, Shoulders, Arms, Legs.
export const BUILD_MUSCLE_ADVANCED_SPLIT: SplitDay[] = [
  {
    day: 1,
    name: "Chest",
    muscles: "Chest",
    exercises: [
      { name: "Barbell Bench Press", sets: 4, reps: 6 },
      { name: "Barbell Incline Bench Press", sets: 3, reps: 8 },
      { name: "Dumbbell Decline Bench Press", sets: 3, reps: 8 },
      { name: "Dumbbell Fly", sets: 3, reps: 10 },
      { name: "Dumbbell Pullover", sets: 3, reps: 10 },
      { name: "Cable Pushdown", sets: 3, reps: 8 },
      { name: "Weighted Crunch", sets: 3, reps: 15 },
    ],
  },
  {
    day: 2,
    name: "Back",
    muscles: "Back",
    exercises: [
      { name: "Weighted Pull-up", sets: 3, reps: 6 },
      { name: "Barbell Bent Over Row", sets: 4, reps: 8 },
      { name: "Chin-up", sets: 3, reps: 8, type: "bodyweight" },
      { name: "Cable Seated Row", sets: 3, reps: 10 },
      { name: "Cable Underhand Pulldown", sets: 3, reps: 10 },
      { name: "Barbell One Arm Bent Over Row", sets: 3, reps: 10 },
      { name: "Reverse Crunch", sets: 3, reps: 20, type: "bodyweight" },
    ],
  },
  {
    day: 3,
    name: "Shoulders",
    muscles: "Shoulders",
    exercises: [
      { name: "Barbell Seated Overhead Press", sets: 4, reps: 8 },
      { name: "Dumbbell Arnold Press", sets: 3, reps: 10 },
      { name: "Dumbbell Lateral Raise", sets: 3, reps: 10 },
      { name: "Dumbbell Rear Lateral Raise", sets: 3, reps: 10 },
      { name: "Barbell Upright Row", sets: 3, reps: 10 },
      { name: "Hanging Oblique Knee Raise", sets: 3, reps: 12, type: "bodyweight" },
    ],
  },
  {
    day: 4,
    name: "Arms",
    muscles: "Biceps, Triceps",
    exercises: [
      { name: "Barbell Lying Triceps Extension Skull Crusher", sets: 3, reps: 8 },
      { name: "Barbell Curl", sets: 3, reps: 10 },
      { name: "Dumbbell Seated Hammer Curl", sets: 3, reps: 10 },
      { name: "Ez Barbell Close Grip Preacher Curl", sets: 3, reps: 10 },
      { name: "Barbell Standing Overhead Triceps Extension", sets: 3, reps: 10 },
      { name: "Cable Pushdown", sets: 3, reps: 10 },
      { name: "Weighted Crunch", sets: 3, reps: 15 },
    ],
  },
  {
    day: 5,
    name: "Legs",
    muscles: "Quads, Hamstrings, Calves",
    exercises: [
      { name: "Barbell Full Squat", sets: 4, reps: 6 },
      { name: "Barbell Straight Leg Deadlift", sets: 3, reps: 8 },
      { name: "Dumbbell Lunge", sets: 3, reps: 10 },
      { name: "Lever Lying Leg Curl", sets: 3, reps: 10 },
      { name: "Lever Leg Extension", sets: 3, reps: 10 },
      { name: "Barbell Standing Calf Raise", sets: 3, reps: 12 },
      { name: "Reverse Crunch", sets: 3, reps: 20, type: "bodyweight" },
    ],
  },
]
