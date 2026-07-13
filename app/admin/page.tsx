import Link from "next/link";

// =============================================================================
// /admin — Dev reference index. Internal notes-to-self on how each part of the
// app works, written so future-you (or anyone else) doesn't have to re-derive
// the reasoning from scratch. Add a new folder + page here per topic.
// =============================================================================

const TOPICS = [
  {
    href: "/admin/progression",
    title: "Progression & Estimated Max",
    description: "How weight increases get suggested, the failure-set rule, and the PR math (Epley's formula).",
  },
  {
    href: "/admin/exercises",
    title: "Exercise Library",
    description: "See which exercises are missing a gif, instructions, video, or images, and fill them in.",
  },
];

export default function AdminIndexPage() {
  return (
    <div className="min-h-screen bg-background p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground">Dev Reference</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-8">
        Internal notes on how each part of Iron Temple works — a reminder for the dev team (me).
      </p>

      <div className="flex flex-col gap-3">
        {TOPICS.map((topic) => (
          <Link
            key={topic.href}
            href={topic.href}
            className="block rounded-xl border border-border p-4 hover:bg-muted transition-colors"
          >
            <p className="text-sm font-semibold text-foreground">{topic.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{topic.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
