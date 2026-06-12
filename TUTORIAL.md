# Iron Temple — Build Tutorial

A step-by-step log of how this project was built, for YouTube replication.

## Stack
- Next.js (App Router)
- Tailwind CSS
- TypeScript

---

## Steps

### 1. Project Setup
Bootstrapped with `create-next-app`.

**Key config changes made after setup:**
- Removed dark mode from `app/globals.css` — deleted the `@media (prefers-color-scheme: dark)` block so the app always uses light theme.
- Cleared `app/page.tsx` down to a minimal placeholder component.

---

### 2. Add Prisma
Run the initializer:
```bash
npx prisma@latest init
```

**What it generates:**
- `prisma/schema.prisma` — defines the database provider (PostgreSQL) and the Prisma client output location (`app/generated/prisma`)
- `prisma.config.ts` — config file that points at the schema and reads `DATABASE_URL` from the environment via `dotenv`
- `.env` — holds the `DATABASE_URL` connection string (never commit this)
- `.gitignore` gets `app/generated/prisma` added automatically so generated client files aren't tracked

**Note:** `.env` is already covered by `.env*` in `.gitignore`, so your database credentials won't be committed.

---

### 3. Connect Prisma to Supabase

> Reference: https://www.prisma.io/docs/orm/v6/overview/databases/supabase

Supabase gives you three connection types. You need two:
- **Transaction Pooler** (port 6543, pgBouncer) — for the app at runtime, handles many concurrent connections
- **Direct Connection** (port 5432) — for Prisma CLI commands like `db push` and migrations

Add both to `.env`:
```env
# Used by the app at runtime (via driver adapter)
DATABASE_URL="postgresql://postgres.[project]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Used by Prisma CLI for schema operations
DIRECT_URL="postgresql://postgres.[project]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
```

`prisma.config.ts` always points to `DIRECT_URL` — you never need to swap this manually:
```ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"],
  },
});
```

Push the schema to Supabase:
```bash
npx prisma db push
```

Generate the Prisma client:
```bash
npx prisma generate
```

**Why two URLs?** `db push` needs a direct Postgres connection — pgBouncer (port 6543) hangs because it doesn't support all the commands Prisma CLI needs for schema operations.

---

### 4. Prisma Client Setup

Install the driver adapter for connection pooling at runtime:
```bash
npm install @prisma/adapter-pg
```

Create `lib/db.ts` — this is what your app imports to query the database:
```ts
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

**Why `globalForPrisma`?** Next.js hot reloads modules in dev — without this, a new `PrismaClient` gets created on every save, leading to too many open connections. Storing it on `globalThis` reuses the same instance across reloads. In production it's just a single instance.

**Why `DATABASE_URL!`?** The `!` tells TypeScript the env var is definitely set, avoiding a type error.

---

### 5. Prisma Schema (full)

**Data model overview:**

Two types of data live in the DB:

**Template data** (seeded once, never changes — shared by all users):
- `WorkoutPlan` — the program (e.g. "Arnold Split")
- `WorkoutDay` — one day inside the plan (e.g. Day 1: Chest and Back)
- `PlannedExercise` — an exercise in a day (e.g. Bench Press, 4 sets x 10 reps)

**User data** (created every time someone trains):
- `User` — the athlete
- `UserPlan` — which plan they follow and when (supports switching plans + full history)
- `WorkoutSession` — they showed up and trained on a specific day
- `ExerciseLog` — their result on one exercise (can be skipped)
- `SetLog` — one individual set: weight x reps (e.g. 150lbs x 10)

**Key design decisions:**
- `UserPlan` tracks plan history with `startDate` / `endDate`. `endDate: null` = currently active. To switch plans, set `endDate` on the current row and create a new one.
- Users don't get their own copy of plan data — they reference the same shared `WorkoutPlan` rows via `UserPlan`. 122 users following Arnold all point to one plan row.
- `WorkoutDay` has a `sessions` array because the same day (e.g. Chest Monday) can have many sessions across many users and many weeks.

```prisma
// The athlete. Tracks their sessions and which plans they have followed over time.
model User {
  id           String           @id @default(uuid())
  name         String
  email        String           @unique
  createdAt    DateTime         @default(now())
  sessions     WorkoutSession[]
  planHistory  UserPlan[]
}

