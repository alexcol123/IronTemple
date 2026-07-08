import { SplitDay } from "./types"

// Lower body hypertrophy emphasis — hip thrust as the primary driver, mixed with
// squat/hinge patterns, higher frequency since glutes recover fast. One upper
// body/core day keeps the rest of the body maintained. Repeated twice across the week.
export const GLUTE_FOCUS_SPLIT: SplitDay[] = [
  {
    day: 1,
    name: "Glute Focus A",
    muscles: "Glutes, Hamstrings",
    exercises: [
      { name: "Barbell Hip Thrust", sets: 4, reps: 10 },
      { name: "Romanian Deadlift", sets: 3, reps: 10 },
      { name: "Bulgarian Split Squat", sets: 3, reps: 10 },
      { name: "Cable Kickback", sets: 3, reps: 15 },
      { name: "Banded Lateral Walk", sets: 3, reps: 15 },
    ],
  },
  {
    day: 2,
    name: "Upper Body and Core",
    muscles: "Chest, Back, Shoulders, Core",
    exercises: [
      { name: "Lat Pulldown", sets: 3, reps: 12 },
      { name: "Dumbbell Bench Press", sets: 3, reps: 12 },
      { name: "Seated Cable Row", sets: 3, reps: 12 },
      { name: "Dumbbell Shoulder Press", sets: 3, reps: 12 },
      { name: "Crunches", sets: 3, reps: 20 },
    ],
  },
  {
    day: 3,
    name: "Glute Focus B",
    muscles: "Glutes, Quads, Hamstrings",
    exercises: [
      { name: "Sumo Deadlift", sets: 4, reps: 8 },
      { name: "Walking Lunge", sets: 3, reps: 12 },
      { name: "Glute Bridge", sets: 3, reps: 15 },
      { name: "Leg Press", sets: 3, reps: 12 },
      { name: "Bicycle Crunches", sets: 3, reps: 20 },
    ],
  },
  {
    day: 4,
    name: "Glute Focus A",
    muscles: "Glutes, Hamstrings",
    exercises: [
      { name: "Barbell Hip Thrust", sets: 4, reps: 10 },
      { name: "Romanian Deadlift", sets: 3, reps: 10 },
      { name: "Bulgarian Split Squat", sets: 3, reps: 10 },
      { name: "Cable Kickback", sets: 3, reps: 15 },
      { name: "Banded Lateral Walk", sets: 3, reps: 15 },
    ],
  },
  {
    day: 5,
    name: "Upper Body and Core",
    muscles: "Chest, Back, Shoulders, Core",
    exercises: [
      { name: "Lat Pulldown", sets: 3, reps: 12 },
      { name: "Dumbbell Bench Press", sets: 3, reps: 12 },
      { name: "Seated Cable Row", sets: 3, reps: 12 },
      { name: "Dumbbell Shoulder Press", sets: 3, reps: 12 },
      { name: "Crunches", sets: 3, reps: 20 },
    ],
  },
  {
    day: 6,
    name: "Glute Focus B",
    muscles: "Glutes, Quads, Hamstrings",
    exercises: [
      { name: "Sumo Deadlift", sets: 4, reps: 8 },
      { name: "Walking Lunge", sets: 3, reps: 12 },
      { name: "Glute Bridge", sets: 3, reps: 15 },
      { name: "Leg Press", sets: 3, reps: 12 },
      { name: "Bicycle Crunches", sets: 3, reps: 20 },
    ],
  },
]
