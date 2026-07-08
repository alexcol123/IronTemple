# Arnold — Personal Bodybuilding Tracker (Light Version)

## The Concept
A stripped-down personal version of TrackRep for solo use. No gym, no leaderboard, no other members. Just you, Arnold as your coach, and the classic Schwarzenegger 6-day split. You text your sets as you go. Arnold responds. Sunday you get your weekly recap.

## The Split — Arnold Schwarzenegger Variation #1
Each major bodypart trained 2x per week. Source: The New Encyclopedia of Modern Bodybuilding by Arnold Schwarzenegger and Bill Dobbins.

| Day | Muscle Groups |
|---|---|
| Day 1 | Chest and Back |
| Day 2 | Shoulders and Arms |
| Day 3 | Legs and Lower Back |
| Day 4 | Chest and Back |
| Day 5 | Shoulders and Arms |
| Day 6 | Legs and Lower Back |
| Day 7 | Rest |

**Note:** Attempt to reach failure around 10 reps for your first set of each exercise.

---

## The Workouts

### Chest & Back (Day 1 + Day 4)

| Exercise | Sets | Rep Goal |
|---|---|---|
| Bench Press | 3-4 | 10 |
| Incline Bench Press | 3-4 | 10 |
| Dumbbell Pullovers | 3-4 | 10 |
| Chin Up | 3-4 | 10 |
| Bent Over Row | 3-4 | 10 |
| Deadlift | 3-4 | 10 |
| Crunches | 5 | 25 |

### Shoulders & Arms (Day 2 + Day 5)

| Exercise | Sets | Rep Goal |
|---|---|---|
| Barbell Clean and Press | 3-4 | 10 |
| Dumbbell Lateral Raise | 3-4 | 10 |
| Upright Row | 3-4 | 10 |
| Military Press | 3-4 | 10 |
| Standing Barbell Curl | 3-4 | 10 |
| Seated Dumbbell Curl | 3-4 | 10 |
| Close Grip Bench Press | 3-4 | 10 |
| Standing Barbell Tricep Extension | 3-4 | 10 |
| Wrist Curls | 3-4 | 10 |
| Reverse Wrist Curls | 3-4 | 10 |
| Reverse Crunch | 5 | 25 |

### Legs & Lower Back (Day 3 + Day 6)

| Exercise | Sets | Rep Goal |
|---|---|---|
| Squat | 3-4 | 10 |
| Lunge | 3-4 | 10 |
| Leg Curl | 3-4 | 10 |
| Stiff Leg Deadlift | 3-4 | 10 |
| Good Mornings | 3-4 | 10 |
| Standing Calf Raise | 3-4 | 10 |
| Crunches | 5 | 25 |

---

## How It Works (SMS Flow)

### Setup — One Time
You text the number:

> "START ARNOLD"

System responds:

> "Welcome back to the gym. I am Arnold. We train 6 days. We rest one. No excuses. What is your name?"

You reply with your name. Done. System knows your split, loads Day 1 automatically.

---

### Daily Flow

You walk into the gym and text:

> "here"

Arnold responds with today's workout from the split — whichever day you're on — and lists every exercise with target sets and reps.

> "Today is Day 1 — Chest and Back. You have 7 exercises. We start with Bench Press. 3 sets of 10. Log each set. Go."

You log as you go during rest periods:

> "bench 185x10"
> "bench 185x8"
> "bench 185x7"

Arnold responds after each set with encouragement and tracks your progress.

When you finish an exercise:

> "next"

Arnold loads the next exercise in the sequence.

When you finish the whole workout:

> "done"

Arnold gives you a session summary and tells you what Day comes next.

---

### Progressive Overload — The Key Feature
System remembers every set from every session. When you come back to Chest and Back on Day 4 it tells you exactly what you hit on Day 1 and what to aim for this time.

> "Last session Bench Press: 185x10, 185x8, 185x7. This session target: 185x10 all three sets. Then we go up."

---

### Sunday Recap
Every Sunday morning you get:

