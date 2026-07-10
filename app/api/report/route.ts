import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { start, end };
}

function getPossibleTrainingDays(start: Date, end: Date) {
  let count = 0;
  const d = new Date(start);
  while (d <= end) {
    if (d.getDay() !== 0) count++; // 0 = Sunday = rest day
    d.setDate(d.getDate() + 1);
  }
  return count;
}

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone");
  if (!phone) return NextResponse.json({ error: "phone required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const { start, end } = getMonthRange();

  // --- Attendance ---
  const sessions = await prisma.workoutSession.findMany({
    where: { userId: user.id, date: { gte: start, lte: end } },
    select: { date: true },
  });
  const uniqueDays = new Set(sessions.map((s) => s.date.toDateString())).size;
  const possibleDays = getPossibleTrainingDays(start, end);

  // --- Top 3 Improvements + Total Volume ---
  const sets = await prisma.setLog.findMany({
    where: {
      exerciseLog: {
        skipped: false,
        session: { userId: user.id, date: { gte: start, lte: end } },
      },
    },
    include: {
      exerciseLog: {
        include: {
          plannedExercise: { select: { name: true } },
          session: { select: { date: true } },
        },
      },
    },
    orderBy: { exerciseLog: { session: { date: "asc" } } },
  });

  // Total volume
  const totalVolume = sets.reduce((sum, s) => sum + s.weight * s.reps, 0);

  // Group sets by exercise → track max weight per day
  const exerciseMap = new Map<string, Map<string, number>>();
  for (const set of sets) {
    // customName covers ad-hoc (ADD) entries, which have no plannedExercise row.
    const name = set.exerciseLog.plannedExercise?.name ?? set.exerciseLog.customName ?? "Unknown";
    const day = set.exerciseLog.session.date.toDateString(); // e.g. "Mon Jun 02 2026"
    if (!exerciseMap.has(name)) exerciseMap.set(name, new Map());
    const dayMap = exerciseMap.get(name)!;
    dayMap.set(day, Math.max(dayMap.get(day) ?? 0, set.weight));
  }

  // For each exercise: max weight on first day vs max weight on last day
  const improvements = Array.from(exerciseMap.entries())
    .map(([name, dayMap]) => {
      const days = Array.from(dayMap.entries()).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
      if (days.length < 2) return null; // need at least 2 different days to compare
      const first = days[0][1];  // max weight on first day
      const last = days[days.length - 1][1]; // max weight on last day
      return { name, from: first, to: last, delta: last - first };
    })
    .filter((e): e is { name: string; from: number; to: number; delta: number } => e !== null && e.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 3);

  // --- Streak ---
  const allSessions = await prisma.workoutSession.findMany({
    where: { userId: user.id },
    select: { date: true },
    orderBy: { date: "desc" },
  });

  const sessionDays = new Set(allSessions.map((s) => s.date.toDateString()));
  let streak = 0;
  const today = new Date();
  const cursor = new Date(today);
  while (true) {
    if (cursor.getDay() === 0) { cursor.setDate(cursor.getDate() - 1); continue; } // skip Sundays
    if (sessionDays.has(cursor.toDateString())) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  const monthName = start.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return NextResponse.json({
    name: user.name,
    monthName,
    attendance: { days: uniqueDays, possible: possibleDays },
    improvements,
    totalVolume: Math.round(totalVolume),
    streak,
  });
}
