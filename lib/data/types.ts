export type ExerciseType = "weighted" | "cardio" | "bodyweight"

export type Exercise = {
  name: string
  sets: number
  reps: number
  // "weighted" (default, omit this field) — weight x reps, e.g. "150x10"
  // "cardio" — `reps` means recommended minutes, logged as a real minute count
  // "bodyweight" — reps per set, no weight, e.g. "15 12 10"
  type?: ExerciseType
  // One-time lookup from ExerciseDB, baked in rather than fetched live — see
  // CLAUDE.md's Feature Backlog for why (avoids a runtime dependency on their API).
  gifUrl?: string
  instructions?: string[]
  // A real tutorial video (e.g. YouTube), for comparing against the GIF —
  // separate from gifUrl since they can come from entirely different sources.
  videoUrl?: string
}

export type SplitDay = {
  day: number
  name: string
  muscles: string
  exercises: Exercise[]
}
