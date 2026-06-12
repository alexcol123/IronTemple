export type Exercise = {
  name: string
  sets: number
  reps: number
}

export type SplitDay = {
  day: number
  name: string
  muscles: string
  exercises: Exercise[]
}

export const ARNOLD_SPLIT: SplitDay[] = [
  {
    day: 1,
    name: "Chest and Back",
    muscles: "Chest, Back",
    exercises: [
      { name: "Bench Press", sets: 4, reps: 10 },
      { name: "Incline Bench Press", sets: 4, reps: 10 },
      { name: "Dumbbell Pullovers", sets: 4, reps: 10 },
      { name: "Chin Up", sets: 4, reps: 10 },
      { name: "Bent Over Row", sets: 4, reps: 10 },
      { name: "Deadlift", sets: 4, reps: 10 },
      { name: "Crunches", sets: 5, reps: 25 },
    ],
  },
  {
    day: 2,
    name: "Shoulders and Arms",
    muscles: "Shoulders, Biceps, Triceps, Forearms",
    exercises: [
      { name: "Barbell Clean and Press", sets: 4, reps: 10 },
      { name: "Dumbbell Lateral Raise", sets: 4, reps: 10 },
      { name: "Upright Row", sets: 4, reps: 10 },
      { name: "Military Press", sets: 4, reps: 10 },
      { name: "Standing Barbell Curl", sets: 4, reps: 10 },
      { name: "Seated Dumbbell Curl", sets: 4, reps: 10 },
      { name: "Close Grip Bench Press", sets: 4, reps: 10 },
      { name: "Standing Barbell Tricep Extension", sets: 4, reps: 10 },
      { name: "Wrist Curls", sets: 4, reps: 10 },
      { name: "Reverse Wrist Curls", sets: 4, reps: 10 },
      { name: "Reverse Crunch", sets: 5, reps: 25 },
    ],
  },
  {
    day: 3,
    name: "Legs and Lower Back",
    muscles: "Quads, Hamstrings, Calves, Lower Back",
    exercises: [
      { name: "Squat", sets: 4, reps: 10 },
      { name: "Lunge", sets: 4, reps: 10 },
      { name: "Leg Curl", sets: 4, reps: 10 },
      { name: "Stiff Leg Deadlift", sets: 4, reps: 10 },
      { name: "Good Mornings", sets: 4, reps: 10 },
      { name: "Standing Calf Raise", sets: 4, reps: 10 },
      { name: "Crunches", sets: 5, reps: 25 },
    ],
  },
  {
    day: 4,
    name: "Chest and Back",
    muscles: "Chest, Back",
    exercises: [
      { name: "Bench Press", sets: 4, reps: 10 },
      { name: "Incline Bench Press", sets: 4, reps: 10 },
      { name: "Dumbbell Pullovers", sets: 4, reps: 10 },
      { name: "Chin Up", sets: 4, reps: 10 },
      { name: "Bent Over Row", sets: 4, reps: 10 },
      { name: "Deadlift", sets: 4, reps: 10 },
      { name: "Crunches", sets: 5, reps: 25 },
    ],
  },
  {
    day: 5,
    name: "Shoulders and Arms",
    muscles: "Shoulders, Biceps, Triceps, Forearms",
    exercises: [
      { name: "Barbell Clean and Press", sets: 4, reps: 10 },
      { name: "Dumbbell Lateral Raise", sets: 4, reps: 10 },
      { name: "Upright Row", sets: 4, reps: 10 },
      { name: "Military Press", sets: 4, reps: 10 },
      { name: "Standing Barbell Curl", sets: 4, reps: 10 },
      { name: "Seated Dumbbell Curl", sets: 4, reps: 10 },
      { name: "Close Grip Bench Press", sets: 4, reps: 10 },
      { name: "Standing Barbell Tricep Extension", sets: 4, reps: 10 },
      { name: "Wrist Curls", sets: 4, reps: 10 },
      { name: "Reverse Wrist Curls", sets: 4, reps: 10 },
      { name: "Reverse Crunch", sets: 5, reps: 25 },
    ],
  },
  {
    day: 6,
    name: "Legs and Lower Back",
    muscles: "Quads, Hamstrings, Calves, Lower Back",
    exercises: [
      { name: "Squat", sets: 4, reps: 10 },
      { name: "Lunge", sets: 4, reps: 10 },
      { name: "Leg Curl", sets: 4, reps: 10 },
      { name: "Stiff Leg Deadlift", sets: 4, reps: 10 },
      { name: "Good Mornings", sets: 4, reps: 10 },
      { name: "Standing Calf Raise", sets: 4, reps: 10 },
      { name: "Crunches", sets: 5, reps: 25 },
    ],
  },
]

export function getSplitDay(dayNumber: number): SplitDay {
  const day = ARNOLD_SPLIT.find((d) => d.day === dayNumber)
  if (!day) throw new Error(`Invalid day number: ${dayNumber}`)
  return day
}
