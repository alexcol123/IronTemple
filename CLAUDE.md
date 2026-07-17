@AGENTS.md

# NexText — Platform Vision

## The Name
**NexText** is the leading candidate. **Iron Temple** is the first creator brand on the platform.

- **NexText** = the "OnlyFans of Workouts" — neutral name that works for any fitness niche (bodybuilding, running, yoga, nutrition, cycling)
- **Iron Temple** = the pilot creator brand, used to prove the concept and get the first 500 subscribers
- Iron Temple is the pilot. NexText is the airline.

## Possible App Names (still deciding)
- **NexText** — clean, double meaning (Next Text + Next Level), scales beyond fitness, works for any creator niche
- **Iron Temple** — hardcore, gym culture, great for bodybuilding niche but limits expansion
- Other names TBD

## Important Note on the Name
Influencers don't care about the name on day 1 — they care about "$7 per subscriber per month, automatically." The name only matters when they google you after the pitch to make sure you're legit. Focus on getting the first creator live before finalizing the brand.

## Branding (NexText)
- URL: nextext.com or nextext.app
- Handle: @nextext
- Tagline: *"The Next Text you need to get to your next level"*
- Philosophy: not a tracker, an evolution engine — every interaction bridges to the next improvement

---

# Iron Temple — Product Vision

## The Big Idea
**"The OnlyFans of Workouts"** — a creator-monetized fitness platform where influencers sell their expertise and workout programs directly to athletes.

- Influencers publish their splits and build a subscriber base
- Athletes pay $15/month to follow a creator's program
- Revenue split: 50/50 between creator and platform ($7.50 each)
- The chat-based workout logger is the core retention mechanic — athletes stay because their data lives here

## The Math
- 100 subscribers → creator earns $750/mo, platform earns $750/mo
- 1,000 subscribers → creator earns $7,500/mo, platform earns $7,500/mo
- A local coach with 5k followers converting 5% = 250 subs = $1,875/mo passive for them

## Go-To-Market Strategy (OnlyFans Playbook)
Do NOT build ads or a landing page first. Follow this sequence:

1. **Target the outcasts** — local coaches/bodybuilders who are tired of the Instagram algorithm or having their PDF guides pirated on Reddit
2. **1-on-1 DM grind** — manually find Richmond fitness accounts with 3k–10k followers, slide into DMs with this pitch:
   > *"Your followers pay you once for a PDF that gets shared on Reddit. What if they paid you $7.50 every single month forever, automatically, just by texting a number?"*
3. **Align the money incentive** — 50/50 split makes it so profitable they feel like an idiot saying no
4. **Bake in the viral loop** — make it easy for coaches to share their link in Instagram stories and at the end of workout videos
5. **Creator snowball effect** — when Creator A sees Creator B post a screenshot of $2k passive income, Creator A signs up immediately. The tight-knit local bodybuilding community does the marketing for you

### Creator Referral Program (OnlyFans Playbook)
If Influencer A refers Influencer B, Influencer A earns **5% of everything Influencer B earns, for life.**

**Why this works:**
- Costs nothing upfront — only pays out when the new creator is already making money
- The 5% comes out of the platform's 30% cut — the new creator loses nothing, so they're happy to sign up through a friend's link
- Turns every creator into a recruiter — if Creator A refers someone who earns $5,000/month, Creator A makes $250/month doing nothing
- At 10 referred creators each earning $5k/month → Creator A makes **$2,500/month passive** just from their referral link

**The math per referral:**
- New creator earns $5,000/mo → referrer gets $250/mo
- New creator earns $10,000/mo → referrer gets $500/mo
- Lifetime, uncapped to start

**When to add a cap (learn from OnlyFans):**
OnlyFans eventually capped referrals at 5% for the first year only, maxing out at $1M in referred earnings ($50k payout per creator). They did this because top influencers and agencies were bringing in thousands of creators and collecting millions in passive referral income — it got too expensive.

