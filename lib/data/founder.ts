import { SplitDay } from "./arnold"

export const FOUNDER_SPLIT: SplitDay[] = [
  {
    day: 1,
    name: "Upper Body Push + Heavy Row",
    muscles: "Chest, Back, Shoulders, Triceps",
    exercises: [
      { name: "Bench Press", sets: 4, reps: 10 },
      { name: "Incline Bench Press", sets: 3, reps: 10 },
      { name: "Overhead Shoulder Press", sets: 3, reps: 10 },
      { name: "Dumbbell Lateral Raise", sets: 3, reps: 15 },
      { name: "Cable Tricep Pushdown", sets: 3, reps: 12 },
      { name: "Overhead Cable Tricep Extension", sets: 3, reps: 15 },
    ],
  },
  {
    day: 2,
    name: "Upper Body Pull",
    muscles: "Back, Biceps, Traps, Rear Delts",
    exercises: [
      { name: "Pull-ups", sets: 4, reps: 8 },
      { name: "Seated Cable Row", sets: 3, reps: 12 },
      { name: "Face Pull", sets: 3, reps: 15 },
      { name: "Incline Dumbbell Curl", sets: 3, reps: 12 },
      { name: "Hammer Curl", sets: 3, reps: 12 },
      { name: "Dumbbell Upright Row", sets: 3, reps: 12 },
      { name: "Dumbbell Shrug", sets: 3, reps: 12 },
    ],
  },
  {
    day: 3,
    name: "Cardio and Core",
    muscles: "Cardio, Core",
    exercises: [
      { name: "Run / Stairs", sets: 1, reps: 60 },
      { name: "Leg Raises", sets: 3, reps: 15 },
    ],
  },
  {
    day: 4,
    name: "Lower Body",
    muscles: "Quads, Hamstrings, Glutes, Calves, Core",
    exercises: [
      { name: "Barbell Squat", sets: 4, reps: 10 },
      { name: "Romanian Deadlift", sets: 3, reps: 10 },
      { name: "Lying Leg Curl", sets: 3, reps: 12 },
      { name: "Leg Extension", sets: 3, reps: 15 },
      { name: "Calf Raise", sets: 4, reps: 15 },
      { name: "Sit-ups", sets: 3, reps: 15 },
    ],
  },
  {
    day: 5,
    name: "Arm and Shoulder Pump",
    muscles: "Chest, Biceps, Triceps, Shoulders, Core",
    exercises: [
      { name: "Dips", sets: 3, reps: 10 },
      { name: "Dumbbell Shoulder Press", sets: 3, reps: 12 },
      { name: "Cable Fly", sets: 3, reps: 15 },
      { name: "Dumbbell Preacher Curl", sets: 3, reps: 15 },
      { name: "Cable Overhead Tricep Extension", sets: 3, reps: 15 },
      { name: "Lateral Raise", sets: 4, reps: 15 },
      { name: "Leg Raises", sets: 3, reps: 15 },
    ],
  },
  {
    day: 6,
    name: "Cardio",
    muscles: "Cardio",
    exercises: [
      { name: "Run / Stairs", sets: 1, reps: 60 },
      { name: "Sit-ups", sets: 3, reps: 15 },
    ],
  },
  {
    day: 7,
    name: "Rest",
    muscles: "",
    exercises: [],
  },
]

export function getFounderSplitDay(dayNumber: number): SplitDay {
  const day = FOUNDER_SPLIT.find((d) => d.day === dayNumber)
  if (!day) throw new Error(`Invalid day number: ${dayNumber}`)
  return day
}
