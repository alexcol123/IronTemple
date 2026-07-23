"use client";

import { Suspense, useEffect } from "react";
import { SignIn, useAuth } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";

// Clerk's own post-verification handoff back to redirect_url has been
// observed (live-traced 2026-07-23) leaving the browser showing stale
// content — URL bar updates but the page doesn't — until a manual refresh.
// Rather than trust whatever internal client-side transition this Clerk
// version performs (no bundled docs to verify against, and this major
// version predates anything in training data — see AGENTS.md), take
// explicit control here: once Clerk confirms the session is live, force a
// real browser navigation, which is always a fresh top-level request
// regardless of what Clerk or Next's client router were doing internally.
function RedirectOnSignIn() {
  const { isSignedIn } = useAuth();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (isSignedIn) {
      window.location.href = searchParams.get("redirect_url") || "/";
    }
  }, [isSignedIn, searchParams]);

  return null;
}

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Suspense fallback={null}>
        <RedirectOnSignIn />
      </Suspense>
      <SignIn />
    </div>
  );
}
