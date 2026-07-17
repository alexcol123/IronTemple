"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

// Placeholder for now — swap in real clips here as they're recorded.
// Add more entries as the library grows (e.g. logging sets, ADD/SKIP/BUSY, switching to the app).
const VIDEOS = [
  {
    title: "Getting Started",
    description: "A quick look at how to use the app.",
    url: "https://www.w3schools.com/html/mov_bbb.mp4",
  },
];

export default function HowItWorksPage() {
  const { userId } = useParams<{ userId: string }>();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-6 pb-16">
        {/* Back link */}
        <Link href={`/menu/${userId}`} className="text-xs text-muted-foreground hover:text-foreground mb-3 inline-block">
          ← Menu
        </Link>

        {/* Nameplate */}
        <div className="flex items-baseline justify-between pb-4 mb-6 border-b-2 border-border">
          <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">Iron Temple</p>
          <p className="text-xs text-muted-foreground">How It Works</p>
        </div>

        {/* Video list */}
        <div className="flex flex-col gap-4">
          {VIDEOS.map((v) => (
            <div key={v.title} className="border border-border rounded-xl overflow-hidden">
              <video controls className="w-full aspect-video bg-black" src={v.url} />
              <div className="px-4 py-3">
                <p className="text-sm font-semibold">{v.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{v.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