// A workout program template (e.g. "Arnold Split"). Seeded once, shared by all users.
model WorkoutPlan {
  id          String       @id @default(uuid())
  name        String
  days        WorkoutDay[]
  userHistory UserPlan[]
}

// Tracks which plan a user is following and when. Null endDate means currently active.
model UserPlan {
  id        String      @id @default(uuid())
  user      User        @relation(fields: [userId], references: [id])
  userId    String
  plan      WorkoutPlan @relation(fields: [planId], references: [id])
  planId    String
  startDate DateTime    @default(now())
  endDate   DateTime?
}

// One day inside a WorkoutPlan (e.g. Day 1: Chest and Back). Seeded once, never changes.
model WorkoutDay {
  id        String            @id @default(uuid())
  day       Int
  name      String
  muscles   String
  plan      WorkoutPlan       @relation(fields: [planId], references: [id])
  planId    String
  exercises PlannedExercise[]
  sessions  WorkoutSession[]
}

// A single exercise inside a WorkoutDay template (e.g. Bench Press, 4 sets x 10 reps).
model PlannedExercise {
  id           String        @id @default(uuid())
  name         String
  targetSets   Int
  targetReps   Int
  order        Int
  workoutDay   WorkoutDay    @relation(fields: [workoutDayId], references: [id])
  workoutDayId String
  logs         ExerciseLog[]
}

// Created each time a user trains. Links a user to a WorkoutDay on a specific date.
model WorkoutSession {
  id           String        @id @default(uuid())
  date         DateTime      @default(now())
  user         User          @relation(fields: [userId], references: [id])
  userId       String
  workoutDay   WorkoutDay    @relation(fields: [workoutDayId], references: [id])
  workoutDayId String
  exercises    ExerciseLog[]
}

// The user's result on one exercise during a session. skipped = machine was busy.
model ExerciseLog {
  id                String          @id @default(uuid())
  order             Int
  skipped           Boolean         @default(false)
  session           WorkoutSession  @relation(fields: [sessionId], references: [id])
  sessionId         String
  plannedExercise   PlannedExercise @relation(fields: [plannedExerciseId], references: [id])
  plannedExerciseId String
  sets              SetLog[]
}

// One individual set (e.g. 150lbs x 10 reps). Four rows = four sets done.
model SetLog {
  id            String      @id @default(uuid())
  setNumber     Int
  weight        Float
  reps          Int
  exerciseLog   ExerciseLog @relation(fields: [exerciseLogId], references: [id])
  exerciseLogId String
}
```

---

### 6. Workout Split Data Files

Static files in `lib/data/` hold the raw split data for each athlete. These are used **only by the seed script** — not imported by the app at runtime. Once seeded, the DB is the source of truth.

- `lib/data/arnold.ts` — Arnold's 6-day split (Chest/Back, Shoulders/Arms, Legs × 2)
- `lib/data/ronnie.ts` — Ronnie Coleman's split (Back/Biceps/Calves, Chest/Triceps, Legs, Shoulders/Traps, + variations)

Both export a `SplitDay[]` array and a helper to get a day by number. `ronnie.ts` reuses the `SplitDay` type from `arnold.ts` to avoid duplication.

**Why static files instead of hardcoding in the seed?**
Keeps the seed script clean and makes it easy to add more athletes (Jay Cutler, etc.) by just adding a new file.

---

### 7. Seeding the Database

Seed data = the workout plan templates (Arnold, Ronnie). Run once, never again unless you add a new plan.

**Step 1 — Configure the seed command in `prisma.config.ts`:**

Prisma v7 reads the seed command from `prisma.config.ts`, not `package.json`:
```ts
migrations: {
  path: "prisma/migrations",
  seed: "npx tsx prisma/seed.ts",
},
```

**Step 2 — Create `prisma/seed.ts`:**
```ts
import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { ARNOLD_SPLIT } from "../lib/data/arnold";
import { RONNIE_SPLIT } from "../lib/data/ronnie";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

