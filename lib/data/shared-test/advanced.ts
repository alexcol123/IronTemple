import { SplitDay } from "../types"
import { CHEST_AND_BACK, ARMS_AND_SHOULDERS, LEGS_AND_CARDIO } from "./days"

// Advanced — 5 days/week: 1, 2, 3, then Day 1 and Day 2 repeat as Day 4 and Day 5.
export const SHARED_TEST_ADVANCED_SPLIT: SplitDay[] = [
  { day: 1, ...CHEST_AND_BACK },
  { day: 2, ...ARMS_AND_SHOULDERS },
  { day: 3, ...LEGS_AND_CARDIO },
  { day: 4, ...CHEST_AND_BACK },
  { day: 5, ...ARMS_AND_SHOULDERS },
]
