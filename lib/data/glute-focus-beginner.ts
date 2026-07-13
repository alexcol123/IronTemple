import { SplitDay } from "./types"

// Beginner tier — 3 days/week, 5 exercises/day (~45 min). Glute-dominant with
// one upper body/core day to keep the rest of the body maintained.
export const GLUTE_FOCUS_BEGINNER_SPLIT: SplitDay[] = [
  {
    day: 1,
    name: "Glute Focus A",
    muscles: "Glutes, Hamstrings",
    exercises: [
      { name: "Barbell Glute Bridge", sets: 4, reps: 10 },
      { name: "Barbell Romanian Deadlift", sets: 3, reps: 10 },
      { name: "Barbell Single Leg Split Squat", sets: 3, reps: 10 },
      { name: "Cable Kickback", sets: 3, reps: 15 },
      { name: "Monster Walk", sets: 3, reps: 15, type: "bodyweight" },
    ],
  },
  {
    day: 2,
    name: "Upper Body and Core",
    muscles: "Chest, Back, Shoulders, Core",
    exercises: [
      { name: "Cable Underhand Pulldown", sets: 3, reps: 12 },
      { name: "Dumbbell Bench Press", sets: 3, reps: 12 },
      { name: "Cable Seated Row", sets: 3, reps: 12 },
      { name: "Dumbbell Seated Shoulder Press", sets: 3, reps: 12 },
      { name: "Weighted Crunch", sets: 3, reps: 15 },
    ],
  },
  {
    day: 3,
    name: "Glute Focus B",
    muscles: "Glutes, Quads, Hamstrings",
    exercises: [
      { name: "Kettlebell Goblet Squat", sets: 4, reps: 10 },
      { name: "Walking Lunge", sets: 3, reps: 12, type: "bodyweight" },
      { name: "Glute Bridge March", sets: 3, reps: 15, type: "bodyweight" },
      { name: "Sled 45° Leg Press (side Pov)", sets: 3, reps: 12 },
      { name: "Air Bike", sets: 3, reps: 20, type: "bodyweight" },
    ],
  },
]
