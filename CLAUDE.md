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

## What needs to be built next
The pitch requires Stripe recurring billing before you can demo it live:
- Stripe subscription infrastructure
- Creator profiles and payout dashboard
- Subscriber → plan assignment flow
- `/builder` page — goal-based onboarding + custom split builder (calendar UI, drag to reorder)
- Recruiter code system (`JOINMIKE` → subscribe flow → attribution stored on member)

---

## Feature Backlog

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
