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

  if (loading) return <div className="flex items-center justify-center h-screen text-sm text-muted-foreground">Loading...</div>;

  if (!plan) {
    return (
      <div className="flex items-center justify-center h-screen text-sm text-center px-4">
        <p>Plan not found.</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen bg-background overflow-hidden">
      <div className="flex flex-col w-full max-w-sm h-full sm:h-175 sm:border sm:rounded-3xl overflow-hidden sm:shadow-md">
        {/* Header */}
        <div className="px-4 py-3 border-b flex flex-col gap-1.5">
          <Link href={backHref} className="text-xs text-muted-foreground">← Back</Link>
          <div className="flex flex-col items-center gap-0.5">
            <p className="font-semibold text-sm">{plan.name}</p>
            <p className="text-xs text-muted-foreground">
              {plan.createdByName ? `By ${plan.createdByName}` : "Iron Temple"} · {plan.followerCount} following
            </p>
          </div>
        </div>

        {/* Days */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {plan.goal && <p className="text-xs text-muted-foreground">Goal: {plan.goal}</p>}
          {plan.days.map((day) => (
            <div key={day.day} className="border rounded-2xl px-4 py-3">
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
        <div className="px-4 py-3 border-t flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">Follow this plan</p>
          <div className="flex gap-2">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+15550001234" className="text-sm" />
            <Button size="sm" onClick={handleFollow} disabled={following}>
              {following ? "..." : "Follow"}
            </Button>
          </div>
          {message && <p className="text-xs text-muted-foreground">{message}</p>}
        </div>
      </div>
    </div>
  );
}
