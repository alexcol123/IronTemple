# Iron Temple — Progress Reports (Brief)

---

## Report 1: Current App (No Influencer)

**What exists**
- SMS engine: JOIN, HERE, START, SKIP, BUSY, ADD, REMOVE, DONE, HISTORY, APP, MENU, CHANGE
- 12 fixed plans (4 goals × 3 tiers), real exercise library (1,339 exercises, 255 curated/featured)
- Web app: `/today` (log), `/history` (past sessions, inline set editing), `/prs` (records → per-exercise charts), `/progress` (weekly recap: PRs, streak, hero chart), `/build` (custom split builder)
- Bonus/extra sessions with proper resume tracking, "Finish Workout" early option
- Consistent styling, real dark mode
- Admin dev tools for exercise library + plan review

**What to change / build next**
- **No billing at all** — no Stripe, no subscriptions, no way to actually charge anyone yet. This is the single biggest gap before any real launch.
- Exercise gifs/videos still live in `public/` (~166MB, bloats every deploy) — needs to move to Supabase Storage
- No public/shareable profile — history link is a private UUID only
- Nice-to-haves not built: macro logging, plate calculator, post-workout rating, behavioral reminders, CrossFit/AMRAP parsing

---

## Report 2: Influencer Version (same app, creator adds a workout + videos)

**Already half-built, surprisingly**
- `/build` already lets anyone create a custom plan
- `/plan/[id]` already exists as a public plan page with a "Follow this plan" phone-number opt-in
- So the *mechanic* of "creator publishes → someone else follows it" technically works today

**What's actually missing to make this real**
- **No payment gating** — following a plan is currently free; no $/month charge, no 50/50 revenue split, no payout tracking
- No creator profile (bio, photo, niche) beyond a plain name string
- No creator video upload — a creator can't attach *their own* demo video to an exercise that already has a shared/generic one (per-creator override — deliberately not built yet, needs a real creator to design against)
- No recruiter/referral codes (`JOINMIKE` style), no attribution fields on the member record
- No creator dashboard (followers, revenue, engagement)

**Bottom line:** the workout/content side is ~60% there; the monetization side (the actual point of the influencer model) is 0% there.

---

## Report 3: SMS vs App, and Pricing

**SMS**
- Wins on friction: no download, no login, works on any phone, feels like a real coach texting you
- Best suited *during* the workout — quick, low-effort logging between sets
- Weak at: visuals, browsing history, showing progress/PRs in a way that feels rewarding

**App**
- Wins on richness: charts, PR badges, video demos, bigger touch targets — the stuff that makes $15/month *feel* worth it
- Best suited *around* the workout — checking progress, browsing history, watching form videos
- Weak at: needs a saved link/bookmark, needs data/wifi, no passive nudge without a real notification system

**Recommendation:** don't pick one — this is already a hybrid, and that's correct. SMS is the daily habit loop; the app is the "look how far you've come" reward layer that justifies the price. Most users will log by text and check the app occasionally, not the reverse.

**Will people pay $14.99–$19.99/month?**
- In line with what `CLAUDE.md` already targets ($15, 50/50 split) — realistic *if* paired with a real creator relationship
- People aren't paying $15-20/mo for "a texting to-do list" — they're paying for **that specific coach's** programming + accountability. The tech is invisible; the creator is the product.
- Confirms the project's own GTM instinct: price only holds once attached to a trusted creator/brand, not before. Right now, nothing here could charge on its own merits — billing infra doesn't exist yet, and the app has no standalone brand pull without a creator behind it.
