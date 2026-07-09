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

  if (loading) return <div className="flex items-center justify-center h-screen text-sm text-muted-foreground">Loading...</div>;

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-screen text-sm text-center px-4">
        <p>Profile not found.</p>
      </div>
    );
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="flex items-center justify-center h-screen bg-background overflow-hidden">
      <div className="flex flex-col w-full max-w-sm h-full sm:h-175 sm:border sm:rounded-3xl overflow-hidden sm:shadow-md">
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <Link href={`/menu/${userId}`} className="text-xs text-muted-foreground">← Menu</Link>
          <p className="font-semibold text-sm">My Info</p>
          <div className="w-10" />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5">
          <div className="text-xs text-muted-foreground">
            <p>{profile.phone}</p>
            <p>Member since {fmt(profile.createdAt)}</p>
          </div>

          {profile.planName && (
            <div className="border rounded-2xl px-3 py-2">
              <p className="text-xs text-muted-foreground">Currently on</p>
              <p className="text-sm font-medium">{profile.planName}</p>
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
                      ? "bg-primary text-primary-foreground border-primary"
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
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-foreground hover:bg-muted"
                  }`}
                >
                  {t.label} — {t.days}
                </button>
              ))}
            </div>
          </div>

          {savedMessage && <p className="text-xs text-muted-foreground">{savedMessage}</p>}
        </div>

        <div className="px-4 py-3 border-t">
          <Button onClick={handleSave} disabled={!hasChanges || saving} className="w-full rounded-full">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
