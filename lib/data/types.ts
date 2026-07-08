export type ExerciseType = "weighted" | "cardio" | "bodyweight"

export type Exercise = {
  name: string
  sets: number
  reps: number
  // "weighted" (default, omit this field) — weight x reps, e.g. "150x10"
  // "cardio" — `reps` means recommended minutes, logged as a real minute count
  // "bodyweight" — reps per set, no weight, e.g. "15 12 10"
  type?: ExerciseType
}

export type SplitDay = {
  day: number
  name: string
  muscles: string
  exercises: Exercise[]
}
