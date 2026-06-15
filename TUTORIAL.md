# Iron Temple — Build Tutorial

A step-by-step log of how this project was built, for YouTube replication.

## Stack

- Next.js (App Router)
- Tailwind CSS
- TypeScript
- Prisma ORM
- Supabase (PostgreSQL)
- shadcn/ui

---

## Steps

### 1. Project Setup

Bootstrap with `create-next-app`:

```bash
npx create-next-app@latest irontemple --typescript --tailwind --eslint --app --src-dir=no --import-alias="@/*"
cd irontemple
npm run dev
```

**Config changes after setup:**

- Remove dark mode from `app/globals.css` — delete the `@media (prefers-color-scheme: dark)` block so the app always uses light theme.
- Clear `app/page.tsx` down to a minimal placeholder component.

---

### 2. Add Prisma

```bash
npm install @prisma/client@latest
npm install --save-dev prisma dotenv
npx prisma@latest init
```

**What it generates:**

- `prisma/schema.prisma` — defines the database provider and Prisma client output location
- `prisma.config.ts` — config file that reads `DATABASE_URL` from the environment
- `.env` — holds your connection strings (never commit this)
- `.gitignore` gets `app/generated/prisma` added automatically

---

### 3. Connect Prisma to Supabase

> References: https://supabase.com/docs/guides/database/prisma · https://www.prisma.io/docs/orm/reference/prisma-config-reference

**This app deploys to Vercel (serverless).** You need two connection strings from Supabase:

- **`DATABASE_URL`** — Transaction pooler (port 6543). Used by the app at runtime on Vercel. Serverless functions can't hold long-lived connections, so they go through the pooler.
- **`DIRECT_URL`** — Session pooler (port 5432). Used by `prisma.config.ts` for CLI operations (`db push`, `seed`, `migrate`). The Supabase docs confirm: _"If you are using a serverless environment, change the data source URL to `DIRECT_URL`."_

Install dotenv so `prisma.config.ts` can read your `.env` file:

```bash
npm install --save-dev dotenv
```

Add both to `.env`. **If your password contains special characters** (`+`, `/`, `$`, `@`, etc.), URL-encode them first — e.g. `+` → `%2B`, `/` → `%2F`, `$` → `%24`. This is called **percent encoding**.

```env
# Vercel runtime — transaction pooler (port 6543)
DATABASE_URL="postgresql://postgres.[project]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Prisma CLI — session pooler (port 5432)
DIRECT_URL="postgresql://postgres.[project]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
```

Update `prisma.config.ts` to use `DIRECT_URL`:

```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
```

Push the schema and generate the client:

```bash
npx prisma db push
npx prisma generate
```

**Why two URLs?** `db push` needs a direct Postgres connection — pgBouncer hangs because it doesn't support all the commands Prisma CLI needs for schema operations.

---

### 4. Prisma Client Setup

Install the driver adapter:

```bash
npm install @prisma/adapter-pg
```

**Why `@prisma/adapter-pg`?** By default Prisma uses its own built-in database driver. This package replaces it with `pg` (node-postgres), which handles connections properly in serverless environments like Vercel. Without it, your app can exhaust the connection pool on Vercel because serverless functions spin up and down constantly. It's what makes `new PrismaPg({ connectionString: process.env.DATABASE_URL })` work in `lib/db.ts`.

Create `lib/db.ts`:

```ts
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

**Why `globalForPrisma`?** Next.js hot reloads modules in dev — without this, a new `PrismaClient` gets created on every save, leading to too many open connections.

---

### 5. Prisma Schema (full)

**Test your connection first.** Before adding the full schema, add just the `User` model and push it to confirm Supabase is connected:

```prisma
model User {
  id        String   @id @default(uuid())
  name      String
  phone     String   @unique
  email     String?
  createdAt DateTime @default(now())
}
```

Then run:

```bash
npx prisma db push      # pushes changes to the database
npx prisma generate     # regenerates the TypeScript client to match
```

**Always run both together** — `db push` updates the tables in Supabase, `prisma generate` updates the TypeScript types in `app/generated/prisma` so your code knows about the changes. Skip `generate` and TypeScript won't see the new fields.

If it succeeds, you'll see the `User` table appear in your Supabase dashboard under **Table Editor**. That confirms your connection strings are correct and Prisma can talk to your database. Once confirmed, replace the full schema below.

---

**Data model overview:**

Two types of data live in the DB:

**Template data** (seeded once, never changes — shared by all users):

- `WorkoutPlan` — the program (e.g. "Arnold Split")
- `WorkoutDay` — one day inside the plan (e.g. Day 1: Chest and Back)
- `PlannedExercise` — an exercise in a day (e.g. Bench Press, 4 sets x 10 reps)

**User data** (created every time someone trains):

- `User` — the athlete, identified by phone number
- `UserPlan` — which plan they follow and when (supports switching plans)
- `WorkoutSession` — they showed up and trained on a specific day
- `ExerciseLog` — their result on one exercise (can be skipped)
- `SetLog` — one individual set: weight x reps (e.g. 150lbs x 10)

**Key design decisions:**

- `User` is identified by `phone`, not email. The whole app is built around phone-based lookup.
- `UserPlan` tracks plan history with `startDate` / `endDate`. `endDate: null` = currently active.
- Users reference shared plan rows — 122 users following Arnold all point to one plan row.

Replace the contents of `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../app/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

