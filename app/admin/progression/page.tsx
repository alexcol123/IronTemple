import Link from "next/link";

// =============================================================================
// /admin/progression — Dev reference: how weight-increase suggestions and PR
// detection work. Copy this file's structure (SectionTitle, FileRef, ExampleBox)
// as the template for the next admin reference page.
// =============================================================================

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-base font-semibold text-foreground mb-3 border-b border-border pb-2 mt-8">
    {children}
  </h2>
);

const FileRef = ({ file, note }: { file: string; note: string }) => (
  <div className="flex gap-3 py-2 border-b border-border last:border-0">
    <span className="text-xs font-mono text-muted-foreground w-56 shrink-0">{file}</span>
    <span className="text-sm text-foreground">{note}</span>
  </div>
);

const ExampleBox = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-card border border-border rounded-xl p-4 mb-3">
    <p className="text-sm font-medium text-foreground mb-2">{title}</p>
    <div className="text-sm text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap">
      {children}
    </div>
  </div>
);

export default function ProgressionPage() {
  return (
    <div className="min-h-screen bg-background p-6 max-w-3xl mx-auto">
      <Link href="/admin" className="text-xs text-muted-foreground hover:underline">
        ← Dev Reference
      </Link>

      <h1 className="text-2xl font-bold text-foreground mt-2">Progression & PRs</h1>
      <p className="text-sm text-muted-foreground mt-1">
        How the app decides when to suggest heavier weight, and how PRs get detected.
      </p>

      {/* ------------------------------------------------------------------ */}
      <SectionTitle>The Core Rule — Heaviest Set to Failure</SectionTitle>
      <p className="text-sm text-foreground mb-3">
        Every weighted exercise prompt asks for a target number of sets/reps, but the{" "}
        <strong>heaviest set specifically should be pushed to failure</strong> — as many reps as
        possible, not stopped at the target count. Without this, we can&apos;t tell if someone
        stopping at the target rep count actually hit their limit, or just stopped because
        that&apos;s what the app asked for.
      </p>
      <ExampleBox title="What the exercise prompt looks like (Build Muscle)">
        {`Bench Press — 3 sets x 8-12 reps (push your heaviest set to failure)
Recent heavy set: 190x10 — try 195 lbs today, even 1-2 more reps builds real strength.
Log your sets (e.g. 150x10 160x8) or type SKIP`}
      </ExampleBox>
      <p className="text-sm text-foreground mb-3">
        &quot;Recent heavy set,&quot; not &quot;Last time&quot; — the reference is the best of the
        last 2 sessions (see &quot;Best of the Last 2 Sessions&quot; below), not necessarily the
        most recent one, so &quot;last time&quot; would sometimes be factually wrong. This challenge
        line only shows up here, at the start of the next session — logging today&apos;s sets no
        longer echoes a &quot;stay/try&quot; message back immediately (see &quot;PR-Only Post-Log
        Message&quot; below). The full session history is still one tap away on{" "}
        <code>/history</code> for anyone curious.
      </p>

      <p className="text-sm text-foreground mb-3">
        <strong>Why &quot;heaviest,&quot; not &quot;last&quot;:</strong> people often add a lighter
        back-off set after their real top effort (extra volume/pump). If we used whichever set was
        logged last, a back-off set would silently replace the true effort in the calculation:
      </p>
      <ExampleBox title="Logged: 150x15, 180x10, 200x8, 150x12 (back-off set at the end)">
        {`Last set logged  →  150x12  (WRONG — this was a lighter back-off set, not real effort)
Heaviest set     →  200x8   (RIGHT — this was the actual top effort that day)`}
      </ExampleBox>

      {/* ------------------------------------------------------------------ */}
      <SectionTitle>PR Tracked — Weight PR Only</SectionTitle>
      <p className="text-sm text-foreground mb-3">
        We used to also track an &quot;Estimated Max PR&quot; via Epley&apos;s formula (predicting
        a 1-rep max from any weight + reps combo, so e.g. 175x4 and 190x2 could be compared on one
        number). Dropped it — showing someone a computed &quot;Est. Max: 198 lbs&quot; number right
        next to the 175 lbs they actually lifted just confused anyone who isn&apos;t already a
        lifter, and it wasn&apos;t driving any real decision (the rep ladder below already tells
        someone plainly whether they&apos;re progressing). One PR now, and it&apos;s the obvious one:
      </p>
      <div className="bg-card border border-border rounded-xl p-4 mb-3">
        <p className="text-sm font-medium text-foreground">🏆 Weight PR</p>
        <p className="text-sm text-muted-foreground">
          Highest weight ever logged for this exercise, any rep count. If you lock out 200 lbs for
          even 1 rep and your old best was 190, that&apos;s an instant, obvious PR — the number you
          actually lifted, no formula, nothing to explain.
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}
      <SectionTitle>When Do We Suggest Heavier Weight? — The Graduated Rep Ladder</SectionTitle>
      <p className="text-sm text-foreground mb-3">
        One rule, no formula, no prediction: compare the heaviest set&apos;s reps directly against
        the exercise&apos;s <strong>own target reps</strong>. Below target → same weight next time,
        chase a couple more reps. At or above target → that&apos;s proof enough, suggest the next
        weight. No tier margin, no percentage math, no inverted Epley — just &quot;did they clear
        the bar or not.&quot;
      </p>
      <ExampleBox title="The rule">
        {`effective target = exercise's targetReps + goal offset (see below)

heaviest set reps  <  effective target  →  stay at current weight, beat last rep count by 1-2
heaviest set reps  ≥  effective target  →  jump to current weight + 5 lbs`}
      </ExampleBox>
      <p className="text-sm text-foreground mb-3">
        The jump is always a flat <strong>+5 lbs</strong> — never a percentage, never +2.5. A
        barbell&apos;s smallest real add is a 2.5 lb plate per side (5 lbs total), and dumbbell
        racks only come in 5 lb steps anyway, so a smaller suggested jump would often be a weight
        that doesn&apos;t physically exist on the rack.
      </p>

      {/* ------------------------------------------------------------------ */}
      <SectionTitle>Best of the Last 2 Sessions — Not Just the Most Recent One</SectionTitle>
      <p className="text-sm text-foreground mb-3">
        The rule above needs a real set to compare against — but which session&apos;s set? Using
        strictly the most recent one has a problem: one rough day (bad sleep, sick, a minor tweak)
        would immediately drag the target down, even if it wasn&apos;t a real change. A real coach
        doesn&apos;t rewrite the whole plan around one off day — they give it a second look first.
      </p>
      <p className="text-sm text-foreground mb-3">
        So the reference set used for the rule above is the <strong>heavier failure set of the last
        2 sessions</strong>, not just the latest one. One bad day gets absorbed by the session before
        it. Two bad sessions in a row is treated as real, because by then the older, better session
        has aged out of the 2-session window — nothing is ever permanently &quot;stuck&quot; on an old
        number, and nothing is persisted or remembered beyond those 2 real logged sessions.
      </p>
      <ExampleBox title="Bench Press — established at 400 lbs, one injury-dip session at 180">
        {`Session 1: 400x6 (clears target) → next target: try 405
Session 2: 180x6 (injury dip) → reference = heavier of {400, 180} = 400 → still shows "try 405"
Session 3: back to 210 → reference = heavier of {180, 210} = 210 → 400 has aged out, target adapts
Session 4: jump to 320 → reference = heavier of {210, 320} = 320 → target becomes 325
Session 5: dip to 280 → reference = heavier of {320, 280} = 320 → target stays 325, dip absorbed`}
      </ExampleBox>
      <p className="text-sm text-foreground mb-3">
        This reference set is only ever computed and shown once — at the start of the{" "}
        <strong>next</strong> session, using whatever the last 2 real logs are at that moment. See
        below for why nothing shows immediately after logging unless it&apos;s a PR.
      </p>

      {/* ------------------------------------------------------------------ */}
      <SectionTitle>PR-Only Post-Log Message</SectionTitle>
      <p className="text-sm text-foreground mb-3">
        Logging a set used to immediately echo back a &quot;stay at X, try for Y reps&quot; or
        &quot;target hit, try Z next time&quot; message. Dropped that — the challenge now only ever
        lives in the <strong>next</strong> session&apos;s opening prompt (the &quot;Recent heavy
        set&quot; line above), never right after logging. Right after logging, the only thing shown
        is a real Weight PR, if one happened:
      </p>
      <ExampleBox title="Logged 190x10 (first time ever logging this exercise)">
        {`✓ Done!

(nothing else — no PR possible on a first-ever log, nothing to compare against)`}
      </ExampleBox>
      <ExampleBox title="Logged 195x8 next session (beats the old 190 lb best)">
        {`✓ Done!

🏆 New PR! 195 lbs (up from 190).`}
      </ExampleBox>
      <p className="text-sm text-foreground mb-3">
        No PR → just &quot;✓ Done!&quot;, nothing more. Keeps mid-workout messages short and
        celebratory only when something real happened, while the actual coaching (what to aim for)
        lives in one place — the top of the next session.
      </p>

      {/* ------------------------------------------------------------------ */}
      <SectionTitle>Goal-Based Rep Offset</SectionTitle>
      <p className="text-sm text-foreground mb-3">
        Every exercise&apos;s <code>targetReps</code> is authored as a{" "}
        <strong>strength/powerlifting baseline</strong> — the lowest realistic rep range. The goal
        picked at onboarding adds reps on top of that baseline, because a powerlifter, a
        bodybuilder, and someone toning need different amounts of proof before the same exercise
        at the same weight is &quot;ready&quot; for more:
      </p>
      <div className="bg-card border border-border rounded-xl p-4 mb-3 space-y-1">
        <p className="text-sm text-foreground">🔴 <strong>Get Stronger</strong> — +0 (baseline as-is, e.g. 5 reps)</p>
        <p className="text-sm text-foreground">🟢 <strong>Build Muscle</strong> — +5 (hypertrophy range, e.g. 10 reps)</p>
        <p className="text-sm text-foreground">🟣 <strong>Glute Focus</strong> — +7 (higher-volume shaping work, e.g. 12 reps)</p>
        <p className="text-sm text-foreground">🟡 <strong>Lose Weight</strong> — +8 (toning/endurance range, e.g. 13 reps)</p>
      </div>
      <p className="text-sm text-foreground mb-3">
        Same exercise, same baseline, four different effective targets — no need to author
        separate target numbers per goal-plan, and no need for the weight itself to guess what
        rep range makes sense (a heavy strength lift and a light toning exercise both just read
        from the same offset table).
      </p>

      <ExampleBox title="Bench Press — baseline target 5, reference set 175x10">
        {`Get Stronger  → effective target 5+0=5   → 10 ≥ 5  → "try 180 lbs today"
Build Muscle  → effective target 5+5=10  → 10 ≥ 10 → "try 180 lbs today"
Lose Weight   → effective target 5+8=13  → 10 < 13 → "try for 11-12 reps today"`}
      </ExampleBox>

      <ExampleBox title="Lateral Raise (dumbbell) — baseline target 7, reference set 15x12">
        {`Build Muscle → effective target 7+5=12 → 12 ≥ 12 → "try 20 lbs today"
(Flat +5 — the next dumbbell up. No 16 or 17.5 lb dumbbell exists on a real rack.)`}
      </ExampleBox>

      <ExampleBox title="Why hitting a PR doesn't always mean 'jump' — Deadlift, previous best 185x5, logged 190x2">
        {`Post-log: 🏆 New PR! 190 lbs (up from 185). — always shown, it's just a fact.
Next session's prompt: "Recent heavy set: 190x2 — try for 3 reps today."
2 reps is nowhere near the effective target (say 10-13), so the challenge
still asks for more reps, not more weight. A heavier single isn't proof
you're ready for even MORE weight — those are two different questions,
and the rep check answers the second one on its own, regardless of
whether a PR badge also fired right after logging.`}
      </ExampleBox>

      {/* ------------------------------------------------------------------ */}
      <SectionTitle>The Header Shows a Range, Not the Raw Baseline</SectionTitle>
      <p className="text-sm text-foreground mb-3">
        Early version of this bug: the exercise header showed the raw baseline directly (e.g.
        &quot;3 sets x 5 reps&quot;), even for someone on Build Muscle whose real effective target
        was 10. Confusing — a lifter has no reason to know &quot;5&quot; is just an internal anchor
        for the offset math, so it read as if 5 reps was the actual goal, contradicting the &quot;try
        for X reps&quot; messaging right below it.
      </p>
      <p className="text-sm text-foreground mb-3">
        Fixed: the header shows a typical range for the goal instead — familiar gym-coaching
        language, not the internal baseline number:
      </p>
      <div className="bg-card border border-border rounded-xl p-4 mb-3 space-y-1">
        <p className="text-sm text-foreground">🔴 <strong>Get Stronger</strong> — 4-6 reps</p>
        <p className="text-sm text-foreground">🟢 <strong>Build Muscle</strong> — 8-12 reps</p>
        <p className="text-sm text-foreground">🟣 <strong>Glute Focus</strong> — 10-15 reps</p>
        <p className="text-sm text-foreground">🟡 <strong>Lose Weight</strong> — 12-15 reps</p>
      </div>
      <p className="text-sm text-foreground mb-3">
        Purely a display label — the actual trigger the ladder checks is still the exact
        baseline+offset number underneath. Applies to the day list shown right after{" "}
        <code>HERE</code> too (e.g. &quot;Bench Press — 3x8-12&quot;), so the same exercise never
        shows two different rep counts in the same session. Bodyweight exercises are unaffected —
        they keep a fixed rep count regardless of goal, since there&apos;s no weight/PR ladder for
        them today.
      </p>
      <p className="text-sm text-foreground mb-3">
        The &quot;stay and chase more reps&quot; message also changed from open-ended (&quot;beat 3
        reps or more&quot;) to a small, bounded next step — current reps +1 to +2, capped so it
        never asks for more than the effective target actually requires:
      </p>
      <ExampleBox title="nextRepGoal(currentReps, effectiveTarget)">
        {`gap = effectiveTarget - currentReps
gap ≤ 1  →  just the target number itself (e.g. "try for 10 reps")
gap ≥ 2  →  currentReps+1 to currentReps+2 (e.g. 190x3, target 10 → "try for 4-5 reps")`}
      </ExampleBox>

      {/* ------------------------------------------------------------------ */}
      <SectionTitle>PR History Tracks by Exercise Name, Not by Plan</SectionTitle>
      <p className="text-sm text-foreground mb-3">
        &quot;Bench Press&quot; exists as a separate database row in every plan and every tier —
        Beginner Build Muscle&apos;s Bench Press is a different row than Advanced Build
        Muscle&apos;s. If PR lookups matched on that row specifically, switching tiers (the
        realistic path through this app — start Beginner, graduate to Intermediate or Advanced as
        you get stronger) would silently wipe someone&apos;s PR history and restart it from zero.
      </p>
      <p className="text-sm text-foreground mb-3">
        Fix: match by <strong>exercise name</strong> instead, scoped to the user, regardless of
        which plan or tier it came from. Someone&apos;s Bench Press history now follows them
        through their whole journey through the app, not just within whichever tier they&apos;re
        on right now.
      </p>

      {/* ------------------------------------------------------------------ */}
      <SectionTitle>Where This Lives in Code</SectionTitle>
      <div className="bg-card border border-border rounded-xl px-4">
        <FileRef file="lib/sms-engine.ts — heaviestSet()" note="Picks the heaviest-weight set from a logged list — the failure set, not the last one typed" />
        <FileRef file="lib/sms-engine.ts — getBestWeightPR()" note="Highest weight ever logged for an exercise (by name), any reps — the only PR tracked" />
        <FileRef file="lib/sms-engine.ts — getReferenceSet()" note="Best failure set of the last 2 sessions (by name) — the reference the rep ladder rule compares against" />
        <FileRef file="lib/sms-engine.ts — getUserGoalKey()" note="Derives Lose Weight/Build Muscle/Get Stronger/Glute Focus from the user's active plan name" />
        <FileRef file="lib/sms-engine.ts — calculateNextSuggestedWeight()" note="The rep ladder rule — target + goal offset vs. reference set's reps, returns reference weight + 5, or null" />
        <FileRef file="lib/sms-engine.ts — GOAL_REP_OFFSET" note="The goal → extra reps required lookup (0 / 5 / 7 / 8) — drives the real trigger" />
        <FileRef file="lib/sms-engine.ts — GOAL_REP_RANGE" note="The goal → display range lookup (4-6 / 8-12 / 10-15 / 12-15) — shown in the header, not used for the trigger" />
        <FileRef file="lib/sms-engine.ts — getEffectiveTargetReps()" note="baseline + goal offset — the exact number the ladder and nextRepGoal both check against" />
        <FileRef file="lib/sms-engine.ts — nextRepGoal()" note="Bounded +1 to +2 next-rep suggestion, capped at the effective target" />
        <FileRef file="lib/sms-engine.ts — exerciseLine()" note="Day-list line shown after HERE — uses the same goal range as the header so it never contradicts the prompt" />
        <FileRef file="lib/sms-engine.ts — exercisePrompt()" note="Shows the heaviest-set-to-failure instruction and the 'Recent heavy set' challenge — the only place the ladder rule is shown to the user" />
        <FileRef file="lib/sms-engine.ts — exercise_active branch" note="Only checks the Weight PR after logging — the ladder challenge itself no longer shows here, only in the next session's prompt" />
      </div>
    </div>
  );
}
