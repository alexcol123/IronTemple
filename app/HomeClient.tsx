import Link from "next/link";

// The public landing page — reached by anyone who isn't already a signed-in
// admin or creator (see app/page.tsx's redirect). Built to be the page a
// prospective creator gets sent mid-conversation after a personal DM, not a
// cold-traffic acquisition page — per CLAUDE.md's GTM plan, outreach stays
// 1-on-1 for now, so this page's job is to make the pitch feel real and
// answer "how does this actually work."
//
// "Start Earning" below goes through Clerk's phone+OTP verification
// (middleware-protected, see proxy.ts) before landing on the self-serve
// signup at /influencer/join — deliberately one shared link, not a unique
// invite per creator, since the DM is what gates who gets sent this page in
// the first place (see CLAUDE.md).

const JOIN_SMS_HREF = "sms:+18049770090&body=JOIN";

const FEATURES = [
  {
    title: "You Keep 70%",
    description: "Fans pay $15/month to train with you. You keep the majority — we handle the text line, the tracking, and the billing.",
  },
  {
    title: "Your Own Code",
    description: "A memorable code like JOINLARRY routes fans straight to your program. No app download, no account to create.",
  },
  {
    title: "Zero Setup Cost",
    description: "No software to buy, no payment system to wire up, no app to build. We already built it.",
  },
  {
    title: "It's Still Your Program",
    description: "Your splits, your coaching style, your name on it. This isn't a stranger's app — it's yours, under the hood.",
  },
];

const STEPS = [
  {
    title: "We build your program together",
    description: "Your splits, your exercises, your rep ranges — the program you already coach, just structured for text.",
  },
  {
    title: "You get your own text code",
    description: "Something like JOINLARRY. Share it in a story, a caption, or at the end of a video — wherever your fans already are.",
  },
  {
    title: "They text in and start training",
    description: "No app to download. They text the code, pay their subscription, and start logging workouts the same day.",
  },
  {
    title: "You get paid your share",
    description: "Every subscriber who stays under your program pays out to you, every month, automatically.",
  },
];

const MATH_ROWS = [
  { fans: "100 fans", amount: "$1,050/mo" },
  { fans: "500 fans", amount: "$5,250/mo" },
  { fans: "1,000 fans", amount: "$10,500/mo" },
];

export default function HomeClient() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border max-w-3xl mx-auto">
        <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">Iron Temple</p>
        <Link href="/sign-in" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Log in
        </Link>
      </div>

      {/* Hero */}
      <div className="max-w-3xl mx-auto px-6 pt-16 pb-14 text-center">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-4">
          For Fitness Creators
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight text-balance">
          You&apos;ve got the followers. Now get paid to coach them.
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-4 max-w-xl mx-auto text-balance">
          Turn your Instagram into recurring income. Your fans text a number, get your exact program, and pay you
          every month — automatically.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <Link
            href="/influencer/join"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
          >
            Start Earning →
          </Link>
          <a href={JOIN_SMS_HREF} className="text-xs text-muted-foreground hover:text-foreground underline transition-colors">
            Want to see it work first? Text JOIN to try it as a member.
          </a>
        </div>
      </div>

      {/* Feature grid */}
      <div className="max-w-3xl mx-auto px-6 pb-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="border border-border rounded-xl p-5">
              <p className="text-sm font-semibold text-foreground">{f.title}</p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* The math */}
      <div className="max-w-3xl mx-auto px-6 pb-14">
        <div className="border border-border rounded-xl p-6">
          <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-1">The Math</p>
          <p className="text-xs text-muted-foreground mb-5">
            Illustrative — at 70% of a $15/month subscription, per fan who stays subscribed.
          </p>
          <div className="grid grid-cols-3 gap-3 text-center">
            {MATH_ROWS.map((row) => (
              <div key={row.fans}>
                <p className="text-lg sm:text-xl font-bold text-foreground">{row.amount}</p>
                <p className="text-xs text-muted-foreground mt-1">{row.fans}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-3xl mx-auto px-6 pb-16">
        <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-5">How It Works</p>
        <div className="flex flex-col gap-5">
          {STEPS.map((step, i) => (
            <div key={step.title} className="flex gap-4">
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-bold text-foreground">
                {i + 1}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{step.title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border">
        <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col items-center gap-3 text-center">
          <Link
            href="/influencer/join"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Start Earning →
          </Link>
          <p className="text-xs text-muted-foreground">
            Verify your number, tell us about your program, and you&apos;re live.
          </p>
          <Link href="/sign-in" className="text-xs text-muted-foreground hover:text-foreground underline transition-colors mt-2">
            Already set up? Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
