"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function BuildPage() {
  const { userId } = useParams<{ userId: string }>();

  return (
    <div className="flex items-center justify-center h-screen bg-background overflow-hidden">
      <div className="flex flex-col w-full max-w-sm h-full sm:h-175 sm:border sm:rounded-3xl overflow-hidden sm:shadow-md">
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <Link href={`/menu/${userId}`} className="text-xs text-muted-foreground">← Menu</Link>
          <p className="font-semibold text-sm">Build Your Workout</p>
          <div className="w-10" />
        </div>

        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <p className="text-sm font-medium">Coming soon</p>
            <p className="text-xs text-muted-foreground mt-1">
              Build your own custom split — pick exercises, sets, and reps for each day.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