async function seed() {
  console.log("Seeding database...");

  const plans = [
    { name: "Arnold Split", days: ARNOLD_SPLIT },
    { name: "Ronnie Coleman Split", days: RONNIE_SPLIT },
  ];

  for (const plan of plans) {
    const created = await prisma.workoutPlan.create({
      data: {
        name: plan.name,
        days: {
          create: plan.days.map((day) => ({
            day: day.day,
            name: day.name,
            muscles: day.muscles,
            exercises: {
              create: day.exercises.map((exercise, index) => ({
                name: exercise.name,
                targetSets: exercise.sets,
                targetReps: exercise.reps,
                order: index + 1,
              })),
            },
          })),
        },
      },
    });

    console.log(`Created plan: ${created.name} (${created.id})`);
  }

  console.log("Done.");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Step 3 — Run it:**
```bash
npx prisma db seed
```

**Notes:**
- The seed script uses `DIRECT_URL` (not `DATABASE_URL`) since it's a one-time CLI operation, not app traffic
- The seed script creates its own `PrismaClient` — it does not use `lib/db.ts`
- Prisma nests the creates — one `workoutPlan.create()` call creates the plan, all its days, and all exercises in a single operation
- Only run this once. Running it again will create duplicate plans. If you need to re-seed, delete the existing rows in Supabase first.

---

### 8. Chat UI + Message API

The whole app is a fake SMS interface — looks like an iPhone text thread. No pages, no navigation. Just one chat screen.

**Install shadcn and components:**
```bash
npx shadcn@latest init -d
npx shadcn@latest add input scroll-area
```

---

**`app/page.tsx` — the chat UI**

Client component that tracks two pieces of state:
- `state` — where in the conversation the user is (`phone`, `idle`, `onboarding_name`, `onboarding_plan`, `workout_ready`, `exercise_active`)
- `context` — data carried between steps (name, plans, exercises, sessionId, exerciseIndex)

Every message the user sends hits `POST /api/message` with `{ phone, text, state, context }`. The API replies with `{ reply, nextState, context }` and the UI updates.

The first message is always the phone number — handled client-side without hitting the API.

---

**`app/api/message/route.ts` — the brain**

One POST route that acts as a state machine:

| State | Input | Action |
|---|---|---|
| `idle` | `JOIN` | Check if phone exists → start onboarding |
| `idle` | `HERE` | Look up user → load active plan → get today's day → show exercises |
| `onboarding_name` | any text | Save name, fetch plans from DB, ask user to pick |
| `onboarding_plan` | `1` or `2` | Create `User` + `UserPlan` in DB |
| `workout_ready` | `START` | Create `WorkoutSession` in DB, show first exercise |
| `exercise_active` | `150x10 160x8` | Parse sets → save `ExerciseLog` + `SetLog` rows → show next exercise |
| `exercise_active` | `SKIP` | Save skipped `ExerciseLog` → show next exercise |

**Day of week mapping:**
```ts
// JS getDay(): 0=Sun, 1=Mon ... 6=Sat
// Maps to workout day number (0 = rest day)
{ 1:1, 2:2, 3:3, 4:4, 5:5, 6:6, 0:0 }
```

**Set parsing:**
```ts
// Input: "150x10 160x8 170x6"
text.trim().split(/\s+/).map((s, i) => {
  const [weight, reps] = s.split("x").map(Number);
  return { setNumber: i + 1, weight, reps };
});
```

---

### 9. Set Parsing + Last Session Numbers

Two improvements to the message API:

**Fix 1 — Robust set parsing**

The original parser broke on `150 x 10` (spaces around x), commas, capital X, or non-numeric input. New parser normalizes first:

```ts
function parseSets(text: string): SetEntry[] | null {
  const normalized = text.toLowerCase().replace(/,/g, " ").replace(/\s*x\s*/g, "x").trim();
  const tokens = normalized.split(/\s+/);
  const sets: SetEntry[] = [];
  for (const token of tokens) {
    const parts = token.split("x");
    if (parts.length !== 2) return null;
    const weight = parseFloat(parts[0]);
    const reps = parseInt(parts[1]);
    if (isNaN(weight) || isNaN(reps) || weight <= 0 || reps <= 0) return null;
    sets.push({ setNumber: sets.length + 1, weight, reps });
  }
  return sets.length > 0 ? sets : null;
}
```

If parsing fails, the bot replies with instructions instead of crashing.

**Fix 2 — Show last session's numbers**

When showing each exercise, query the most recent `ExerciseLog` for that user + exercise combo and display the sets they hit last time:

```
Bench Press — 4 sets x 10 reps
Last time: 150x10 160x8 170x6 160x8
Log your sets (e.g. 150x10 160x8) or type SKIP
```

This gives bodybuilders a target to beat every session.

```ts
async function getLastSets(userId: string, plannedExerciseId: string) {
  const lastLog = await prisma.exerciseLog.findFirst({
    where: { plannedExerciseId, skipped: false, session: { userId } },
    orderBy: { session: { date: "desc" } },
    include: { sets: { orderBy: { setNumber: "asc" } } },
  });
  return lastLog?.sets ?? [];
}
```

---

### 10. History Page

A simple session list at `/history`. Shows all past workouts for the current user — date, day name, exercises done vs skipped. Tap any session to expand and see the sets.

**`app/api/sessions/route.ts`** — GET endpoint, looks up sessions by phone:
```ts
const sessions = await prisma.workoutSession.findMany({
  where: { user: { phone } },
  orderBy: { date: "desc" },
  include: {
    workoutDay: true,
    exercises: {
      include: { plannedExercise: true, sets: { orderBy: { setNumber: "asc" } } },
      orderBy: { order: "asc" },
    },
  },
});
```

**`app/history/page.tsx`** — client component that:
1. Reads phone from `localStorage` on mount
2. Fetches sessions from the API
3. Renders a collapsible card per session — date, day name, done/skipped count
4. Expands to show each exercise and its sets (`150x10 160x8 ...`)

Phone is saved to `localStorage` on the chat page when first entered, so the history page knows who you are without asking again.

---

### 11. Phone Lookup on Entry + User Recognition

When a phone number is entered, the app now checks the DB immediately and responds personally:

```ts
// In page.tsx — phone step
const res = await fetch(`/api/user?phone=${encodeURIComponent(text)}`);
const data = await res.json();
if (data.user) {
  addMessage({ from: "bot", text: `Hey ${data.user.name}! 👋 Type HERE when you're at the gym.` });
} else {
  addMessage({ from: "bot", text: `Welcome! Type JOIN to sign up.` });
}
```

**`app/api/user/route.ts`** — simple GET that returns the user by phone or null.

---

### 12. Day Simulator (Dev Toolbar)

Since workouts depend on the real day of the week, testing all 6 days would require waiting 6 days. A toolbar above the phone frame lets you pick any day instantly.

The selected day (`simDay`) is passed with every message to the API:
```ts
body: JSON.stringify({ phone, text, state, context, simDay })
```

The API uses it instead of the real day:
```ts
function getTodayWorkoutDay(simDay?: number): number {
  const map = { 1:1, 2:2, 3:3, 4:4, 5:5, 6:6, 0:0 };
  const day = simDay !== undefined ? simDay : new Date().getDay();
  return map[day];
}
```

The toolbar also has a **History** link so you can jump between chat and history without navigating manually.

---

### 13. Plan Name in History + CHANGE Command

**History — show plan name per session**

Updated the sessions API to include the plan via nested relation:
```ts
workoutDay: { include: { plan: true } }
```
Each session card now shows three lines: day name, plan name (Arnold Split / Ronnie Coleman Split), and date.

---

**CHANGE command — switch plans mid-journey**

User texts `CHANGE` from idle → bot shows all plans with current one marked → user picks a number → old `UserPlan` gets `endDate` set to today, new `UserPlan` created.

```ts
// Close current plan
await prisma.userPlan.update({
  where: { id: currentUserPlanId },
  data: { endDate: new Date() },
});

