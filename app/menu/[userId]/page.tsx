"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ReadNav } from "@/components/read-nav";

const ITEMS = [
  { label: "My Info", desc: "Name, goal, experience level", path: "profile" },
  { label: "Build Your Workout", desc: "Create your own custom split", path: "build" },
  { label: "Exercise Guide", desc: "How to do each move", path: "exercises" },
  { label: "Commands", desc: "Every text command the app understands", path: "commands" },
];

export default function MenuPage() {
  const { userId } = useParams<{ userId: string }>();

  return (
    <div className="flex items-center justify-center h-screen bg-background overflow-hidden">
      <div className="flex flex-col w-full max-w-sm h-full sm:h-175 sm:border sm:rounded-3xl overflow-hidden sm:shadow-md">
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-center">
          <p className="font-semibold text-sm">Menu</p>
        </div>

        <ReadNav userId={userId} />

        {/* Menu items */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
          {ITEMS.map((item) => (
            <Link
              key={item.path}
              href={`/${item.path}/${userId}`}
              className="border rounded-2xl px-4 py-3 hover:bg-muted transition-colors"
            >
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
