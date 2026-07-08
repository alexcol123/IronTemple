import { SplitDay } from "../types";
import { CHEST_AND_BACK } from "./days";

//import { CHEST_AND_BACK, ARMS_AND_SHOULDERS, LEGS_AND_CARDIO } from "./days

// Beginner — 3 days/week, no repeats.
export const SHARED_TEST_BEGINNER_SPLIT: SplitDay[] = [
  { day: 1, ...CHEST_AND_BACK },
  // { day: 2, ...ARMS_AND_SHOULDERS },
  // { day: 3, ...LEGS_AND_CARDIO },
];