// Open new plan
await prisma.userPlan.create({
  data: {
    user: { connect: { phone } },
    plan: { connect: { id: newPlan.id } },
  },
});
```

Full history is preserved — old sessions still reference the old plan's workout days. Only future sessions use the new plan.

---

### 14. Commands Popover

A **Commands** button in the dev toolbar opens a popover listing all available commands, what they do, and when to use them.

| Command | When | Description |
|---|---|---|
| JOIN | Any time | Sign up with your phone number |
| HERE | Any time | Start today's workout |
| CHANGE | Any time | Switch to a different plan |
| START | After HERE | Begin the exercise list |
| SKIP | During workout | Skip the current exercise |

Built with shadcn `Popover` component:
```bash
npx shadcn@latest add popover
```

Adding new commands later is just one more entry in the list array.

---

### 15. Personal Records Page

A `/prs` page showing the heaviest weight Henry has ever lifted per exercise, across all plans and all time.

**`app/api/prs/route.ts`** — queries every `SetLog` for the user, groups by exercise name, keeps the max weight:

```ts
const sets = await prisma.setLog.findMany({
  where: { exerciseLog: { skipped: false, session: { user: { phone } } } },
  include: {
    exerciseLog: {
      include: {
        plannedExercise: true,
        session: { select: { date: true } },
      },
    },
  },
});

