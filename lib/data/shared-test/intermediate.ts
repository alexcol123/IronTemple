import { SplitDay } from "../types"
import { CHEST_AND_BACK, ARMS_AND_SHOULDERS, LEGS_AND_CARDIO } from "./days"

// Intermediate — 4 days/week: 1, 2, 3, then Day 1 repeats as Day 4.
export const SHARED_TEST_INTERMEDIATE_SPLIT: SplitDay[] = [
  { day: 1, ...CHEST_AND_BACK },
  { day: 2, ...ARMS_AND_SHOULDERS },
  { day: 3, ...LEGS_AND_CARDIO },
  { day: 4, ...CHEST_AND_BACK },
]