**For NexText:** Launch uncapped to drive early growth. Add a cap once the program gets expensive — that's a good problem to have.

**Implementation needed:**
- `referredBy` field on creator profile (stores referring creator ID)
- Monthly payout calculation: 5% of referred creator's earnings that month
- Referral link generator per creator (e.g. nextext.com/join?ref=coach-alex)

## Revenue Attribution Model — Recruiter Fee

Every member has three attribution fields:
- **originalRecruiterId** — the gym owner or trainer who first brought them to the platform (earns $2/month forever)
- **currentCreatorId** — the creator whose program they currently follow (earns the main cut)
- **originalGymId** — the gym whose phone number was used to acquire them (earns $1/month only while the member is still active at that gym)

### The Split

| Scenario | Platform | Current Creator | Original Recruiter | Gym |
|----------|----------|-----------------|--------------------|-----|
| Member follows who recruited them | $7.50 | $7.50 | (included) | — |
| Member switches to a new creator | $7.50 | $5.50 | $2.00 | — |
| Member acquired via gym number, still at gym | $7.50 | $5.50 | $1.50 | $0.50 |
| Member acquired via gym number, left gym | $7.50 | $5.50 | $2.00 | $0 |

**Platform always keeps $7.50. The $2 recruiter fee comes out of the creator pool, not the platform cut.**

### Rules
- The $2 recruiter fee goes to the **first person** who brought the member to the platform — no chains, no second-level recruiting
- Gym earns only while the member actively uses that gym's number
- Recruiter earns forever regardless of which creator the member follows next
- Sam knows before signing up: "I keep $5.50 on members others recruited, $7.50 on members I recruited myself"

### Why This Works
- Mike the trainer recruits aggressively because he earns $2/month per client forever, even if they move states and follow Sam Sulek
- Gym owner earns $0.50–$1/month per member just for promoting the number in class
- No one feels robbed — everyone has a clear, permanent incentive to recruit
- Members can switch creators freely without losing their data or history

### The Pitch to a Trainer (Jenny)
> *"Text JOINJENNIE to 888-888-8888 — every client who signs up is worth $2 a month to you forever, even if they move to Miami and start following someone else on the app."*

At 80 clients → **$160/month passive, for life.**

### DB Fields Needed
```
Member {
  originalRecruiterId  String?  // trainer or gym owner who recruited them
  currentCreatorId     String   // who they follow now
  originalGymId        String?  // gym number used for acquisition (clears if they leave)
}
```

### Personal Trainer as Influencer
Personal trainers are the bridge between Phase 1 (gyms) and Phase 3 (influencers). They already have clients, they already coach — they just need a code.

**Flow:**
- Jenny builds her weight loss split on `/builder` → gets code `JOINJENNIE`
- Posts it on Instagram, says it in class, puts it on the gym whiteboard
- Clients text `JOINJENNIE` to the gym's number → Stripe charges $15/month
- Jenny earns $2/month per client forever as recruiter + creator cut while they follow her plan

**One gym can have multiple trainers with separate codes:**
| Trainer | Code | Niche |
|---------|------|-------|
| Jenny | JOINJENNIE | Weight Loss |
| Marcus | JOINMARCUS | Powerlifting |
| Coach T | JOINCOACHT | General Fitness |

Three creators, one gym number, three revenue streams.

## Advisor Pitch Summary

**The concept:** Athletes pay $15/month to follow a fitness creator's workout program and log their sessions by text. Think OnlyFans but for workout programs.

**Base split:** $15/month → $7.50 to platform, $7.50 to creator. Always.

**The recruiter layer:**

Every member has a permanent "who recruited me" tag. The person who brought them onto the platform earns **$2/month flat, forever**, even if the member switches to a different creator later. That $2 comes out of the current creator's $7.50 — platform never touches it.

- Member follows same person who recruited them → recruiter/creator keeps full $7.50
- Member switches to a new creator → new creator keeps $5.50, original recruiter keeps $2
- Gym whose phone number was used gets $0.50–$1 only while the member is active there