// The athlete. Tracks their sessions and which plans they have followed over time.
model User {
  id           String           @id @default(uuid())
  name         String
  phone        String           @unique
  email        String?
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

Push to Supabase:

```bash
npx prisma db push
npx prisma generate
```

---

### 6. Workout Split Data Files

Static files in `lib/data/` hold the raw split data for each athlete. Used **only by the seed script** — not imported by the app at runtime.

- `lib/data/arnold.ts` — Arnold's 6-day split (Chest/Back, Shoulders/Arms, Legs × 2)
- `lib/data/ronnie.ts` — Ronnie Coleman's split (Back/Biceps/Calves, Chest/Triceps, Legs, Shoulders/Traps, + variations)

Both export a `SplitDay[]` array. `ronnie.ts` imports the `SplitDay` type from `arnold.ts` to avoid duplication.

**Why static files instead of hardcoding in the seed?** Keeps the seed script clean and makes it easy to add more athletes later.

---

### 7. Seeding the Database

Seed data = the workout plan templates. Run once, never again unless you add a new plan.

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

- Uses `DIRECT_URL` — same as the seed, it's a one-time CLI operation
- Prisma nests the creates — one `workoutPlan.create()` creates the plan, all its days, and all exercises
- Only run once. Running again creates duplicate plans. If you need to re-seed, delete the existing rows in Supabase first.

---

### 8. Chat UI + Message API

The whole app is a fake SMS interface — looks like an iPhone text thread.

**Install shadcn and components:**

```bash
npx shadcn@latest init -d
npx shadcn@latest add input scroll-area button popover
```

---

**`app/page.tsx` — the chat UI (full file):**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Message = { from: "bot" | "user"; text: string };

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const INITIAL_MESSAGE: Message = {
  from: "bot",
  text: "Iron Temple 🏋️\n\nEnter your phone number to get started.",
};

function renderText(text: string) {
  const parts = text.split(/(\/[a-z][a-z0-9-]*)/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    /^\/[a-z][a-z0-9-]*$/.test(part) ? (
      <Link key={i} href={part} className="underline font-medium">
        {part}
      </Link>
    ) : (
      part
    ),
  );
}

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"phone" | string>("phone");
  const [context, setContext] = useState<Record<string, unknown>>({});
  const [simDay, setSimDay] = useState<number>(new Date().getDay());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function addMessage(msg: Message) {
    setMessages((prev) => [...prev, msg]);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    addMessage({ from: "user", text });

    if (state === "phone") {
      setPhone(text);
      localStorage.setItem("it_phone", text);
      const res = await fetch(`/api/user?phone=${encodeURIComponent(text)}`);
      const data = await res.json();
      if (data.user) {
        setState("idle");
        addMessage({
          from: "bot",
          text: `Hey ${data.user.name}! 👋 Type HERE when you're at the gym.`,
        });
      } else {
        setState("idle");
        addMessage({ from: "bot", text: `Welcome! Type JOIN to sign up.` });
      }
      return;
    }

    const res = await fetch("/api/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, text, state, context, simDay }),
    });

    const data = await res.json();
    addMessage({ from: "bot", text: data.reply });
    setState(data.nextState);
    if (data.context) setContext(data.context);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSend();
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 overflow-hidden gap-3">
      {/* Dev toolbar */}
      <div className="flex items-center gap-3 flex-wrap justify-center">
        <span className="text-xs text-muted-foreground">Simulate day:</span>
        {DAYS.map((day, i) => (
          <button
            key={day}
            onClick={() => setSimDay(i)}
            className={`text-xs px-2 py-1 rounded-md border transition-colors ${
              simDay === i
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {day}
          </button>
        ))}
        <Link
          href="/history"
          className="text-xs px-2 py-1 rounded-md border text-muted-foreground hover:bg-muted transition-colors"
        >
          History
        </Link>
        <Link
          href="/prs"
          className="text-xs px-2 py-1 rounded-md border text-muted-foreground hover:bg-muted transition-colors"
        >
          PRs
        </Link>
        <Link
          href="/email"
          className="text-xs px-2 py-1 rounded-md border text-muted-foreground hover:bg-muted transition-colors"
        >
          Email
        </Link>
        <Popover>
          <PopoverTrigger className="text-xs px-2 py-1 rounded-md border text-muted-foreground hover:bg-muted transition-colors">
            Commands
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="end">
            <p className="text-xs font-semibold mb-2">Available Commands</p>
            <div className="flex flex-col gap-2">
              {[
                {
                  cmd: "JOIN",
                  desc: "Sign up with your phone number",
                  when: "Any time",
                },
                {
                  cmd: "HERE",
                  desc: "Start today's workout",
                  when: "Any time",
                },
                {
                  cmd: "CHANGE",
                  desc: "Switch to a different plan",
                  when: "Any time",
                },
                {
                  cmd: "START",
                  desc: "Begin the exercise list",
                  when: "After HERE",
                },
                {
                  cmd: "SKIP",
                  desc: "Skip the current exercise",
                  when: "During workout",
                },
              ].map(({ cmd, desc, when }) => (
                <div key={cmd}>
                  <p className="text-xs font-mono font-medium">
                    {cmd}{" "}
                    <span className="font-sans font-normal text-muted-foreground">
                      — {when}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Phone frame */}
      <div className="flex flex-col w-full max-w-sm h-full sm:h-175 sm:border-8 sm:border-gray-900 sm:rounded-[3rem] overflow-hidden sm:shadow-2xl bg-background">
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="w-10" />
          <div className="text-center">
            <p className="font-semibold text-sm">Iron Temple</p>
            <p className="text-xs text-muted-foreground">+1 (888) 888-8888</p>
          </div>
          <div className="w-10" />
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-4">
          <div className="flex flex-col gap-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                    msg.from === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  {renderText(msg.text)}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="flex gap-2 px-3 py-3 border-t">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              state === "phone" ? "Enter your phone number..." : "Message"
            }
            className="rounded-full text-sm"
          />
          <Button size="sm" onClick={handleSend} className="rounded-full px-4">
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Key concepts:**

Two pieces of state drive the whole app:

- `state` — where in the conversation the user is (`phone`, `idle`, `onboarding_name`, `onboarding_plan`, `workout_ready`, `exercise_active`)
- `context` — data carried between steps (name, plans, exercises, sessionId, exerciseIndex)

Every message hits `POST /api/message` with `{ phone, text, state, context, simDay }`. The API replies with `{ reply, nextState, context }`.

The first message (phone number entry) is handled client-side — it calls `GET /api/user` to check if the phone is registered.

`renderText` scans bot messages for path patterns like `/history` and renders them as clickable Next.js links. Everything else is plain text.

Phone is saved to `localStorage` so the history, PRs, and email pages know who you are without asking again.

---

**`app/api/message/route.ts` — the brain (full file):**

One POST route that acts as a state machine:

| State             | Input          | Action                                              |
| ----------------- | -------------- | --------------------------------------------------- |
| `idle`            | `JOIN`         | Check if phone exists → start onboarding            |
| `idle`            | `HERE`         | Load active plan → get today's day → show exercises |
| `onboarding_name` | any text       | Save name, fetch plans, ask user to pick            |
| `onboarding_plan` | `1` or `2`     | Create `User` + `UserPlan` in DB                    |
| `workout_ready`   | `START`        | Create `WorkoutSession`, show first exercise        |
| `exercise_active` | `150x10 160x8` | Parse sets → save logs → show next exercise         |
| `exercise_active` | `SKIP`         | Save skipped log → show next exercise               |

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function getTodayWorkoutDay(simDay?: number): number {
  const map: Record<number, number> = {
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    0: 0,
  };
  const day = simDay !== undefined ? simDay : new Date().getDay();
  return map[day];
}

type SetEntry = { setNumber: number; weight: number; reps: number };

function parseSets(text: string): SetEntry[] | null {
  const normalized = text
    .toLowerCase()
    .replace(/,/g, " ")
    .replace(/\s*x\s*/g, "x")
    .trim();
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

type Exercise = {
  id: string;
  name: string;
  targetSets: number;
  targetReps: number;
};

function exercisePrompt(exercise: Exercise, lastSets?: SetEntry[]) {
  let msg = `${exercise.name} — ${exercise.targetSets} sets x ${exercise.targetReps} reps`;
  if (lastSets && lastSets.length > 0) {
    const summary = lastSets.map((s) => `${s.weight}x${s.reps}`).join(" ");
    msg += `\nLast time: ${summary}`;
  }
  msg += `\nLog your sets (e.g. 150x10 160x8) or type SKIP`;
  return msg;
}

async function getLastSets(
  userId: string,
  plannedExerciseId: string,
): Promise<SetEntry[]> {
  const lastLog = await prisma.exerciseLog.findFirst({
    where: { plannedExerciseId, skipped: false, session: { userId } },
    orderBy: { session: { date: "desc" } },
    include: { sets: { orderBy: { setNumber: "asc" } } },
  });
  if (!lastLog) return [];
  return lastLog.sets.map((s) => ({
    setNumber: s.setNumber,
    weight: s.weight,
    reps: s.reps,
  }));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { phone, text, state, context = {}, simDay } = body;
  const input = text.trim().toUpperCase();

  if (state === "idle") {
    if (input === "JOIN") {
      const existing = await prisma.user.findUnique({ where: { phone } });
      if (existing) {
        return NextResponse.json({
          reply: `Already signed up as ${existing.name}. Type HERE to start today's workout.`,
          nextState: "idle",
        });
      }
      return NextResponse.json({
        reply: "Welcome to Iron Temple 🏋️ What's your name?",
        nextState: "onboarding_name",
      });
    }

    if (input === "HERE") {
      const user = await prisma.user.findUnique({
        where: { phone },
        include: {
          planHistory: {
            where: { endDate: null },
            include: {
              plan: {
                include: {
                  days: {
                    include: { exercises: { orderBy: { order: "asc" } } },
                  },
                },
              },
            },
          },
        },
      });

      if (!user)
        return NextResponse.json({
          reply: "Phone not found. Text JOIN to sign up.",
          nextState: "idle",
        });

      const activePlan = user.planHistory[0];
      if (!activePlan)
        return NextResponse.json({
          reply: "No active plan. Text JOIN to set one up.",
          nextState: "idle",
        });

      const dayNumber = getTodayWorkoutDay(simDay);
      if (dayNumber === 0)
        return NextResponse.json({
          reply: "Today is Sunday — rest day. See you tomorrow 💪",
          nextState: "idle",
        });

      const workoutDay = activePlan.plan.days.find((d) => d.day === dayNumber);
      if (!workoutDay)
        return NextResponse.json({
          reply: "No workout scheduled for today.",
          nextState: "idle",
        });

      const list = workoutDay.exercises
        .map((e, i) => `${i + 1}. ${e.name} — ${e.targetSets}x${e.targetReps}`)
        .join("\n");

      return NextResponse.json({
        reply: `Hey ${user.name}! 👋\nDay ${dayNumber}: ${workoutDay.name}\n\n${list}\n\nType START when ready.`,
        nextState: "workout_ready",
        context: {
          userId: user.id,
          workoutDayId: workoutDay.id,
          exercises: workoutDay.exercises,
          exerciseIndex: 0,
        },
      });
    }

    if (input === "CHANGE") {
      const user = await prisma.user.findUnique({
        where: { phone },
        include: {
          planHistory: { where: { endDate: null }, include: { plan: true } },
        },
      });
      if (!user)
        return NextResponse.json({
          reply: "Phone not found. Text JOIN to sign up.",
          nextState: "idle",
        });

      const currentPlan = user.planHistory[0]?.plan;
      const allPlans = await prisma.workoutPlan.findMany();
      const list = allPlans
        .map(
          (p, i) =>
            `${i + 1}. ${p.name}${currentPlan?.id === p.id ? " (current)" : ""}`,
        )
        .join("\n");

      return NextResponse.json({
        reply: `You're on ${currentPlan?.name ?? "no plan"}.\nPick a new split:\n\n${list}`,
        nextState: "changing_plan",
        context: { allPlans, currentUserPlanId: user.planHistory[0]?.id },
      });
    }

    return NextResponse.json({
      reply: "Type JOIN to sign up or HERE to start your workout.",
      nextState: "idle",
    });
  }

  if (state === "onboarding_name") {
    const name = text.trim();
    const plans = await prisma.workoutPlan.findMany();
    const list = plans.map((p, i) => `${i + 1}. ${p.name}`).join("\n");
    return NextResponse.json({
      reply: `Nice to meet you, ${name}!\nPick your split:\n\n${list}`,
      nextState: "onboarding_plan",
      context: { name, plans },
    });
  }

  if (state === "onboarding_plan") {
    const choice = parseInt(input);
    const { name, plans } = context as {
      name: string;
      plans: { id: string; name: string }[];
    };
    if (!choice || choice < 1 || choice > plans.length) {
      return NextResponse.json({
        reply: `Pick a number between 1 and ${plans.length}.`,
        nextState: "onboarding_plan",
        context,
      });
    }
    const plan = plans[choice - 1];
    const user = await prisma.user.create({
      data: { name, phone, planHistory: { create: { planId: plan.id } } },
    });
    return NextResponse.json({
      reply: `You're all set, ${name}! Following ${plan.name}.\nType HERE when you're at the gym to start your workout.`,
      nextState: "idle",
      context: { userId: user.id },
    });
  }

  if (state === "workout_ready") {
    if (input === "START") {
      const { exercises, userId, workoutDayId } = context as {
        exercises: Exercise[];
        userId: string;
        workoutDayId: string;
      };
      const session = await prisma.workoutSession.create({
        data: { userId, workoutDayId },
      });
      const first = exercises[0];
      const lastSets = await getLastSets(userId, first.id);
      return NextResponse.json({
        reply: exercisePrompt(first, lastSets),
        nextState: "exercise_active",
        context: { ...context, sessionId: session.id, exerciseIndex: 0 },
      });
    }
    return NextResponse.json({
      reply: "Type START when you're ready.",
      nextState: "workout_ready",
      context,
    });
  }

  if (state === "exercise_active") {
    const { exercises, sessionId, exerciseIndex, userId } = context as {
      exercises: Exercise[];
      sessionId: string;
      exerciseIndex: number;
      userId: string;
    };
    const current = exercises[exerciseIndex];

    if (input === "SKIP") {
      await prisma.exerciseLog.create({
        data: {
          sessionId,
          plannedExerciseId: current.id,
          order: exerciseIndex + 1,
          skipped: true,
        },
      });
    } else {
      const sets = parseSets(text);
      if (!sets) {
        return NextResponse.json({
          reply: `Couldn't read that. Use format: 150x10 160x8 170x6\nEach set is weight x reps, separated by spaces.`,
          nextState: "exercise_active",
          context,
        });
      }
      await prisma.exerciseLog.create({
        data: {
          sessionId,
          plannedExerciseId: current.id,
          order: exerciseIndex + 1,
          skipped: false,
          sets: { create: sets },
        },
      });
    }

    const nextIndex = exerciseIndex + 1;
    if (nextIndex >= exercises.length) {
      const logs = await prisma.exerciseLog.findMany({
        where: { sessionId },
        include: { sets: { orderBy: { setNumber: "asc" } } },
        orderBy: { order: "asc" },
      });

      const lines = logs.map((log) => {
        const ex = exercises.find((e) => e.id === log.plannedExerciseId);
        const name = ex?.name ?? "Unknown";
        if (log.skipped) return `• ${name} — SKIPPED`;
        const setStr = log.sets.map((s) => `${s.weight}x${s.reps}`).join(" ");
        return `• ${name} — ${setStr}`;
      });

      const totalSets = logs.reduce(
        (sum, log) => sum + (log.skipped ? 0 : log.sets.length),
        0,
      );
      const doneCount = logs.filter((l) => !l.skipped).length;

      const reply = [
        `Workout complete! Great work 💪`,
        ``,
        `Today's session:`,
        ...lines,
        ``,
        `${doneCount} exercise${doneCount !== 1 ? "s" : ""} · ${totalSets} total sets`,
        `See your full history → /history`,
        `Type HERE next time you're at the gym.`,
      ].join("\n");

      return NextResponse.json({ reply, nextState: "idle", context: {} });
    }

    const next = exercises[nextIndex];
    const lastSets = await getLastSets(userId, next.id);
    return NextResponse.json({
      reply: `✓ Done!\n\n${exercisePrompt(next, lastSets)}`,
      nextState: "exercise_active",
      context: { ...context, exerciseIndex: nextIndex },
    });
  }

  if (state === "changing_plan") {
    const { allPlans, currentUserPlanId } = context as {
      allPlans: { id: string; name: string }[];
      currentUserPlanId: string;
    };
    const choice = parseInt(input);
    if (!choice || choice < 1 || choice > allPlans.length) {
      const list = allPlans.map((p, i) => `${i + 1}. ${p.name}`).join("\n");
      return NextResponse.json({
        reply: `Pick a number:\n\n${list}`,
        nextState: "changing_plan",
        context,
      });
    }

    const newPlan = allPlans[choice - 1];

    await prisma.userPlan.update({
      where: { id: currentUserPlanId },
      data: { endDate: new Date() },
    });
    await prisma.userPlan.create({
      data: {
        user: { connect: { phone } },
        plan: { connect: { id: newPlan.id } },
      },
    });

    return NextResponse.json({
      reply: `Switched to ${newPlan.name}! 💪\nType HERE when you're at the gym.`,
      nextState: "idle",
      context: {},
    });
  }

  return NextResponse.json({ reply: "Type JOIN or HERE.", nextState: "idle" });
}
```

---

### 9. Set Parsing + Last Session Numbers

These two features are already included in the full `app/api/message/route.ts` above. Key details:

**Robust set parsing** — normalizes before parsing so `150 x 10`, `150X10`, and `150x10,160x8` all work:

```ts
const normalized = text
  .toLowerCase()
  .replace(/,/g, " ")
  .replace(/\s*x\s*/g, "x")
  .trim();
