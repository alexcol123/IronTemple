"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

const COMMANDS = [
  { cmd: "JOIN", desc: "Sign up with your phone number", when: "Any time" },
  { cmd: "HERE", desc: "Start today's workout", when: "Any time" },
  { cmd: "CHANGE", desc: "Switch to a different plan", when: "Any time" },
  { cmd: "START", desc: "Begin your exercise list", when: "After HERE" },
  { cmd: "SKIP", desc: "Skip the current exercise", when: "During a workout" },
  { cmd: "DONE", desc: "Log your recommended time automatically", when: "During cardio" },
  { cmd: "HISTORY", desc: "Get a link to your workout history", when: "Any time" },
  { cmd: "APP", desc: "Get a link to your full app", when: "Any time" },
  { cmd: "MENU", desc: "Quick help, or replay your current exercise", when: "Any time" },
];

export default function CommandsPage() {
  const { userId } = useParams<{ userId: string }>();

  return (
    <div className="flex items-center justify-center h-screen bg-background overflow-hidden">
      <div className="flex flex-col w-full max-w-sm h-full sm:h-175 sm:border sm:rounded-3xl overflow-hidden sm:shadow-md">
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <Link href={`/menu/${userId}`} className="text-xs text-muted-foreground">← Menu</Link>
          <p className="font-semibold text-sm">Commands</p>
          <div className="w-10" />
        </div>

        {/* Command list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {COMMANDS.map((c) => (
            <div key={c.cmd} className="border rounded-2xl px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-mono font-semibold">{c.cmd}</p>
                <p className="text-xs text-muted-foreground">{c.when}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