**Why trainers become our sales force:**

A personal trainer at a gym gets a code (e.g. `JOINMIKE`). Every client who signs up through that code pays Mike $2/month forever — even if they move states and follow Sam Sulek instead. 80 clients = $160/month passive, for life. Mike stops thinking about it as a gym tool. He starts promoting it to everyone he's ever trained because every signup is permanent recurring income.

**Open question for advisor:**
> *Is the $2 recruiter fee sustainable long term, or should we cap it after X months or X dollars — similar to how OnlyFans capped their referral program after it got too expensive?*

---

## What needs to be built next
The pitch requires Stripe recurring billing before you can demo it live:
- Stripe subscription infrastructure
- Creator profiles and payout dashboard
- Subscriber → plan assignment flow
- `/builder` page — goal-based onboarding + custom split builder (calendar UI, drag to reorder)
- Recruiter code system (`JOINMIKE` → subscribe flow → attribution stored on member)

---

## Feature Backlog

### Gate Weekly Progress to a Weekly Release (not always-on-demand)

`/progress/{userId}` (a positive-first recap of PRs, consistency, and a hero exercise's climb, computed live in `app/api/progress/[userId]/route.ts`) is currently viewable on demand, any time — an intentional testing shortcut (see the comment on "Weekly Progress" in `app/menu/[userId]/page.tsx`'s `ITEMS` array).

The real version should feel like a school report card: locked until it's actually ready, not a page you can just go check whenever. Two ways to gate it were considered — a fixed time-based unlock (e.g. always unlocks Sunday evening) vs. tying the unlock to a real per-week "generated/sent" event. **Went with the second**: gate on a per-week generated/sent flag or timestamp, not just a fixed day/time, so the web page and the future proactive weekly SMS send are pinned to the same real event instead of two clocks that can drift apart.

