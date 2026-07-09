import { Exercise } from "../types";

// One body part per entry (not paired like shared-test/days.ts) — the picking
// library for the custom workout builder. Someone building their own split picks
// a body part for a day, then picks exercises from that body part's list here.
// 2 exercises each for now; expand per body part once the builder is real.

// reps on weighted exercises is a strength/powerlifting baseline (lowest realistic
// rep range) — the goal picked at onboarding adds reps on top of it at runtime
// (see GOAL_REP_OFFSET in lib/sms-engine.ts). Bodyweight/cardio reps are unaffected.
export const CHEST = {
  name: "Chest",
  muscles: "Chest",
  exercises: [
    { name: "Bench Press", sets: 3, reps: 5 },
    { name: "Incline Dumbbell Press", sets: 3, reps: 6 },
    { name: "Push-ups", sets: 3, reps: 15, type: "bodyweight" },
  ] satisfies Exercise[],
};

export const BACK = {
  name: "Back",
  muscles: "Back",
  exercises: [
    { name: "Barbell Row", sets: 3, reps: 6 },
    { name: "Lat Pulldown", sets: 3, reps: 6 },
    { name: "Pull-ups", sets: 3, reps: 8, type: "bodyweight" },
  ] satisfies Exercise[],
};

export const LEGS = {
  name: "Legs",
  muscles: "Legs",
  exercises: [
    { name: "Squat", sets: 3, reps: 5 },
    { name: "Leg Press", sets: 3, reps: 6 },
  ] satisfies Exercise[],
};

export const SHOULDERS = {
  name: "Shoulders",
  muscles: "Shoulders",
  exercises: [
    { name: "Shoulder Press", sets: 3, reps: 5 },
    { name: "Lateral Raise", sets: 3, reps: 6 },
  ] satisfies Exercise[],
};

export const BICEPS = {
  name: "Biceps",
  muscles: "Biceps",
  exercises: [
    { name: "Barbell Curl", sets: 3, reps: 6 },
    { name: "Preacher Curl", sets: 3, reps: 6 },
  ] satisfies Exercise[],
};

export const TRICEPS = {
  name: "Triceps",
  muscles: "Triceps",
  exercises: [
    { name: "Close Grip Bench Press", sets: 3, reps: 5 },
    { name: "Tricep Extension", sets: 3, reps: 6 },
  ] satisfies Exercise[],
};

export const ABS = {
  name: "Abs",
  muscles: "Abs",
  exercises: [
    { name: "Crunches", sets: 3, reps: 20, type: "bodyweight" },
    { name: "Hanging Leg Raise", sets: 3, reps: 12, type: "bodyweight" },
  ] satisfies Exercise[],
};

// Cardio reps means minutes, not rep count — sets is a required-but-unused
// placeholder (see GOAL_REP_OFFSET comment in lib/sms-engine.ts). The builder
// lets someone override this default minute count per exercise before saving.
export const CARDIO = {
  name: "Cardio",
  muscles: "Cardio",
  exercises: [
    { name: "Treadmill", sets: 1, reps: 15, type: "cardio" },
    { name: "Stairs", sets: 1, reps: 10, type: "cardio" },
  ] satisfies Exercise[],
};

// The full picking library, in one place — what the builder page renders
// (body part -> its exercise options). Plain data, no server dependency, safe
// to import directly from a client component.
export const BODY_PARTS = [CHEST, BACK, LEGS, SHOULDERS, BICEPS, TRICEPS, ABS, CARDIO];
