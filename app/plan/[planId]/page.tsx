"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Exercise = { name: string; targetSets: number; targetReps: number; type: string };
type Day = { day: number; name: string; muscles: string; exercises: Exercise[] };
type OtherPlan = { id: string; name: string; dayCount: number };
type Plan = {
  id: string;
  name: string;
  goal: string | null;
  visibility: "personal" | "public";
  createdByName: string | null;
  followerCount: number;
  otherPlans: OtherPlan[];
  days: Day[];
  creatorPhotoUrl: string | null;
  creatorBio: string | null;
  creatorInstagramUrl: string | null;
  creatorYoutubeUrl: string | null;
  creatorTiktokUrl: string | null;
  creatorIntroVideoUrl: string | null;
};

function getYouTubeEmbedUrl(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

// Social fields accept either a full URL or a bare "@handle" — normalize
// either into a real clickable destination.
function socialUrl(value: string, platform: "instagram" | "youtube" | "tiktok"): string {
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  const handle = value.replace(/^@/, "");
  if (platform === "instagram") return `https://instagram.com/${handle}`;
  if (platform === "youtube") return `https://youtube.com/@${handle}`;
  return `https://tiktok.com/@${handle}`;
}

export default function PublicPlanPage() {
  const { planId } = useParams<{ planId: string }>();
  const searchParams = useSearchParams();
  const viewerUserId = searchParams.get("userId");
  const backHref = searchParams.get("from") === "business" ? "/influencer/me" : viewerUserId ? `/menu/${viewerUserId}` : "/";
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [following, setFollowing] = useState(false);
  const [message, setMessage] = useState("");
  const [switchingId, setSwitchingId] = useState<string | null>(null);

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

  // Switching to a sibling plan by the same creator — one click if we already
  // know who's viewing (came from their own menu/build), otherwise falls
  // back to whatever phone number they've typed into the Follow box above.
  async function handleSwitchTo(targetPlanId: string) {
    setMessage("");
    if (!viewerUserId && !phone.trim()) {
      setMessage("Enter your phone number below first, then try switching again.");
      return;
    }
    setSwitchingId(targetPlanId);
    const res = await fetch("/api/follow-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(viewerUserId ? { userId: viewerUserId, planId: targetPlanId } : { phone: phone.trim(), planId: targetPlanId }),
    });
    const data = await res.json();
    setSwitchingId(null);
    setMessage(res.ok ? `You're now following ${data.name}'s new program! Text HERE to start.` : data.error ?? "Something went wrong.");
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

        {/* Creator profile */}
        {(plan.creatorPhotoUrl || plan.creatorBio || plan.creatorInstagramUrl || plan.creatorYoutubeUrl || plan.creatorTiktokUrl || plan.creatorIntroVideoUrl) && (
          <div className="border border-border rounded-xl p-5 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                {plan.creatorPhotoUrl ? (
                  <img src={plan.creatorPhotoUrl} alt={plan.createdByName ?? "Creator"} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-muted-foreground">{plan.createdByName?.[0] ?? "?"}</span>
                )}
              </div>
              <p className="text-sm font-semibold">{plan.createdByName}</p>
            </div>

            {plan.creatorBio && <p className="text-sm text-foreground mb-3">{plan.creatorBio}</p>}

            {(plan.creatorInstagramUrl || plan.creatorYoutubeUrl || plan.creatorTiktokUrl) && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {plan.creatorInstagramUrl && (
                  <a
                    href={socialUrl(plan.creatorInstagramUrl, "instagram")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:bg-muted transition-colors"
                  >
                    Instagram
                  </a>
                )}
                {plan.creatorYoutubeUrl && (
                  <a
                    href={socialUrl(plan.creatorYoutubeUrl, "youtube")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:bg-muted transition-colors"
                  >
                    YouTube
                  </a>
                )}
                {plan.creatorTiktokUrl && (
                  <a
                    href={socialUrl(plan.creatorTiktokUrl, "tiktok")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:bg-muted transition-colors"
                  >
                    TikTok
                  </a>
                )}
              </div>
            )}

            {plan.creatorIntroVideoUrl && getYouTubeEmbedUrl(plan.creatorIntroVideoUrl) && (
              <div className="rounded-xl overflow-hidden aspect-video">
                <iframe
                  src={getYouTubeEmbedUrl(plan.creatorIntroVideoUrl)!}
                  title={`${plan.createdByName ?? "Creator"} intro video`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        )}

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

        {/* Other programs by the same creator — lets a subscriber discover
            and one-click switch to a sibling plan (e.g. a 3-day vs. 5-day
            version) without already knowing its link. */}
        {plan.otherPlans.length > 0 && (
          <div className="mt-6 pt-5 border-t-2 border-border flex flex-col gap-2">
            <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
              Other programs by {plan.createdByName}
            </p>
            <div className="flex flex-col gap-1.5">
              {plan.otherPlans.map((other) => (
                <div key={other.id} className="flex items-center justify-between text-sm px-3 py-2 rounded-xl border border-border">
                  <div>
                    <p className="font-medium">{other.name}</p>
                    <p className="text-xs text-muted-foreground">{other.dayCount} days/week</p>
                  </div>
                  <button
                    onClick={() => handleSwitchTo(other.id)}
                    disabled={switchingId === other.id}
                    className="text-xs px-2.5 py-1 rounded-full border hover:bg-muted transition-colors shrink-0"
                  >
                    {switchingId === other.id ? "..." : "Switch to this"}
                  </button>
                </div>
              ))}
            </div>
            {message && <p className="text-xs text-muted-foreground">{message}</p>}
          </div>
        )}

        {/* Follow — hidden entirely for a personal plan, which isn't meant
            for anyone but its creator (see app/api/follow-plan/route.ts). */}
        {plan.visibility === "public" && (
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
        )}
      </div>
    </div>
  );
}
