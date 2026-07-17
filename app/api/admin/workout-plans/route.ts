import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { GOALS, EXPERIENCE_TIERS } from "@/lib/sms-engine";

// Lists the 12 real seeded plans (Beginner/Intermediate/Advanced x each goal),
// grouped by goal, for the admin dashboard to review before live testing.
export async function GET() {
  const plans = await prisma.workoutPlan.findMany({
    where: { createdByUserId: null },
    include: {
      days: {
        orderBy: { day: "asc" },
        include: { exercises: { where: { active: true }, orderBy: { order: "asc" } } },
      },
    },
  });

  const goals = GOALS.map((goal) => ({
    goal: goal.planName,
    tiers: EXPERIENCE_TIERS.map((tier) => {
      const plan = plans.find((p) => p.name === `${tier.key} ${goal.planName}`);
      return {
        tierLabel: tier.label,
        tierDays: tier.days,
        planId: plan?.id ?? null,
        planName: plan?.name ?? null,
        days:
          plan?.days.map((d) => ({
            day: d.day,
            name: d.name,
            muscles: d.muscles,
            exercises: d.exercises.map((e) => ({
              name: e.name,
              targetSets: e.targetSets,
              targetReps: e.targetReps,
              type: e.type,
            })),
          })) ?? [],
      };
    }),
  }));

  return NextResponse.json({ goals });
}
