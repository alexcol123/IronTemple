"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Exercise = { name: string; targetSets: number; targetReps: number; type: string };
type Day = { day: number; name: string; muscles: string; exercises: Exercise[] };
type Plan = {
  id: string;
  name: string;
  goal: string | null;
  createdByName: string | null;
  followerCount: number;
  days: Day[];
};

export default function PublicPlanPage() {
  const { planId } = useParams<{ planId: string }>();
  const searchParams = useSearchParams();
  const viewerUserId = searchParams.get("userId");
  const backHref = viewerUserId ? `/menu/${viewerUserId}` : "/";
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [following, setFollowing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!planId) { setLoading(false); return; }
    fetch(`/api/plan/${planId}`)
      .then((r) => r.json())
      .then((data) => setPlan(data.plan))
      .finally(() => setLoading(false));
  }, [planId]);

  async function handleFollow() {
    setMessage("");
    if (!phone.trim()) return setMessage("Enter your phone number.");
    setFollowing(true);
    const res = await fetch("/api/follow-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phone.trim(), planId }),
    });
    const data = await res.json();
    setFollowing(false);
    setMessage(res.ok ? `You're now following this plan, ${data.name}! Text HERE to start.` : data.error ?? "Something went wrong.");
  }

  if (loading)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );

  if (!plan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-sm text-center px-4">
        <p>Plan not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-6 pb-16">
        {/* Back link */}
        <Link href={backHref} className="text-xs text-muted-foreground hover:text-foreground mb-3 inline-block">
          ← Back
        </Link>

        {/* Nameplate */}
        <div className="flex items-baseline justify-between pb-4 mb-6 border-b-2 border-border">
          <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">Iron Temple</p>
          <div className="text-right">
            <p className="text-sm font-mono font-medium text-foreground">{plan.name}</p>
            <p className="text-xs text-muted-foreground">
              {plan.createdByName ? `By ${plan.createdByName}` : "Iron Temple"} · {plan.followerCount} following
            </p>
          </div>
        </div>

        {/* Days */}
        <div className="flex flex-col gap-3">
          {plan.goal && <p className="text-xs text-muted-foreground">Goal: {plan.goal}</p>}
          {plan.days.map((day) => (
            <div key={day.day} className="border border-border rounded-xl px-4 py-3">
              <p className="text-sm font-medium">
                Day {day.day}: {day.name}
              </p>
              <div className="flex flex-col gap-0.5 mt-1.5">
                {day.exercises.map((ex) => (
                  <p key={ex.name} className="text-xs text-muted-foreground">
                    {ex.name} — {ex.targetSets} sets
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Follow */}
        <div className="mt-6 pt-5 border-t-2 border-border flex flex-col gap-2">
          <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">Follow this plan</p>
          <div className="flex gap-2">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+15550001234" className="text-sm" />
            <Button size="sm" onClick={handleFollow} disabled={following} className="bg-amber-500 hover:bg-amber-600 text-white">
              {following ? "..." : "Follow"}
            </Button>
          </div>
          {message && <p className="text-xs text-muted-foreground">{message}</p>}
        </div>
      </div>
    </div>
  );
}