**What it needs:** a way to record, per user per week, that the report has been "released" (e.g. a timestamp set the moment the weekly SMS goes out, or a scheduled job that flips it at week's end) — the page then checks that flag before rendering this week's recap instead of always computing and showing it live.

**Do NOT build until:** the proactive weekly/monthly SMS send itself exists — the gate is meant to hang off that real send event, not an arbitrary timer invented just to lock the page.

### Move Exercise Images/GIFs from `public/` to Supabase Storage

Exercise demo images/GIFs (from the bulk-imported `exercise-dataset`) are currently served straight out of the Next.js `public/` folder — an intentional MVP shortcut, not the long-term plan.

**Why this is temporary:** bundling ~166MB of media into `public/` means it's committed to git and shipped with every Vercel deploy, regardless of how often any individual image is actually viewed (lazy-loading on click only saves bandwidth at runtime, not repo/build size — this was already known going in).

**Why Supabase Storage specifically:** the app is already on Supabase for the database, and real object storage is needed anyway once influencers start uploading their own videos/messages/images for their own programs — this isn't a one-off migration, it's the same infrastructure the creator-upload feature will need.

**What it needs:** move files from `public/exercises/` into a Supabase Storage bucket, update `ExerciseLibrary.gifUrl`/`imageUrls` to point at the new hosted URLs instead of local `/exercises/...` paths, then remove the files from `public/` and git.

**Do NOT forget this** — flagged explicitly so the git bloat doesn't quietly become permanent.

### Per-Creator Exercise Demo Overrides

`ExerciseLibrary` (gif/instructions/video/images per exercise) is currently one shared row per exercise *name* — if two different creators both program "Bench Press," they see the exact same generic demo content, since it's not tied to who owns the plan.

For a real influencer selling their own program, that's a real gap: part of what makes a $15/month program feel worth it over a free YouTube video is that it's personally coached — their own footage, their own form cues, their own face — not a generic anonymous demo. Filler/accessory exercises are fine staying generic; a creator's flagship lifts are where this would actually matter.

**What it would need:** a way for a plan owner to override the shared default with their own gif/video/image for exercises *within their own plan specifically*, without changing what the generic/shared version shows everyone else. Likely a per-plan (or per-`PlannedExercise`) override table/fields that take priority over `ExerciseLibrary` when present, falling back to the shared default otherwise.

**Do NOT build until:** there's a real creator actually building and selling their own program who wants this — right now it's hypothetical, and the override layer is a meaningful chunk of schema/UI work not worth doing speculatively.

### Real Videos for the How It Works Page

`/how-it-works/{userId}` (linked from Menu) currently plays one placeholder clip (a public sample video) just to prove the layout works. Once real screen-capture videos are recorded, swap them in:

- Record portrait/normal phone orientation, not sideways — the app's own UI is already styled to look like a phone held upright, and viewers will most likely be watching on their own phone in portrait too.
- The video element is currently set to `aspect-video` (16:9 landscape), which will letterbox a portrait clip — change it to a vertical ratio (e.g. `aspect-[9/16]`) once the real files are in.
- Plan is ~4 short videos covering the main things someone can do in the app (logging sets, ADD/SKIP/BUSY, switching to the app mid-workout, etc.) — just add more entries to the `VIDEOS` array in that page.
- Hosting: lean toward YouTube (unlisted, ads turned off per-video in YouTube Studio) over bundling raw files into the Vercel deploy or Supabase Storage — video bandwidth is free and scales on YouTube regardless of view count, unlike either of those.

### Optional Public Username for the History Link

Right now the history link (`/history/{userId}`) is private by accident — a UUID nobody could guess, only useful because it's sent directly to the person. Idea: let people optionally choose a public username (e.g. `cathyny25`) so they can share/brag about their progress with a memorable link instead of a random ID.

**Key distinction — this is opt-in, not a replacement:**
- No username set → private UUID link works exactly as it does today, nothing changes
- Username set → creates a *second*, public-facing URL (e.g. `/u/cathyny25`) pointing at the same underlying data

This is a real shift from "private by obscurity" to "intentionally public identity" — that's the point, not a bug, but it should stay a conscious choice someone opts into, not something everyone gets exposed to by default.

**What the public version should actually show:** probably not the same raw page as the private one — a highlight reel (PRs, streaks, maybe an auto-generated recap-card style summary) rather than a full dump of every set ever logged. Ties into the anonymous-handle idea from the TrackRep gamification notes (e.g. "Iron Monkey did the 29 pullup challenge") — a chosen username here could double as that same public identity later if leaderboards get built.

**What it needs:** a unique `username` field on `User` (with collision/validation handling when someone picks one), plus a new public route separate from the existing private history page.

**Do NOT build until:** the real workout content and progression system are done and tested — this is a nice-to-have distribution feature, not something blocking real usage.

---

### Plate Calculator + Equipment Type (advisor idea)

**`PLATES 225`** → text command that returns the plate breakdown per side, assuming a standard 45lb bar (e.g. "Two 45lb plates on each side"). Removes gym-math friction when fatigued mid-session.

Ties into the upcoming custom-workout builder: when a user builds their own exercise, they should be able to tag its equipment type — **Barbell / Dumbbell / Machine** — so tracking knows whether a number means total weight (Barbell, e.g. 225) or per-hand weight (Dumbbell, e.g. "90x" meaning 90 lbs each hand). Without this, a custom "Chest Press" exercise is ambiguous.

**Do NOT build until:** the custom exercise/split builder exists — this is an extension of that feature, not standalone.

---

### Post-Workout Subjective Rating ("Coaching Notes")

Right after the last exercise of a session, one optional question before the completion summary:

> System: *"Session complete! Awesome job. Scale of 1-5, how did your joints and energy feel today?"*
> User: `4`

Stored alongside that session, surfaced on the private history page. The value: if lift numbers dip a few weeks later, the user can look back and see "oh, my energy was a 2 that whole week" — turning a mystery plateau into an explained one. Real coaches ask how it felt, not just what the numbers were.

**Architecture:** one more field on `WorkoutSession` (e.g. `energyRating Int?`), one more state in the SMS flow after the last exercise completes, before the "Workout complete!" summary fires.

---

### Pre-Gym Behavioral Reminder (the "5:40 PM" prompt)

The core idea: don't remind someone at 9am that they lift at 6pm — remind them ~20 minutes before their *actual usual time*, when it has the highest psychological impact (tying their shoes, driving to the gym).

**Example:**
> System (5:40pm, if their pattern is Monday 6pm): *"Hey Alex, iron time in 20 mins 🏋️ Today is Upper Body A and we're hunting a new PR on Dumbbell Bench. Reply HERE when you walk through the doors to unlock your targets."*

**Why this template specifically works:** names the exact track (Upper Body A) and the exact lift to look forward to (creates anticipation), and gives one unambiguous call to action (reply HERE).

**What it needs:**
- Learning/storing each user's typical workout time pattern (derived from real `WorkoutSession` timestamps over a few weeks, not asked directly)
- A per-user cron/scheduled job triggered ~20 min before their learned time
- Pulling the next scheduled workout's specific exercises to personalize the "hunting a PR on X" line

**Do NOT build until:** there's enough real session history per user to actually learn a pattern from — this needs real behavioral data, not a guess, same reasoning as everything else deferred pending real usage.

---

### Confirmed decisions (advisor independently agreed)

Two things already decided earlier that the advisor's review independently confirmed, worth noting so they don't get re-litigated:
- **No live rest-timer texts.** Pinging mid-set floods the thread, adds carrier lag risk, and risks people texting STOP out of frustration. Keep texts strictly bound to exercise start/end — this matches the earlier build decision, not a new one.
- **No strict punctuation requirements in logging.** `parseSets()` already strips commas and splits on whitespace only — "150x10 160x8" and "150x10, 160x8" both already work today. No change needed, already satisfied.

---

### Macro Logging (MACROS / FOOD command)

A standalone command, separate from workout logging, that tracks daily macros and updates the private web history link.

**Two logging modes:**

1. **Full daily log at once:**
   > User: `Macros 180p 200c 70f`
   > System: *"Logged: 180g Protein, 200g Carbs, 70g Fat. Total calories: 2,150. You are 20g away from your daily protein target, Alex. Keep eating."*

2. **Rolling/incremental tally throughout the day** (for people who don't want to wait until end of day):
   > User: `Add 40p` (just ate a shake or chicken breast)
   > System: *"Added 40g protein. Daily total is now: 120g / 200g target."*

**What it needs:**
- A daily target (protein/carbs/fat) stored per user — likely set during onboarding or a separate goal-setting step
- A running daily macro total, reset at midnight (or user's local day boundary)
- Calorie total derived from macros (protein 4 cal/g, carbs 4 cal/g, fat 9 cal/g)
- Surfaced on the private history page alongside workout data, not just in the SMS reply

**Do NOT build until:** the 8 real workout plans + progression/PR detection are done — this is a parallel feature, not a blocker, and shouldn't distract from finishing the core workout loop first.

---

### AI Coach / Agent Features (future)

Brainstormed list of where an LLM agent could genuinely help, beyond the fixed 12 onboarding plans:

- **AI Plan Builder** — someone describes goal/equipment/schedule in plain language, agent assembles a plan instead of picking from the 12 fixed templates.
- **Progress Review / Coaching Check-ins** — periodic automated review of logged sessions (already tracked: `WorkoutSession`/`ExerciseLog`/`SetLog`) to surface real coaching observations, e.g. "bench has been stuck at 185 for 3 weeks, want a deload?" Fits the SMS-first design — the app can *say* something about the data, not just chart it.
- **Conversational plan adjustment** — "my shoulder hurts, swap something in" instead of memorizing ADD/REMOVE syntax.
- **CrossFit/AMRAP parsing** — an LLM parser could handle free-form formats ("21-15-9 thrusters and pull-ups, 8:45") far more flexibly than hand-written regex ever will (see the CrossFit parser gap noted elsewhere in this file).
- **Creator-side draft assistant** — a trainer describes their niche/philosophy, agent proposes a starting plan in `/builder` for them to edit, instead of building exercise-by-exercise from scratch.
- **Natural-language exercise search** — "glute exercises I can do with just a band" instead of tab-clicking — needs an equipment-tag field on `ExerciseLibrary` first.
- **Form-check video review** — computer vision on submitted videos. Speculative, high effort, and reopens the same liability question as injury-modification advice — hold off.

**The one non-negotiable rule for all of the above:** every AI feature must stay grounded to real, curated data — never let it freely generate an exercise name, only ever select from real `ExerciseLibrary` rows. Specifically, ground selection to `featured: true` (the ~255 exercises in `most-common-exercises-in-data.md`), not the full ~1,334-row library. The featured set is the one that's actually been manually verified this project (real matching video, correct instructions, no duplicates); the rest is still raw, unverified bulk-import data and would risk resurfacing exactly the kinds of bugs found and fixed by hand (wrong instructions on an exercise, broken/unfeatured references, near-duplicate entries).

**Important implementation detail:** enforce this via a live query (`WHERE featured = true`) against the database, not by reading the static `most-common-exercises-in-data.md` file — that file is just a point-in-time export for human review and goes stale the moment anything gets toggled in the admin panel.

**Do NOT build until:** there's a clear near-term feature to attach this to (e.g. the AI Plan Builder or Progress Review specifically) — this section exists to lock in the grounding principle before any of these get built, not to greenlight building all of them now.

---

### Equipment-Aware Filtering (future)

An athlete describes what equipment they actually have access to (e.g. "just a bench, a barbell, and dumbbells") and the app filters/substitutes exercises accordingly, instead of assuming full commercial-gym access.

**Why this is separate from the mobility/injury idea below:** equipment filtering is a pure data problem — tag each `ExerciseLibrary` row with what equipment it needs, then filter. Low risk, no liability concern, buildable whenever there's real demand for it.

**What it needs:** an equipment field on `ExerciseLibrary` (e.g. `"barbell" | "dumbbell" | "machine" | "cable" | "bodyweight" | "kettlebell"`), then a filter step wherever exercises get selected (onboarding, `/build`, ad-hoc `ADD`).

**Do NOT build until:** a real user actually hits this limitation — this is speculative until then, same reasoning as everything else deferred pending real usage.

### Mobility/Injury-Aware Substitutions (future, higher risk)

The harder version of the idea above: "I have knee pain, don't give me exercises that aggravate it."

**Why this needs more care than equipment filtering:** recommending exercise modifications for pain/injury edges into medical-advice territory — a real liability question, not just an engineering one. An LLM freely improvising "safe" substitutions for someone's joint pain is a genuine risk if it gets it wrong.

**The safe path, if this ever gets built:** a pre-vetted, coach-approved substitution list (e.g. "if knee pain, avoid X, prefer Y") rather than letting an agent freely decide what's safe. Same "ground it to curated data, don't let it freely generate" principle as the AI Coach section above, just applied to a higher-stakes decision.

**Do NOT build until:** there's real trainer/professional input on the substitution rules — this is not a pure engineering problem and shouldn't be treated as one.

---

### Onboarding Flow — Goal-Based Plan Selection

During onboarding, before anything else, ask the athlete one question:

> *"What's your goal?"*
> *1. Lose Weight*
> *2. Build Muscle*
> *3. Get Stronger*
> *4. General Fitness*

Auto-assign the most popular split for that goal — no decision fatigue, they start tomorrow.

**Goal → Default Plan mapping:**

| Goal | Default Plan | Why |
|------|-------------|-----|
| Lose Weight | Founder Split | Cardio days built in |
| Build Muscle | Arnold Split | Classic hypertrophy volume |
| Get Stronger | 5/3/1 style | Heavy compounds, low reps (needs to be built) |
| General Fitness | 3-Day Full Body | Simple, sustainable (needs to be built) |

**At the bottom of Day 1's first workout, add:**
> *"Want a custom split? Build your own → /builder"*

This links to the `/builder` page where they can create a fully custom program on a 7-day calendar — pick exercises per day, set sets/reps, reorder with drag.

**Why this matters:**
- Solo athletes can use the app without a trainer or gym — direct-to-consumer market unlocked
- Athletes who build their own plan are more invested and less likely to churn
- The `/builder` page is also the creator dashboard — trainers use the same page to build the program they sell to subscribers
- Lowers the barrier for gym owners: instead of emailing us a PDF, they log in and build it themselves

**Architecture:**
- Onboarding question stored as `goal` on `User` model
- Goal → planId mapping handled server-side at account creation
- Custom plans created via `/builder` stored as a `WorkoutPlan` row owned by that user

---

### Cardio Logging — Optional Distance/Steps (added after live SMS testing)

Cardio exercises (`type: "cardio"`) currently log a single number: minutes. Real testing surfaced that people may want to log distance (miles) or steps alongside time, e.g. "30 min, 2.5 mi" instead of just "30".

**Why not now:** current single-number parsing (`parseMinutes`) already works fine for the MVP — this is a nice-to-have surfaced during testing, not a gap blocking anything.

**How to build it later:** the cardio `SetLog` row already stores an unused `weight` field (currently always 0) — that field could hold distance without a schema change, just a parsing/display update (e.g. "30x2.5" meaning 30 min, 2.5 miles) plus updated prompt copy explaining the optional second number.

---

### Onboarding Flow — Missed Session Preference
During onboarding, after a user picks their plan, ask them how to handle missed sessions. Two messages:

**Message 1:**
> *"Welcome to NexText. We're locked in for the Arnold 6-Day Split. How do you want us to handle missed sessions?"*

**Message 2:**
> *"Pick your style:*
> *1. The Grinder — If I miss a day, I do it the next time I train. Never skip, just move forward.*
> *2. The Clockwork — Stick to the calendar. If I miss Tuesday (Back Day), skip it and stay on track for Wednesday (Arms)."*

**Why this matters:**
- Eliminates the "guilt factor" — biggest reason people quit fitness apps
- Turns a missed workout into a user-defined strategy, not a failure
- Makes the app feel like a partner, not a robot

**Architecture:**
- **Grinder** = queue (index 1 → 2 → 3 regardless of date)
- **Clockwork** = calendar check (if today doesn't match expected day, prompt "skip or double up?")
- Store preference on `User` model — even Grinder users should have planned days stored so you can suggest switching after 3 months of inactivity

**Clockwork safety valve response when they skip:**
> *"Understood. Skipping Back Day to keep the calendar locked. We'll be ready for Arms tomorrow. Consistency is key."*

**Future upsell text (3 months in):**
> *"Hey — you've been on the Grinder flow for a while. Want to switch to Clockwork for a more rigid routine? Reply SWITCH to change."*

---

## Client 1 — Bot Path Options

Two realistic paths for the first client. Same product, different entry point.

---

### Option A — Local Gym / CrossFit Box

**Who:** A gym owner or CrossFit coach who wants to retain members and keep them engaged between classes.

**The pitch:**
> *"Your members forget about you between sessions. We send them their workout every day, they log it by text, you see who's showing up and who's going cold. $15/month per member, you keep $7, we handle everything."*

**Bot flow:**
```
Member texts HERE
→ Bot shows today's WOD or program
→ Member logs sets (135x10 185x8) or time (21:45)
→ Bot confirms, shows next exercise
→ End: summary + history link
```

**Why this wins first:**
- One decision maker (gym owner), one call, done
- They already have a retention problem
- You enter their programming once, they're live
- Use them as proof before pitching influencers

**Revenue per gym:**
- 50 members × $7 = $350/month for them, $150/month for you
- Low but gets you a live demo with real users

---

### Option B — Local Fitness Influencer (Instagram/YouTube)

**Who:** A Richmond coach with 3k–10k followers selling PDF programs that get pirated.

**The pitch:**
> *"Your followers pay once for a PDF that gets shared on Reddit. What if they paid you $7 every single month, automatically, just by texting a number?"*

**Bot flow:**
```
Follower sees "Text TRAIN to 804-XXX-XXXX" in Instagram story
→ Texts TRAIN
→ Bot sends Stripe payment link ($15/month)
→ Payment confirmed → bot welcomes them, assigns to creator's plan
→ Next morning: text HERE → workout begins
```

**Why this wins second:**
- Influencer brings their own audience — you don't find the subscribers
- Creator does the marketing for you (their income depends on it)
- Once one creator posts an income screenshot, others flood in

**Revenue per influencer:**
- 100 subscribers × $4.50 = $450/month for you
- 500 subscribers × $4.50 = $2,250/month for you from one creator

---

### Recommendation — The Stair-Step Strategy
Don't choose one forever. Use them sequentially to de-risk the product:

```
[Phase 1: Local Gyms] ──→ [Phase 2: Case Study] ──→ [Phase 3: Influencer Scale]
  Validate SMS parsing      Prove retention & MRR      Mass market distribution
  Fix edge-case bugs        Get testimonial data        Passive inbound growth
```

**Phase 1 — Iron out the kinks locally (Weeks 1–4)**
Go to 2-3 local gyms. Goal isn't revenue — it's watching real athletes use the SMS parser. People write workouts weirdly: `135x10`, `135 lbs for 10`, `135 10/10/10`. Collect that real-world data to make the parser bulletproof.

#### Gym Pitch — Revenue Share Model (NOT flat fee)
Never charge a flat monthly fee to gyms. Always pitch revenue share. Zero risk for them = faster yes.

**The script:**
> *"Hey [Owner], I want to set up an extra $300 to $500 a month in recurring revenue for this gym, starting next week. It costs you $0 out of pocket. We're going to launch a premium PR Track text line for your hardcore members. They text the number, pay $15/month to unlock automated tracking and your custom strength programming, and we split the revenue 50/50. You get $7.50, I get $7.50. You do zero extra work — your members just text the number while they're lifting."*

**Why rev-share beats flat fee:**
- Zero financial risk — if nobody signs up they lose nothing, buying resistance eliminated
- The math is instant: 40 members × $7.50 = $300/month pure profit for the gym
- Owner becomes your salesperson — they stand in front of every class and promote it because every signup puts $7.50/month in their pocket forever

**The member flow:**
1. Member scans QR code in gym → texts START
2. Bot replies with Stripe payment link ($15/month)
3. Member pays once on their phone
4. Unlocked → texts HERE every session, logs sets, sees PRs
5. Stripe automatically splits: $7.50 to gym, $7.50 to platform

**The owner's incentive:** Every class they promote the link = more passive income. You don't have to do any marketing — the owner does it for you.

**Phase 2 — Build the ultimate case study**
Once a local gym is running smoothly, capture the data:
> *"Gym X increased member engagement by 40% and generated an extra $600/mo in passive revenue using Iron Temple."*

**Phase 3 — Pitch influencers with proof**
You're no longer selling a cool tech idea. You're selling turnkey business infrastructure that is already making other coaches money. Influencers say yes to proof, not promises.

---

**Current SMS parser status:**
- Handles standard linear strength sets: `135x10 185x8 225x6` ✓
- Handles SKIP command ✓
- Does NOT yet handle CrossFit formats: AMRAPs, METCONs, time-based movements (e.g. "21:45" or "5 rounds") ✗
- CrossFit support is a Phase 1 edge case to solve with real gym data

## What this means for the codebase
Every feature should be evaluated against two questions:
1. Does this keep the athlete coming back? (habit loop)
2. Does this make the creator's program feel worth $15/month? (monetization loop)

The current app (chat logger + history + PRs + email report) is the athlete retention layer. The creator monetization layer (subscriptions, payouts, creator profiles) gets built on top.
