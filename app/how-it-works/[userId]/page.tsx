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
    <div className="flex items-center justify-center h-screen bg-background overflow-hidden">
      <div className="flex flex-col w-full max-w-sm h-full sm:h-175 sm:border sm:rounded-3xl overflow-hidden sm:shadow-md">
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <Link href={`/menu/${userId}`} className="text-xs text-muted-foreground">← Menu</Link>
          <p className="font-semibold text-sm">How It Works</p>
          <div className="w-10" />
        </div>

        {/* Video list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
          {VIDEOS.map((v) => (
            <div key={v.title} className="border rounded-2xl overflow-hidden">
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
