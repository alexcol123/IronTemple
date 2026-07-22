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
              <div key={c.userId} className="border border-border rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                    {c.photoUrl ? (
                      <img src={c.photoUrl} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-muted-foreground">{displayName[0] ?? "?"}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.phone}</p>
                  </div>
                </div>

                {c.plans.length > 0 && (
                  <p className="text-xs text-muted-foreground mb-3">
                    {c.plans.length} plan{c.plans.length > 1 ? "s" : ""}: {c.plans.map((p) => p.name).join(", ")}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/build/${c.userId}?from=business`}
                    className="text-xs font-medium px-3 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    Build their plan →
                  </Link>
                  {c.plans[0] && (
                    <Link
                      href={`/plan/${c.plans[0].id}?userId=${c.userId}`}
                      className="text-xs font-medium px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors"
                    >
                      View public plan →
                    </Link>
                  )}
                  <Link
                    href={`/menu/${c.userId}`}
                    className="text-xs font-medium px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors"
                  >
                    Menu →
                  </Link>
                  <Link
                    href={`/influencer/onboarding?phone=${encodeURIComponent(c.phone)}`}
                    className="text-xs font-medium px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors"
                  >
                    Edit profile →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
