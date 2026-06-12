import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone");
  if (!phone) return NextResponse.json({ error: "phone required" }, { status: 400 });

  // Fetch all sets the user has ever logged
  const sets = await prisma.setLog.findMany({
    where: {
      exerciseLog: {
        skipped: false,
        session: { user: { phone } },
      },
    },
    include: {
      exerciseLog: {
        include: {
          plannedExercise: true,
          session: { select: { date: true } },
        },
      },
    },
  });

  // Group by exercise name, keep the heaviest set per exercise
  const prMap = new Map<string, { weight: number; reps: number; date: string }>();

  for (const set of sets) {
    const name = set.exerciseLog.plannedExercise.name;
    const existing = prMap.get(name);
    if (!existing || set.weight > existing.weight) {
      prMap.set(name, {
        weight: set.weight,
        reps: set.reps,
        date: set.exerciseLog.session.date.toISOString(),
      });
    }
  }

  // Sort by exercise name alphabetically
  const prs = Array.from(prMap.entries())
    .map(([name, pr]) => ({ name, ...pr }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ prs });
}