> "Last week Henry:
>
> ✅ Day 1 — Chest and Back — Complete
> ✅ Day 2 — Shoulders and Arms — Complete
> ✅ Day 3 — Legs and Lower Back — Complete
> ✅ Day 4 — Chest and Back — Complete
> ❌ Day 5 — Missed
> ❌ Day 6 — Missed
>
> Top lifts this week:
> Bench Press — 195x10 PR 🏆
> Squat — 225x10 PR 🏆
>
> 4 out of 6 days. You did not finish what you started. Champions do not miss Day 5. Next week we go 6 for 6. Now get some sleep."

---

## What Gets Tracked
- Every set, every rep, every weight per exercise
- PRs — auto-detected when weight or reps exceed previous best
- Session completion — which days were hit and which were missed
- Weekly volume per muscle group
- Progressive overload targets — system calculates next session's target weight automatically

---

## What to Build (Minimal Version)

This is a personal test build — no multi-tenant, no gym owner dashboard, no Stripe, no leaderboard. Just one user, one number, one split.

### Build Order
1. START ARNOLD — onboarding, name capture, day counter initialized to Day 1
2. HERE — load today's workout from the split based on current day counter
3. Exercise logging — "bench 185x10" parsed and stored
4. NEXT — advance to next exercise in today's workout
5. DONE — session complete, increment day counter, tell user what's next
6. PR detection — compare to previous session, flag new PRs
7. Sunday recap — cron job, weekly summary with Arnold tone
8. Progressive overload suggestion — pre-session target based on last session

### What You Skip For Now
- Multi-tenant (just you)
- Stripe billing
- Leaderboard
- Dashboard
- QR code onboarding
- Wellness mode
- Coach commands

---

## Why Build This First
Before walking into a CrossFit box you need to know the product works under real conditions. Your own training is the perfect test environment. You will find every edge case — skipped exercises, wrong format texts, rest days, missed days, PR moments — before a real paying client does.

You are not just testing the code. You are living the product. That makes the CrossFit pitch real because when the owner asks "does this actually work" you say "I've been using it for 3 weeks, here's my bench press progression" and show him your phone.

**Ship this in 3 days. Use it for 2 weeks. Then go close the CrossFit gym.**

---

## Technical Architecture

### Decision — Start From Scratch (Do Not Copy PennyRep)

PennyRep stays completely untouched. New repo. New Supabase project. Same Twilio number.

**Why not copy PennyRep:**
- PennyRep has 80+ files — Clerk auth, Vapi, IVR, admin panel, dashboard, multi-tenant logic, booking engine
- Stripping all that out takes longer than starting clean
- You spend 2 days deleting code instead of 2 days building
- Risk of accidentally breaking PennyRep while cleaning up

**Why start from scratch:**
- Arnold needs maybe 8 files total
- You ship in 3 days clean vs 5-6 days stripping PennyRep
- Zero risk to PennyRep — it keeps running untouched
- Clean codebase you fully understand from line 1

**PennyRep is reference only.** Open it when you need to remember how to wire Twilio or call Claude Haiku. Copy a snippet if needed. Never modify it.

---

### What You Borrow From PennyRep (Copy Snippets Only)
- How the Twilio SMS webhook receives inbound texts (`/api/twilio/sms`)
- How Claude Haiku is called and prompted
- How Vercel cron jobs are structured
- Prisma client setup and connection string pattern

Everything else you write fresh.

---

### The 8 Files You Need

| File | What it does |
|---|---|
| `prisma/schema.prisma` | 3 tables — User, Session, Set |
| `data/split.ts` | Arnold split hardcoded as JSON — exercises per day |
| `lib/arnold-prompt.ts` | Arnold's voice — system prompt for Claude Haiku |
| `lib/workout.ts` | Core logic — load today's workout, log sets, detect PRs |
| `lib/day-counter.ts` | Tracks which day of the split user is on |
| `app/api/twilio/sms/route.ts` | Receives inbound texts, routes to workout logic |
| `app/api/cron/sunday/route.ts` | Weekly recap cron job — fires Sunday morning |
| `.env` | Twilio, Supabase, Anthropic keys |

---

### The 3 Database Tables

