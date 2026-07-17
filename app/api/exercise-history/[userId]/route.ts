import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/app/generated/prisma/client";

// Per-exercise weight history — powers the chart a user lands on after
// tapping a PR card in /prs. Two zoom levels: a recent weekly chart (last ~12
// weeks, fine-grained — "am I stalling right now") and an all-time monthly
// rollup (highest weight per month — the multi-year trendline).
//
// The weekly chart is bounded to a recent date range before hitting the DB,
// and the monthly rollup is aggregated with a GROUP BY in Postgres, so
// neither query pulls a user's entire set-log history into Node just to
// reduce it down to a couple dozen chart points. That reduction is exactly
// what SQL aggregates are for — the more history a user has, the more this
// matters.

function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - ((day + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const name = req.nextUrl.searchParams.get("name");
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const exerciseFilter = {
    skipped: false,
    session: { userId },
    plannedExercise: { name, type: "weighted" as const },
  };

  const totalSessions = await prisma.exerciseLog.count({ where: exerciseFilter });
  if (totalSessions === 0) {
    return NextResponse.json({ name, hasData: false });
  }

  // Recent weekly window — only the last 12 weeks are ever charted, so only
  // fetch that range instead of every set the user has ever logged.
  const recentCutoff = mondayOf(new Date());
  recentCutoff.setDate(recentCutoff.getDate() - 11 * 7);

  const recentLogs = await prisma.exerciseLog.findMany({
    where: { ...exerciseFilter, session: { userId, date: { gte: recentCutoff } } },
    include: { sets: true, session: { select: { date: true } } },
  });

  const perWeek = new Map<string, number>();
  for (const log of recentLogs) {
    if (log.sets.length === 0) continue;
    const heaviest = Math.max(...log.sets.map((s) => s.weight));
    const wk = mondayOf(new Date(log.session.date)).toISOString();
    perWeek.set(wk, Math.max(perWeek.get(wk) ?? 0, heaviest));
  }
  const chart = [...perWeek.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, weight]) => ({ week, weight }));

  // All-time monthly rollup — grouped in Postgres so this stays cheap no
  // matter how many years of history exist; only ~1 row per month crosses
  // the wire, never the underlying sets.
  const monthlyRows = await prisma.$queryRaw<{ month: Date; maxWeight: number }[]>(
    Prisma.sql`
      SELECT date_trunc('month', ws.date) AS month,
             MAX(sl.weight) AS "maxWeight"
      FROM "SetLog" sl
      JOIN "ExerciseLog" el ON el.id = sl."exerciseLogId"
      JOIN "WorkoutSession" ws ON ws.id = el."sessionId"
      JOIN "PlannedExercise" pe ON pe.id = el."plannedExerciseId"
      WHERE ws."userId" = ${userId}
        AND pe.name = ${name}
        AND pe.type = 'weighted'
        AND el.skipped = false
      GROUP BY date_trunc('month', ws.date)
      ORDER BY month ASC
    `
  );
  const monthly = monthlyRows.map((r) => ({ month: r.month.toISOString(), weight: r.maxWeight }));

  // All-time PR — a single aggregate, not a full-history fetch.
  const { _max } = await prisma.setLog.aggregate({
    where: { exerciseLog: exerciseFilter },
    _max: { weight: true },
  });
  const currentBest = _max.weight ?? 0;

  const bestSet = await prisma.setLog.findFirst({
    where: { weight: currentBest, exerciseLog: exerciseFilter },
    orderBy: { exerciseLog: { session: { date: "asc" } } },
    include: { exerciseLog: { include: { session: { select: { date: true } } } } },
  });
  const currentBestDate = bestSet?.exerciseLog.session.date.toISOString();

  const mostRecent = await prisma.exerciseLog.findFirst({
    where: exerciseFilter,
    include: { sets: true, session: { select: { date: true } } },
    orderBy: { session: { date: "desc" } },
  });
  const lastSession = mostRecent
    ? {
        date: mostRecent.session.date.toISOString(),
        summary: mostRecent.sets.map((s) => `${s.weight}x${s.reps}`).join(" "),
      }
    : undefined;

  // Motivational lifetime-gain line — % up from the very first time this
  // exercise was ever logged. Gated to totalSessions >= 4: with only a
  // session or two of history, an early cautious warm-up weight makes even a
  // normal early jump look like an absurd/inflated percentage. Also omitted
  // outright when it isn't a genuine gain (first session already the
  // all-time best, or a rare net decrease) rather than showing 0% or negative.
  let progress: { startWeight: number; percentGain: number } | null = null;
  if (totalSessions >= 4) {
    const earliest = await prisma.exerciseLog.findFirst({
      where: exerciseFilter,
      include: { sets: true },
      orderBy: { session: { date: "asc" } },
    });
    const startWeight = earliest ? Math.max(...earliest.sets.map((s) => s.weight)) : 0;
    const percentGain = startWeight > 0 ? Math.round(((currentBest - startWeight) / startWeight) * 100) : 0;
    progress = percentGain > 0 ? { startWeight, percentGain } : null;
  }

  return NextResponse.json({
    name,
    hasData: true,
    chart,
    monthly,
    currentBest,
    currentBestDate,
    lastSession,
    totalSessions,
    progress,
  });
}
