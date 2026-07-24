"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Creator = {
  userId: string;
  name: string;
  stageName: string | null;
  phone: string;
  photoUrl: string | null;
  plans: { id: string; name: string }[];
  subscriberCount: number;
};

export default function CreatorsListPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/creators")
      .then((r) => r.json())
      .then((data) => setCreators(data.creators))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-6 pb-16">
        <Link href="/influencer" className="text-xs text-muted-foreground hover:text-foreground mb-3 inline-block">
          ← Creator Tools
        </Link>

        <div className="flex items-baseline justify-between pb-4 mb-6 border-b-2 border-border">
          <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">Iron Temple</p>
          <p className="text-xs text-muted-foreground">All Creators</p>
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading...</p>}

        {!loading && creators.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No creators yet — go through{" "}
            <Link href="/influencer/onboarding" className="underline">
              Onboarding
            </Link>{" "}
            to create one.
          </p>
        )}

        <div className="flex flex-col gap-3">
          {creators.map((c) => {
            const displayName = c.stageName || c.name;
            return (
              <Link
                key={c.userId}
                href={`/influencer/creators/${c.userId}`}
                className="block border border-border rounded-xl p-4 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                    {c.photoUrl ? (
                      <img src={c.photoUrl} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-muted-foreground">{displayName[0] ?? "?"}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.phone}</p>
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0">
                    {c.subscriberCount} subscriber{c.subscriberCount === 1 ? "" : "s"}
                  </p>
                </div>

                {c.plans.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-3">
                    {c.plans.length} plan{c.plans.length > 1 ? "s" : ""}: {c.plans.map((p) => p.name).join(", ")}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
