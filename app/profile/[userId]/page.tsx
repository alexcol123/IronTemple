"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Goal = { label: string; planName: string };
type Tier = { label: string; key: string; days: string };

type Profile = {
  name: string;
  phone: string;
  email: string | null;
  createdAt: string;
  planName: string | null;
  planId: string | null;
  goalPlanName: string;
  tierKey: string;
};

export default function ProfileByIdPage() {
  const { userId } = useParams<{ userId: string }>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);

  const [name, setName] = useState("");
  const [goalPlanName, setGoalPlanName] = useState("");
  const [tierKey, setTierKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetch(`/api/profile?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setProfile(data.user);
          setName(data.user.name);
          setGoalPlanName(data.user.goalPlanName);
          setTierKey(data.user.tierKey);
        }
        setGoals(data.goals ?? []);
        setTiers(data.tiers ?? []);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const hasChanges =
    profile !== null &&
    (name.trim() !== profile.name || goalPlanName !== profile.goalPlanName || tierKey !== profile.tierKey);

  async function handleSave() {
    if (!userId || !profile) return;
    setSaving(true);
    setSavedMessage("");
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, name, goalPlanName, tierKey }),
    });
    setSaving(false);
    if (res.ok) {
      setProfile({ ...profile, name: name.trim(), goalPlanName, tierKey });
      setSavedMessage("Saved! Your next HERE will use the updated plan.");
    } else {
      const data = await res.json();
      setSavedMessage(data.error ?? "Something went wrong.");
    }
  }

  if (loading)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-sm text-center px-4">
        <p>Profile not found.</p>
      </div>
    );
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

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
          <p className="text-xs text-muted-foreground">My Info</p>
        </div>

        <div className="flex flex-col gap-5">
          <div className="text-xs text-muted-foreground">
            <p>{profile.phone}</p>
            <p>Member since {fmt(profile.createdAt)}</p>
          </div>

          {profile.planName && (
            <div className="border border-border rounded-xl px-3 py-2 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Currently on</p>
                <p className="text-sm font-medium">{profile.planName}</p>
              </div>
              {profile.planId && (
                <Link
                  href={`/plan/${profile.planId}?userId=${userId}`}
                  className="text-xs font-medium px-2.5 py-1 rounded-full border border-border hover:bg-muted transition-colors shrink-0"
                >
                  View / Switch →
                </Link>
              )}
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Name</p>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="text-sm" />
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Goal</p>
            <div className="flex flex-col gap-1.5">
              {goals.map((g) => (
                <button
                  key={g.planName}
                  onClick={() => setGoalPlanName(g.planName)}
                  className={`text-sm text-left px-3 py-2 rounded-xl border transition-colors ${
                    goalPlanName === g.planName
                      ? "bg-amber-500 text-white border-amber-500"
                      : "border-border text-foreground hover:bg-muted"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Experience Level</p>
            <div className="flex flex-col gap-1.5">
              {tiers.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTierKey(t.key)}
                  className={`text-sm text-left px-3 py-2 rounded-xl border transition-colors ${
                    tierKey === t.key
                      ? "bg-amber-500 text-white border-amber-500"
                      : "border-border text-foreground hover:bg-muted"
                  }`}
                >
                  {t.label} — {t.days}
                </button>
              ))}
            </div>
          </div>

          {savedMessage && <p className="text-xs text-muted-foreground">{savedMessage}</p>}

          <Button onClick={handleSave} disabled={!hasChanges || saving} className="w-full rounded-full bg-amber-500 hover:bg-amber-600 text-white">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
