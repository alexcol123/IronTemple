"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function HomeClient() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  async function handleLookup() {
    setError("");
    const res = await fetch(`/api/user?phone=${encodeURIComponent(phone.trim())}`);
    const data = await res.json();
    if (data.user) {
      router.push(`/menu/${data.user.id}`);
    } else {
      setError("No user found with that phone number.");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleLookup();
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 gap-6 px-4">
      <Link
        href="/admin"
        className="text-sm px-4 py-2 rounded-md border bg-background hover:bg-muted transition-colors"
      >
        Admin
      </Link>

      {/* DEV ONLY — remove before production. Real users reach their app via
          the APP text command; this just skips needing a live SMS round trip
          while testing with fake accounts. */}
      <div className="flex flex-col items-center gap-2 w-full max-w-xs">
        <p className="text-xs text-muted-foreground">Dev: find a user by phone</p>
        <div className="flex gap-2 w-full">
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="+15550001234"
            className="text-sm bg-background"
          />
          <Button size="sm" onClick={handleLookup}>Go</Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}
