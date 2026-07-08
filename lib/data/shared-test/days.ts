import { Exercise } from "../types";

// The 3 base test days, shared across every goal and every tier for now —
// real goal-specific content comes later. One common exercise per bodypart,
// plus bodyweight and cardio types mixed in so all 3 logging formats get tested.

// reps on weighted exercises is a strength/powerlifting baseline (lowest realistic
// rep range) — the goal picked at onboarding adds reps on top of it at runtime
// (see GOAL_REP_OFFSET in lib/sms-engine.ts). Bodyweight/cardio reps are unaffected.
export const CHEST_AND_BACK = {
  name: "Chest and Back",
  muscles: "Chest, Back",
  exercises: [
    { name: "Bench Press", sets: 3, reps: 5 },
    // { name: "Push-ups", sets: 3, reps: 15, type: "bodyweight" },
    // { name: "Pull-ups", sets: 3, reps: 8, type: "bodyweight" },
    { name: "Barbell Row", sets: 3, reps: 6 },
  ] satisfies Exercise[],
};

export const ARMS_AND_SHOULDERS = {
  name: "Arms and Shoulders",
  muscles: "Biceps, Triceps, Shoulders",
  exercises: [
    { name: "Preacher Curl", sets: 3, reps: 6 },
    // { name: "Tricep Extension", sets: 3, reps: 6 },
    // { name: "Shoulder Press", sets: 3, reps: 5 },
  ] satisfies Exercise[],
};

export const LEGS_AND_CARDIO = {
  name: "Legs and Cardio",
  muscles: "Legs, Cardio",
  exercises: [
    { name: "Squat", sets: 3, reps: 5 },
    { name: "Leg Press", sets: 3, reps: 6 },
    // { name: "Treadmill", sets: 1, reps: 15, type: "cardio" },
    // { name: "Stairs", sets: 1, reps: 10, type: "cardio" },
  ] satisfies Exercise[],
};