```

If parsing fails, the bot replies with instructions instead of crashing.

**Last session numbers** — `getLastSets()` queries the most recent `ExerciseLog` for that user + exercise and shows it above the input prompt:

```
Bench Press — 4 sets x 10 reps
Last time: 150x10 160x8 170x6
Log your sets or type SKIP
```

This gives athletes a target to beat every session.

---

### 10. History Page

Shows all past workouts for the current user. Navigate week by week. Tap any session to expand and see the sets.

**`app/api/sessions/route.ts` (full file):**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone");
  if (!phone)
    return NextResponse.json({ error: "phone required" }, { status: 400 });

  const sessions = await prisma.workoutSession.findMany({
    where: { user: { phone } },
    orderBy: { date: "desc" },
    include: {
      workoutDay: { include: { plan: true } },
      exercises: {
        include: {
          plannedExercise: true,
          sets: { orderBy: { setNumber: "asc" } },
        },
        orderBy: { order: "asc" },
      },
    },
  });

  return NextResponse.json({ sessions });
}
```

**`app/history/page.tsx` (full file):**

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SetLog = { setNumber: number; weight: number; reps: number };
type ExerciseLog = {
  id: string;
  skipped: boolean;
  plannedExercise: { name: string };
  sets: SetLog[];
};
type Session = {
  id: string;
  date: string;
  workoutDay: { name: string; day: number; plan: { name: string } };
  exercises: ExerciseLog[];
};

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("it_phone");
    if (!saved) {
      setLoading(false);
      return;
    }
    setPhone(saved);
    fetch(`/api/sessions?phone=${encodeURIComponent(saved)}`)
      .then((r) => r.json())
      .then((data) => setSessions(data.sessions ?? []))
      .finally(() => setLoading(false));
  }, []);

  const thisMonday = getMondayOf(new Date());
  const weekStart = new Date(thisMonday);
  weekStart.setDate(thisMonday.getDate() + weekOffset * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const weekSessions = sessions.filter((s) => {
    const d = new Date(s.date);
    return d >= weekStart && d <= weekEnd;
  });

  const hasPrev = sessions.some((s) => new Date(s.date) < weekStart);
  const hasNext = weekOffset < 0;

  function navigate(dir: -1 | 1) {
    setWeekOffset((o) => o + dir);
    setExpanded(null);
  }

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const weekLabel =
    weekOffset === 0
      ? "This Week"
      : weekOffset === -1
        ? "Last Week"
        : `${fmt(weekStart)} – ${fmt(weekEnd)}`;

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-sm text-muted-foreground">
        Loading...
      </div>
    );

  if (!phone) {
    return (
      <div className="flex items-center justify-center min-h-screen text-sm text-center px-4">
        <div>
          <p className="mb-2">No phone found.</p>
          <Link href="/" className="underline">
            Go back and sign in first.
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen bg-background overflow-hidden">
      <div className="flex flex-col w-full max-w-sm h-full sm:h-175 sm:border sm:rounded-3xl overflow-hidden sm:shadow-md">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <Link href="/" className="text-xs text-muted-foreground">
            ← Back
          </Link>
          <p className="font-semibold text-sm">Workout History</p>
          <div className="w-10" />
        </div>

        <div className="px-4 py-2 border-b flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            disabled={!hasPrev}
            className="text-xs px-3 py-1 rounded-md border disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted transition-colors"
          >
            ← Back
          </button>
          <p className="text-xs font-medium">{weekLabel}</p>
          <button
            onClick={() => navigate(1)}
            disabled={!hasNext}
            className="text-xs px-3 py-1 rounded-md border disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted transition-colors"
          >
            Next →
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {weekSessions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center mt-8">
              No workouts this week.
            </p>
          )}
          {weekSessions.map((session) => {
            const isOpen = expanded === session.id;
            const done = session.exercises.filter((e) => !e.skipped).length;
            const skipped = session.exercises.filter((e) => e.skipped).length;
            const date = new Date(session.date).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            });

            return (
              <div
                key={session.id}
                className="border rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : session.id)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {session.workoutDay.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session.workoutDay.plan.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {done} done{skipped > 0 ? `, ${skipped} skipped` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isOpen ? "▲" : "▼"}
                    </p>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t px-4 py-3 flex flex-col gap-3">
                    {session.exercises.map((ex) => (
                      <div key={ex.id}>
                        <p className="text-xs font-semibold">
                          {ex.plannedExercise.name}
                          {ex.skipped && (
                            <span className="ml-2 text-muted-foreground font-normal">
                              skipped
                            </span>
                          )}
                        </p>
                        {!ex.skipped && ex.sets.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {ex.sets
                              .map((s) => `${s.weight}x${s.reps}`)
                              .join("  ")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

**How it works:**

- Reads phone from `localStorage` on mount — set when the user enters their number on the chat page
- Fetches all sessions once, then filters client-side by week on each navigation
- `← Back` disabled if no sessions exist before current window; `Next →` hidden when already on current week

---

### 11. Phone Lookup on Entry + User API

When a phone is entered on the chat page, `GET /api/user` checks the DB immediately and greets returning users by name.

**`app/api/user/route.ts` (full file):**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone");
  if (!phone) return NextResponse.json({ user: null });

  const user = await prisma.user.findUnique({ where: { phone } });
  return NextResponse.json({ user });
}
```

Returns the user object if found, `{ user: null }` if not. The chat page uses this to show either `"Hey Alex! 👋 Type HERE..."` or `"Welcome! Type JOIN to sign up."` before the user types anything.

---

### 12. Day Simulator (Dev Toolbar)

Since workouts depend on the real day of the week, testing all 6 days would require waiting 6 days. The toolbar above the phone frame lets you pick any day instantly.

`simDay` is passed with every API message:

```ts
body: JSON.stringify({ phone, text, state, context, simDay });
```

The API uses it instead of `new Date().getDay()`:

```ts
function getTodayWorkoutDay(simDay?: number): number {
  const map = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 0: 0 };
  const day = simDay !== undefined ? simDay : new Date().getDay();
  return map[day];
}
```

---

### 13. Plan Name in History + CHANGE Command

**History — show plan name per session**

The sessions API includes the plan via nested relation:

```ts
workoutDay: {
  include: {
    plan: true;
  }
}
```

Each session card shows three lines: day name, plan name, and date.

**CHANGE command — switch plans**

User texts `CHANGE` → bot shows all plans with current one marked → user picks a number → old `UserPlan` gets `endDate` set to today, new `UserPlan` is created.

Full history is preserved — old sessions still reference the old plan's workout days.

---

### 14. Commands Popover

A **Commands** button in the dev toolbar opens a popover listing all available commands. Built with shadcn `Popover` (already installed in Step 8). The full implementation is included in the `app/page.tsx` code above.

---

### 15. Personal Records Page

Shows the heaviest weight ever lifted per exercise, across all plans and all time.

**`app/api/prs/route.ts` (full file):**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone");
  if (!phone)
    return NextResponse.json({ error: "phone required" }, { status: 400 });

  const sets = await prisma.setLog.findMany({
    where: {
      exerciseLog: {
        skipped: false,
        session: { user: { phone } },
      },
    },
    include: {
      exerciseLog: {
        include: {
          plannedExercise: true,
          session: { select: { date: true } },
        },
      },
    },
  });

  const prMap = new Map<
    string,
    { weight: number; reps: number; date: string }
  >();

  for (const set of sets) {
    const name = set.exerciseLog.plannedExercise.name;
    const existing = prMap.get(name);
    if (!existing || set.weight > existing.weight) {
      prMap.set(name, {
        weight: set.weight,
        reps: set.reps,
        date: set.exerciseLog.session.date.toISOString(),
      });
    }
  }

  const prs = Array.from(prMap.entries())
    .map(([name, pr]) => ({ name, ...pr }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ prs });
}
```

**Why group by exercise name?** PRs are personal — the name is what matters, not which plan or day. Switching from Arnold to Ronnie doesn't reset your Bench Press PR.

**`app/prs/page.tsx` (full file):**

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type PR = { name: string; weight: number; reps: number; date: string };

export default function PRsPage() {
  const [prs, setPrs] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("it_phone");
    if (!saved) {
      setLoading(false);
      return;
    }
    setPhone(saved);
    fetch(`/api/prs?phone=${encodeURIComponent(saved)}`)
      .then((r) => r.json())
      .then((data) => setPrs(data.prs ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-sm text-muted-foreground">
        Loading...
      </div>
    );

  if (!phone) {
    return (
      <div className="flex items-center justify-center h-screen text-sm text-center px-4">
        <div>
          <p className="mb-2">No phone found.</p>
          <Link href="/" className="underline">
            Go back and sign in first.
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen bg-background overflow-hidden">
      <div className="flex flex-col w-full max-w-sm h-full sm:h-175 sm:border sm:rounded-3xl overflow-hidden sm:shadow-md">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <Link href="/" className="text-xs text-muted-foreground">
            ← Back
          </Link>
          <p className="font-semibold text-sm">Personal Records</p>
          <div className="w-10" />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
          {prs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center mt-8">
              No PRs yet. Go lift!
            </p>
          )}
          {prs.map((pr) => {
            const date = new Date(pr.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            return (
              <div
                key={pr.name}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <p className="text-sm font-medium flex-1 pr-4">{pr.name}</p>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">
                    {pr.weight}lbs × {pr.reps}
                  </p>
                  <p className="text-xs text-muted-foreground">{date}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

---

### 16. Monthly Progress Report (Email Page)

A `/email` page styled like a real coach email. Shows four metrics for the current month: attendance, top 3 strength improvements, total volume lifted, and current streak.

**`app/api/report/route.ts` (full file):**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { start, end };
}

function getPossibleTrainingDays(start: Date, end: Date) {
  let count = 0;
  const d = new Date(start);
  while (d <= end) {
    if (d.getDay() !== 0) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone");
  if (!phone)
    return NextResponse.json({ error: "phone required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user)
    return NextResponse.json({ error: "user not found" }, { status: 404 });

  const { start, end } = getMonthRange();

  const sessions = await prisma.workoutSession.findMany({
    where: { userId: user.id, date: { gte: start, lte: end } },
    select: { date: true },
  });
  const uniqueDays = new Set(sessions.map((s) => s.date.toDateString())).size;
  const possibleDays = getPossibleTrainingDays(start, end);

  const sets = await prisma.setLog.findMany({
    where: {
      exerciseLog: {
        skipped: false,
        session: { userId: user.id, date: { gte: start, lte: end } },
      },
    },
    include: {
      exerciseLog: {
        include: {
          plannedExercise: { select: { name: true } },
          session: { select: { date: true } },
        },
      },
    },
    orderBy: { exerciseLog: { session: { date: "asc" } } },
  });

  const totalVolume = sets.reduce((sum, s) => sum + s.weight * s.reps, 0);

  const exerciseMap = new Map<string, Map<string, number>>();
  for (const set of sets) {
    const name = set.exerciseLog.plannedExercise.name;
    const day = set.exerciseLog.session.date.toDateString();
    if (!exerciseMap.has(name)) exerciseMap.set(name, new Map());
    const dayMap = exerciseMap.get(name)!;
    dayMap.set(day, Math.max(dayMap.get(day) ?? 0, set.weight));
  }

  const improvements = Array.from(exerciseMap.entries())
    .map(([name, dayMap]) => {
      const days = Array.from(dayMap.entries()).sort(
        (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime(),
      );
      if (days.length < 2) return null;
      const first = days[0][1];
      const last = days[days.length - 1][1];
      return { name, from: first, to: last, delta: last - first };
    })
    .filter(
      (e): e is { name: string; from: number; to: number; delta: number } =>
        e !== null && e.delta > 0,
    )
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 3);

  const allSessions = await prisma.workoutSession.findMany({
    where: { userId: user.id },
    select: { date: true },
    orderBy: { date: "desc" },
  });

  const sessionDays = new Set(allSessions.map((s) => s.date.toDateString()));
  let streak = 0;
  const cursor = new Date();
  while (true) {
    if (cursor.getDay() === 0) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    if (sessionDays.has(cursor.toDateString())) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  const monthName = start.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return NextResponse.json({
    name: user.name,
    monthName,
    attendance: { days: uniqueDays, possible: possibleDays },
    improvements,
    totalVolume: Math.round(totalVolume),
    streak,
  });
}
```

**`app/email/page.tsx` (full file):**

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Improvement = { name: string; from: number; to: number; delta: number };
type Report = {
  name: string;
  monthName: string;
  attendance: { days: number; possible: number };
  improvements: Improvement[];
  totalVolume: number;
  streak: number;
};

function attendanceMessage(days: number, possible: number) {
  const pct = days / possible;
  if (pct >= 0.9) return "Incredible consistency. You showed up.";
  if (pct >= 0.7) return "Solid month. Keep pushing.";
  if (pct >= 0.5) return "Good start. More days = more gains.";
  return "Every session counts. Let's pick it up.";
}

function streakMessage(streak: number) {
  if (streak >= 10) return `${streak} days straight. Unstoppable.`;
  if (streak >= 5) return `${streak} days in a row. Don't break the chain.`;
  if (streak >= 2) return `${streak} days in a row. Keep it going.`;
  if (streak === 1) return "1 day streak. Show up again tomorrow.";
  return "Start your streak today.";
}

export default function EmailPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("it_phone");
    if (!saved) {
      setLoading(false);
      return;
    }
    setPhone(saved);
    fetch(`/api/report?phone=${encodeURIComponent(saved)}`)
      .then((r) => r.json())
      .then((data) => setReport(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-sm text-muted-foreground">
        Loading...
      </div>
    );

  if (!phone || !report) {
    return (
      <div className="flex items-center justify-center h-screen text-sm text-center px-4">
        <div>
          <p className="mb-2">No data found.</p>
          <Link href="/" className="underline">
            Go back and sign in first.
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 py-10 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gray-900 px-8 py-6 text-white">
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">
            Iron Temple
          </p>
          <h1 className="text-xl font-bold">Monthly Progress Report</h1>
          <p className="text-sm text-gray-400 mt-1">{report.monthName}</p>
        </div>

        <div className="px-8 py-6 flex flex-col gap-6">
          <p className="text-sm text-gray-600">
            Hey {report.name}, here's how your month looked.
          </p>

          <div>
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">
              Attendance
            </p>
            <p className="text-3xl font-bold">
              {report.attendance.days}
              <span className="text-lg font-normal text-gray-400">
                {" "}
                / {report.attendance.possible} days
              </span>
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {attendanceMessage(
                report.attendance.days,
                report.attendance.possible,
              )}
            </p>
          </div>

          {report.improvements.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">
                Top Improvements
              </p>
              <div className="flex flex-col gap-2">
                {report.improvements.map((imp, i) => (
                  <div
                    key={imp.name}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-4">
                        {i + 1}.
                      </span>
                      <span className="text-sm font-medium">{imp.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-gray-400">
                        {imp.from}lbs
                      </span>
                      <span className="text-sm text-gray-400 mx-1">→</span>
                      <span className="text-sm font-semibold">{imp.to}lbs</span>
                      <span className="text-xs text-green-600 ml-2">
                        +{imp.delta}lbs
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.improvements.length === 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">
                Top Improvements
              </p>
              <p className="text-sm text-gray-500">
                Log more sessions to see your strength progress.
              </p>
            </div>
          )}

          <div>
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">
              Total Volume
            </p>
            <p className="text-3xl font-bold">
              {report.totalVolume.toLocaleString()}
              <span className="text-lg font-normal text-gray-400">
                {" "}
                lbs lifted
              </span>
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">
              Current Streak
            </p>
            <p className="text-3xl font-bold">
              {report.streak}
              <span className="text-lg font-normal text-gray-400">
                {" "}
                {report.streak === 1 ? "day" : "days"}
              </span>
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {streakMessage(report.streak)}
            </p>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs text-gray-400 text-center">
              Iron Temple · Keep showing up ·{" "}
              <Link href="/" className="underline">
                Back to chat
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**How the report works:**

- **Attendance** — counts unique session days this month vs all possible Mon–Sat days so far
- **Top 3 Improvements** — groups sets by exercise → tracks max weight per calendar day → compares first day vs last day. Only shows exercises where `delta > 0`
- **Total Volume** — sum of `weight × reps` across every set this month
- **Streak** — walks backwards from today, counting consecutive non-Sunday days that have a session

---

### 17. Workout Data Simulation

To test the email and history pages without waiting weeks, `prisma/simulate.ts` seeds 4 weeks of fake workout history with progressive overload — weights increase each week so the report shows real improvements.

```bash
npx tsx prisma/simulate.ts
```

**`prisma/simulate.ts` (full file):**

```ts
import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

const WEIGHTS: Record<string, { base: number; inc: number }> = {
  Deadlift: { base: 315, inc: 20 },
  "Barbell Row": { base: 185, inc: 10 },
  "T-Bar Row": { base: 135, inc: 10 },
  "One Arm Dumbbell Row": { base: 100, inc: 10 },
  "Standing EZ Bar Curl 21s": { base: 65, inc: 5 },
  "One Arm Dumbbell Preacher Curl": { base: 35, inc: 2.5 },
  "Seated Dumbbell Hammer Curl": { base: 40, inc: 2.5 },
  "Seated Calf Raise": { base: 135, inc: 10 },
  "Standing Calf Raise": { base: 185, inc: 10 },
  "Leg Press Calf Raise": { base: 270, inc: 10 },
  "Dumbbell Bench Press": { base: 80, inc: 5 },
  "Incline Dumbbell Bench Press": { base: 65, inc: 5 },
  "Flat Dumbbell Fly": { base: 40, inc: 2.5 },
  "Skull Crusher": { base: 85, inc: 5 },
  "Dumbbell Overhead Triceps Extension": { base: 55, inc: 2.5 },
  "Dumbbell Kickback": { base: 25, inc: 2.5 },
  "Barbell Back Squat": { base: 275, inc: 20 },
  "Leg Press": { base: 405, inc: 20 },
  "Lying Leg Curl": { base: 100, inc: 5 },
  "Seated Leg Curl": { base: 100, inc: 5 },
  "Walking Lunges": { base: 95, inc: 10 },
  "Seated Barbell Shoulder Press": { base: 135, inc: 10 },
  "Machine Side Raise": { base: 45, inc: 5 },
  "Dumbbell Front Raise": { base: 35, inc: 2.5 },
  "Standing Cable Reverse Fly": { base: 30, inc: 2.5 },
  "Bent Over Cable Reverse Fly": { base: 25, inc: 2.5 },
  "Behind The Back Barbell Shrug": { base: 225, inc: 10 },
  "Pull Up": { base: 0, inc: 10 },
  "Lat Pulldown": { base: 130, inc: 10 },
  "Seated Cable Row": { base: 140, inc: 10 },
  "Barbell Bench Press": { base: 185, inc: 10 },
  "Incline Barbell Bench Press": { base: 155, inc: 10 },
};

function getSimDates(): { date: Date; weekIndex: number }[] {
  const weekStarts = [
    new Date(2026, 4, 19),
    new Date(2026, 4, 26),
    new Date(2026, 5, 2),
    new Date(2026, 5, 9),
  ];
  const today = new Date(2026, 5, 12);
  const result: { date: Date; weekIndex: number }[] = [];

  for (let wi = 0; wi < weekStarts.length; wi++) {
    for (let d = 0; d < 6; d++) {
      const date = new Date(weekStarts[wi]);
      date.setDate(date.getDate() + d);
      date.setHours(0, 0, 0, 0);
      if (date <= today) result.push({ date, weekIndex: wi });
    }
  }
  return result;
}

async function main() {
  const user = await prisma.user.findUnique({
    where: { phone: "YOUR_PHONE_NUMBER" },
    include: {
      planHistory: {
        where: { endDate: null },
        include: {
          plan: {
            include: {
              days: { include: { exercises: { orderBy: { order: "asc" } } } },
            },
          },
        },
      },
    },
  });

  if (!user)
    throw new Error("User not found — update the phone number in this script");
  const activePlan = user.planHistory[0];
  if (!activePlan) throw new Error("No active plan found for user");

  console.log(`User: ${user.name} | Plan: ${activePlan.plan.name}`);

  const dayMap = new Map(activePlan.plan.days.map((d) => [d.day, d]));

  const existing = await prisma.workoutSession.findMany({
    where: { userId: user.id },
    select: { date: true },
  });
  const existingDates = new Set(existing.map((s) => s.date.toDateString()));

  let created = 0;
  let skipped = 0;

  for (const { date, weekIndex } of getSimDates()) {
    if (existingDates.has(date.toDateString())) {
      skipped++;
      continue;
    }

    const workoutDayNumber = date.getDay();
    const workoutDay = dayMap.get(workoutDayNumber);
    if (!workoutDay) continue;

    const session = await prisma.workoutSession.create({
      data: { userId: user.id, workoutDayId: workoutDay.id, date },
    });

    for (const exercise of workoutDay.exercises) {
      const cfg = WEIGHTS[exercise.name] ?? { base: 45, inc: 5 };
      const weight = cfg.base + weekIndex * cfg.inc;

      const log = await prisma.exerciseLog.create({
        data: {
          sessionId: session.id,
          plannedExerciseId: exercise.id,
          order: exercise.order,
          skipped: false,
        },
      });

      for (let setNum = 1; setNum <= exercise.targetSets; setNum++) {
        await prisma.setLog.create({
          data: {
            exerciseLogId: log.id,
            setNumber: setNum,
            weight,
            reps: exercise.targetReps,
          },
        });
      }
    }

    console.log(
      `✓ ${date.toDateString()} — ${workoutDay.name} (week ${weekIndex + 1})`,
    );
    created++;
  }

  console.log(`\nDone — ${created} sessions created, ${skipped} skipped.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

**Note:** Replace `"YOUR_PHONE_NUMBER"` with your actual phone number before running. The script is idempotent — safe to re-run, it skips dates that already have a session.

---

### 18. History Page — Week Navigation

Already included in the full `app/history/page.tsx` above. Key logic:

```ts
function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}
```

Sessions are fetched once and filtered client-side per week — no extra API calls on navigation. The `weekOffset` state drives everything: `0` = this week, `-1` = last week, etc.

---

### 19. Post-Workout Summary

When the last exercise is logged, the bot queries the full session and sends a recap of every exercise with the sets hit.

Already included in the full `app/api/message/route.ts` above. The key section runs when `nextIndex >= exercises.length`:

```ts
const logs = await prisma.exerciseLog.findMany({
  where: { sessionId },
  include: { sets: { orderBy: { setNumber: "asc" } } },
  orderBy: { order: "asc" },
});
```

**What the user sees:**

```
Workout complete! Great work 💪

Today's session:
• Bench Press — 135x8 145x8 155x7 165x6
• Shoulder Press — 95x10 105x10 110x9
• Tricep Pushdown — SKIPPED

2 exercises · 7 total sets
See your full history → /history
Type HERE next time you're at the gym.
```

The `exercises` array is already in context — used to look up names by `plannedExerciseId` without an extra DB query.

---

### 20. Clickable Links in Chat

`renderText` in `app/page.tsx` detects path patterns in bot messages and renders them as Next.js `<Link>` components. Already included in the full `app/page.tsx` above.

```ts
function renderText(text: string) {
  const parts = text.split(/(\/[a-z][a-z0-9-]*)/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    /^\/[a-z][a-z0-9-]*$/.test(part) ? (
      <Link key={i} href={part} className="underline font-medium">{part}</Link>
    ) : (
      part
    )
  );
}
```

`split` with a capture group keeps the matched tokens in the array, so you get `["See your full history → ", "/history", "\nType HERE..."]`. Each token is tested — path pattern gets a `<Link>`, everything else renders as plain text. Any new paths the bot sends in the future get this treatment automatically.

<!-- New steps get added below this line as you build -->
