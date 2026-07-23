"use client";

import { Suspense, useEffect } from "react";
import { SignUp, useAuth } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";

// Same fix as app/sign-in — see that file for the full explanation. Applied
// here too since a brand-new phone (the actual common case for
// /influencer/join's self-serve signup) can land on this page instead.
function RedirectOnSignUp() {
  const { isSignedIn } = useAuth();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (isSignedIn) {
      window.location.href = searchParams.get("redirect_url") || "/";
    }
  }, [isSignedIn, searchParams]);

  return null;
}

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Suspense fallback={null}>
        <RedirectOnSignUp />
      </Suspense>
      <SignUp />
    </div>
  );
}
