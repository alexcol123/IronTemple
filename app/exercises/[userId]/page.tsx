"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function ExercisesPage() {
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
          <p className="text-xs text-muted-foreground">Exercise Guide</p>
        </div>

        <div className="border border-border rounded-xl p-5 text-center mt-8">
          <p className="text-sm font-medium">Coming soon</p>
          <p className="text-xs text-muted-foreground mt-1">
            Photos and how-to notes for every exercise we recommend.
          </p>
        </div>
      </div>
    </div>
  );
}