const prMap = new Map<string, { weight: number; reps: number; date: string }>();
for (const set of sets) {
  const name = set.exerciseLog.plannedExercise.name;
  const existing = prMap.get(name);
  if (!existing || set.weight > existing.weight) {
    prMap.set(name, { weight: set.weight, reps: set.reps, date: set.exerciseLog.session.date.toISOString() });
  }
}
```

**Why group by exercise name?** PRs are personal — the name is what matters, not which plan or day the exercise belongs to. Switching from Arnold to Ronnie doesn't reset your Bench Press PR.

**`app/prs/page.tsx`** — reads phone from `localStorage`, fetches `/api/prs`, renders each exercise alphabetically with weight, reps, and date the PR was set.

---

### 16. Monthly Progress Report (Email Page)

A `/email` page that looks like a real coach email — styled dark header, clean card layout. Shows four metrics for the current month.

**`app/api/report/route.ts`** — computes everything server-side:

**1. Attendance**
Counts unique session days this month vs the total possible Mon–Sat days in the month so far:
```ts
const uniqueDays = new Set(sessions.map((s) => s.date.toDateString())).size;
```

**2. Top 3 Improvements**
Groups all sets by exercise name → tracks max weight per calendar day → compares first day max vs last day max:
```ts
// exerciseMap: Map<exerciseName, Map<dayString, maxWeight>>
const days = Array.from(dayMap.entries()).sort(by date);
const first = days[0][1];       // max weight on first day
const last  = days.at(-1)[1];   // max weight on last day
return { name, from: first, to: last, delta: last - first };
```
Only shows exercises where `delta > 0`. Sorted by biggest gain. Handles plan switches — same exercise name across plans counts as one.

**3. Total Volume**
Sum of `weight × reps` across every set this month.

**4. Streak**
Walks backwards from today, counting consecutive non-Sunday days that have a session. Stops at the first gap.

**`app/email/page.tsx`** — reads phone from `localStorage`, fetches the report, renders:
- Attendance with a motivational line based on % ("Incredible consistency" / "Solid month" / etc.)
- Top 3 improvements showing `from → to lbs +delta`
- Total volume in lbs
- Streak with a motivational line

---

### 17. Workout Data Simulation

To test the email and history pages without waiting weeks, `prisma/simulate.ts` seeds fake workout history for a user with progressive overload — weights go up each week so the report shows real improvements.

```bash
npx tsx prisma/simulate.ts
```

**What it does:**
- Fetches the user (by phone) and their active plan
- Generates 4 weeks of Mon–Sat sessions (mapping weekday → Ronnie Split day number)
- For each exercise, applies `base weight + weekIndex × increment` (e.g. Barbell Back Squat: 275 → 295 → 315 → 335 lbs)
- Skips dates that already have a session (idempotent — safe to re-run)

**Sample result in the email:**
- Attendance: 9 / 11 days this month
- Top improvement: Barbell Back Squat 315 → 335 lbs (+20)
- Streak: 4 days in a row

The script lives at `prisma/simulate.ts` alongside `seed.ts`. It uses `DIRECT_URL` directly (same pattern as the seed).

---

### 18. History Page — Week Navigation

The history page now shows 7 days at a time with back/next buttons instead of a flat list of all sessions.

**State:** `weekOffset` (0 = this week, -1 = last week, etc.)

**Week window calculation:**
```ts
function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

const weekStart = getMondayOf(today) + weekOffset * 7 days;
const weekEnd   = weekStart + 6 days (Sunday 23:59:59);
```

Sessions are filtered client-side — all sessions are fetched once, then sliced by week on each navigation.

**Navigation rules:**
- **← Back** — disabled if no sessions exist before the current window
- **Next →** — hidden when `weekOffset === 0` (you can't go to the future)
- Label shows "This Week", "Last Week", or the date range for older weeks
- Expanding a session collapses when you navigate to a different week

<!-- New steps get added below this line as you build -->
