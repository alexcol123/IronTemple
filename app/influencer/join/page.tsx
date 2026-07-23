import { redirect } from "next/navigation";
import { getSignedInRole } from "@/lib/auth-roles";
import CreatorProfileForm from "../CreatorProfileForm";

// Self-serve creator signup — the destination after someone taps "Start
// Earning" on the landing page, verifies their phone via Clerk, and doesn't
// already match an admin or existing CreatorProfile (see the "unclaimed"
// role in lib/auth-roles.ts, and the redirect in app/page.tsx that sends
// them here). Deliberately not gated by an invite token — the link itself
// is the gate, same trust model as the rest of the app's private links; see
// CLAUDE.md for why that's an intentional, not missing, decision.
export default async function CreatorJoinPage() {
  const role = await getSignedInRole();
  if (role.role === "admin") redirect("/admin");
  if (role.role === "creator") redirect("/influencer/me");
  if (role.role === "none") redirect("/");

  return <CreatorProfileForm lockedPhone={role.phone} firstTimeSetup />;
}
