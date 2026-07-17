"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

const COMMANDS = [
  { cmd: "JOIN", desc: "Sign up with your phone number", when: "Any time" },
  { cmd: "HERE", desc: "Start today's workout", when: "Any time" },
  { cmd: "CHANGE", desc: "Switch to a different plan", when: "Any time" },
  { cmd: "START", desc: "Begin your exercise list", when: "After HERE" },
  { cmd: "SKIP", desc: "Not doing this exercise today", when: "During a workout" },
  { cmd: "BUSY", desc: "Equipment's taken — swap it down one spot, come back shortly", when: "During a workout" },
  { cmd: "ADD", desc: "Log something extra, e.g. ADD Cable Crossovers", when: "During a workout" },
  { cmd: "REMOVE", desc: "Take an exercise out of your own plan going forward, e.g. REMOVE Barbell Row", when: "During a workout" },
  { cmd: "DONE", desc: "Log your recommended time automatically", when: "During cardio" },
  { cmd: "HISTORY", desc: "Get a link to your workout history", when: "Any time" },
  { cmd: "APP", desc: "Get a link to your full app", when: "Any time" },
  { cmd: "MENU", desc: "Quick help, or replay your current exercise", when: "Any time" },
];

export default function CommandsPage() {
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
          <p className="text-xs text-muted-foreground">Commands</p>
        </div>

        {/* Command list */}
        <div className="flex flex-col gap-3">
          {COMMANDS.map((c) => (
            <div key={c.cmd} className="border border-border rounded-xl px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-mono font-semibold text-amber-500">{c.cmd}</p>
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
