import { SplitDay } from "./types"

// Advanced tier — 5 days/week, 6-7 exercises/day (~60 min). Day order
// deliberately alternates heavy-axial-loading days with lighter ones (Glute A
// -> Upper Body -> Quads -> Glute B -> Hamstrings/Posterior) instead of running
// three consecutive max-effort hip-hinge/squat days back to back.
export const GLUTE_FOCUS_ADVANCED_SPLIT: SplitDay[] = [
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
      { name: "Lever Seated Hip Abduction", sets: 3, reps: 15 },
      { name: "Weighted Crunch", sets: 3, reps: 15 },
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
      { name: "Dumbbell Seated Hammer Curl", sets: 3, reps: 12 },
      { name: "Barbell Standing Overhead Triceps Extension", sets: 3, reps: 10 },
      { name: "Weighted Crunch", sets: 3, reps: 15 },
    ],
  },
  {
    day: 3,
    name: "Quads",
    muscles: "Quads, Calves",
    exercises: [
      { name: "Squat", sets: 3, reps: 10 },
      { name: "Sled Hack Squat", sets: 3, reps: 12 },
      { name: "Lever Leg Extension", sets: 3, reps: 12 },
      { name: "Smith Chair Squat", sets: 3, reps: 12 },
      { name: "Barbell Standing Calf Raise", sets: 3, reps: 12 },
      { name: "Hanging Oblique Knee Raise", sets: 3, reps: 12, type: "bodyweight" },
    ],
  },
  {
    day: 4,
    name: "Glute Focus B",
    muscles: "Glutes, Quads",
    exercises: [
      { name: "Sled 45 leg press", sets: 3, reps: 12 },
      { name: "Walking Lunge", sets: 3, reps: 12, type: "bodyweight" },
      { name: "Glute Bridge March", sets: 3, reps: 15, type: "bodyweight" },
      { name: "Barbell Step-up", sets: 3, reps: 12 },
      { name: "Kettlebell Swing", sets: 3, reps: 15 },
      { name: "Curtsey Squat", sets: 3, reps: 12, type: "bodyweight" },
      { name: "Reverse Crunch", sets: 3, reps: 20, type: "bodyweight" },
    ],
  },
  {
    day: 5,
    name: "Hamstrings and Posterior Chain",
    muscles: "Hamstrings, Glutes, Lower Back",
    exercises: [
      { name: "Barbell Sumo Deadlift", sets: 4, reps: 8 },
      { name: "Dumbbell Single Leg Deadlift", sets: 3, reps: 10 },
      { name: "Lever Lying Leg Curl", sets: 3, reps: 12 },
      { name: "Barbell Rear Lunge", sets: 3, reps: 10 },
      { name: "Lever Reverse Hyperextension", sets: 3, reps: 12 },
      { name: "Air Bike", sets: 3, reps: 20, type: "bodyweight" },
    ],
  },
]