**users**
```
id
phone        — E.164 format, used to identify who is texting
name
currentDay   — 1 through 6, resets after Day 7 rest
startDate
```

**sessions**
```
id
userId
dayNumber    — 1-6
date
completed    — boolean
```

**sets**
```
id
sessionId
exercise     — "Bench Press"
weight       — number
reps         — number
setNumber    — 1, 2, 3
```

---

### The Arnold Prompt (Claude Haiku)

Arnold's voice is everything. This is what makes the product feel alive vs just a logging tool. The system prompt tells Claude Haiku to respond as Arnold Schwarzenegger — direct, motivating, old-school bodybuilding philosophy. Short sentences. No fluff. Occasional famous Arnold phrases used naturally not forced.

Examples of correct Arnold tone:
- "185 for 10. Good. Now do it again."
- "You missed Day 5. Champions do not miss Day 5."
- "That is a new personal record. This is what we came here for."
- "The pump is the most satisfying feeling you can get in the gym. You earned it today."

Examples of wrong tone:
- "Great job! Keep it up! You're doing amazing!" — too soft
- "YEAH BUDDY LIGHTWEIGHT BABY" — that's Ronnie, not Arnold
- Long paragraphs — Arnold speaks in short punches

---

### Same Twilio Number as PennyRep

One Twilio number handles both apps. The SMS handler checks the inbound phone number against both databases:

```
Inbound text arrives
→ Check if phone exists in PennyRep DB → route to PennyRep logic
→ Check if phone exists in Arnold DB → route to Arnold logic
→ Neither → unknown sender, ignore or reply with instructions
```

Zero conflict. Zero extra cost. Same number, two completely separate apps running in parallel.

**Note:** This means both apps live in separate repos but share the same Twilio webhook URL. PennyRep's SMS route needs one added check at the top — if the sender is you (your personal number), hand off to Arnold. Everything else flows normally through PennyRep.

---

### New Supabase Project

Create a brand new Supabase project — do not use PennyRep's database. Separate connection string, separate tables, completely isolated. If something breaks in Arnold it cannot touch PennyRep data.

---

### Environment Variables Needed

```
TWILIO_ACCOUNT_SID        — same as PennyRep
TWILIO_AUTH_TOKEN         — same as PennyRep
TWILIO_FROM_NUMBER        — same as PennyRep
ANTHROPIC_API_KEY         — same as PennyRep
DATABASE_URL              — NEW Supabase project connection string
MY_PHONE_NUMBER           — your E.164 number, used to route texts to Arnold
```

---

### Build Order (3 Days)

**Day 1:**
1. New Next.js repo — `npx create-next-app@latest arnold`
2. Install Prisma, Twilio SDK, Anthropic SDK
3. Write schema — 3 tables, run `prisma db push`
4. Write `data/split.ts` — Arnold's 6-day split as JSON
5. Write `lib/arnold-prompt.ts` — Arnold's voice

**Day 2:**
6. Write `lib/workout.ts` — load today's exercises, log a set, detect PR
7. Write `lib/day-counter.ts` — advance day, handle rest day, reset after 7
8. Write `/api/twilio/sms` — receive text, identify command, respond as Arnold
9. Test locally with ngrok — text your number, go through the flow

**Day 3:**
10. Write `/api/cron/sunday` — weekly recap logic
11. Deploy to Vercel
12. Update PennyRep SMS handler to check your number first and hand off
13. Test end to end on your real phone
14. Go to the gym. Use it for real.

---

### Commands Arnold Understands

| You text | What happens |
|---|---|
| `start` | Onboarding — asks your name, initializes Day 1 |
| `here` | Loads today's workout, lists all exercises |
| `bench 185x10` | Logs set — exercise, weight, reps |
| `next` | Moves to next exercise in today's list |
| `done` | Completes session, advances day counter |
| `skip` | Skips current exercise, moves to next |
| `rest` | Marks today as rest day (Day 7), resets to Day 1 tomorrow |
| `progress` | Shows last session's numbers for today's exercises |
| `pr` | Shows all time PRs for every exercise |
