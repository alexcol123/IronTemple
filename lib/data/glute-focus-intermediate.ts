import { SplitDay } from "./types"

// Intermediate tier — 4 days/week, 6 exercises/day (<60 min). Adds a
// quad-focused lower day so lower body gets more frequency, like real
// glute-program templates once someone can train 4x/week.
export const GLUTE_FOCUS_INTERMEDIATE_SPLIT: SplitDay[] = [
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
      { name: "Weighted Crunch", sets: 3, reps: 15 },
    ],
  },
  {
    day: 2,
    name: "Quads and Hamstrings",
    muscles: "Quads, Hamstrings, Calves",
    exercises: [
      { name: "Barbell Full Squat", sets: 3, reps: 10 },
      { name: "Sled 45° Leg Press (side Pov)", sets: 3, reps: 12 },
      { name: "Lever Lying Leg Curl", sets: 3, reps: 12 },
      { name: "Lever Leg Extension", sets: 3, reps: 12 },
      { name: "Barbell Standing Calf Raise", sets: 3, reps: 12 },
      { name: "Hanging Oblique Knee Raise", sets: 3, reps: 12, type: "bodyweight" },
    ],
  },
  {
    day: 3,
    name: "Upper Body and Core",
    muscles: "Chest, Back, Shoulders, Core",
    exercises: [
      { name: "Cable Underhand Pulldown", sets: 3, reps: 12 },
      { name: "Dumbbell Bench Press", sets: 3, reps: 12 },
      { name: "Cable Seated Row", sets: 3, reps: 12 },
      { name: "Dumbbell Seated Shoulder Press", sets: 3, reps: 12 },
      { name: "Dumbbell Seated Hammer Curl", sets: 3, reps: 12 },
      { name: "Weighted Crunch", sets: 3, reps: 15 },
    ],
  },
  {
    day: 4,
    name: "Glute Focus B",
    muscles: "Glutes, Quads, Hamstrings",
    exercises: [
      { name: "Barbell Sumo Deadlift", sets: 4, reps: 8 },
      { name: "Walking Lunge", sets: 3, reps: 12, type: "bodyweight" },
      { name: "Glute Bridge March", sets: 3, reps: 15, type: "bodyweight" },
      { name: "Dumbbell Lunge", sets: 3, reps: 12 },
      { name: "Dumbbell Single Leg Deadlift", sets: 3, reps: 10 },
      { name: "Air Bike", sets: 3, reps: 20, type: "bodyweight" },
    ],
  },
]
