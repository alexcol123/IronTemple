import { getSignedInRole } from "@/lib/auth-roles";
import { redirect } from "next/navigation";
import HomeClient from "./HomeClient";

// Post-login landing spot (Clerk's fallback redirect after sign-in/up is
// "/") — bounces a signed-in admin or creator to their own area. A verified
// phone with no match yet ("unclaimed") only happens via the self-serve
// creator signup link, so it goes straight to finishing that setup instead
// of back to the marketing page. Signed-out visitors see the real landing
// page below.
export default async function Page() {
  const role = await getSignedInRole();
  if (role.role === "admin") redirect("/admin");
  if (role.role === "creator") redirect("/influencer/me");
  if (role.role === "unclaimed") redirect("/influencer/join");
  return <HomeClient />;
}
