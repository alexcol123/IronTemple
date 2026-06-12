import { SplitDay } from "./arnold"

export const RONNIE_SPLIT: SplitDay[] = [
  {
    day: 1,
    name: "Back, Biceps and Calves",
    muscles: "Back, Biceps, Calves",
    exercises: [
      { name: "Deadlift", sets: 3, reps: 4 },
      { name: "Barbell Row", sets: 3, reps: 10 },
      { name: "T-Bar Row", sets: 3, reps: 10 },
      { name: "One Arm Dumbbell Row", sets: 3, reps: 10 },
      { name: "Standing EZ Bar Curl 21s", sets: 3, reps: 21 },
      { name: "One Arm Dumbbell Preacher Curl", sets: 3, reps: 10 },
      { name: "Seated Dumbbell Hammer Curl", sets: 3, reps: 10 },
      { name: "Seated Calf Raise", sets: 3, reps: 10 },
      { name: "Standing Calf Raise", sets: 3, reps: 10 },
      { name: "Leg Press Calf Raise", sets: 3, reps: 10 },
    ],
  },
  {
    day: 2,
    name: "Chest and Triceps",
    muscles: "Chest, Triceps",
    exercises: [
      { name: "Dumbbell Bench Press", sets: 3, reps: 10 },
      { name: "Incline Dumbbell Bench Press", sets: 3, reps: 7 },
      { name: "Flat Dumbbell Fly", sets: 3, reps: 10 },
      { name: "Skull Crusher", sets: 3, reps: 10 },
      { name: "Dumbbell Overhead Triceps Extension", sets: 3, reps: 10 },
      { name: "Dumbbell Kickback", sets: 3, reps: 12 },
    ],
  },
  {
    day: 3,
    name: "Legs",
    muscles: "Quads, Hamstrings, Calves",
    exercises: [
      { name: "Barbell Back Squat", sets: 3, reps: 4 },
      { name: "Leg Press", sets: 3, reps: 10 },
      { name: "Lying Leg Curl", sets: 3, reps: 10 },
      { name: "Seated Leg Curl", sets: 3, reps: 10 },
      { name: "Walking Lunges", sets: 3, reps: 20 },
    ],
  },
  {
    day: 4,
    name: "Shoulders and Traps",
    muscles: "Shoulders, Traps",
    exercises: [
      { name: "Seated Barbell Shoulder Press", sets: 3, reps: 10 },
      { name: "Machine Side Raise", sets: 3, reps: 10 },
      { name: "Dumbbell Front Raise", sets: 3, reps: 10 },
      { name: "Standing Cable Reverse Fly", sets: 3, reps: 10 },
      { name: "Bent Over Cable Reverse Fly", sets: 3, reps: 10 },
      { name: "Behind The Back Barbell Shrug", sets: 3, reps: 10 },
    ],
  },
  {
    // Variation of Day 1 — pulldown focus instead of row focus
    day: 5,
    name: "Back, Biceps and Calves",
    muscles: "Back, Biceps, Calves",
    exercises: [
      { name: "Pull Up", sets: 3, reps: 10 },
      { name: "Lat Pulldown", sets: 3, reps: 10 },
      { name: "Seated Cable Row", sets: 3, reps: 10 },
      { name: "One Arm Dumbbell Row", sets: 3, reps: 10 },
      { name: "Standing EZ Bar Curl 21s", sets: 3, reps: 21 },
      { name: "One Arm Dumbbell Preacher Curl", sets: 3, reps: 10 },
      { name: "Seated Dumbbell Hammer Curl", sets: 3, reps: 10 },
      { name: "Seated Calf Raise", sets: 3, reps: 10 },
      { name: "Standing Calf Raise", sets: 3, reps: 10 },
      { name: "Leg Press Calf Raise", sets: 3, reps: 10 },
    ],
  },
  {
    // Variation of Day 2 — barbell focus instead of dumbbell focus
    day: 6,
    name: "Chest and Triceps",
    muscles: "Chest, Triceps",
    exercises: [
      { name: "Barbell Bench Press", sets: 3, reps: 10 },
      { name: "Incline Barbell Bench Press", sets: 3, reps: 7 },
      { name: "Flat Dumbbell Fly", sets: 3, reps: 10 },
      { name: "Skull Crusher", sets: 3, reps: 10 },
      { name: "Dumbbell Overhead Triceps Extension", sets: 3, reps: 10 },
      { name: "Dumbbell Kickback", sets: 3, reps: 12 },
    ],
  },
]

export function getRonnieSplitDay(dayNumber: number): SplitDay {
  const day = RONNIE_SPLIT.find((d) => d.day === dayNumber)
  if (!day) throw new Error(`Invalid day number: ${dayNumber}`)
  return day
}
