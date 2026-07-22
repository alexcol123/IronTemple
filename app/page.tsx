import { getSignedInRole } from "@/lib/auth-roles";
import { redirect } from "next/navigation";
import HomeClient from "./HomeClient";

// Post-login landing spot (Clerk's fallback redirect after sign-in/up is
// "/") — bounces a signed-in admin or creator to their own area. Anyone
// else (signed out, or signed in with no matching role) just sees the
// existing dev phone-lookup page below.
export default async function Page() {
  const role = await getSignedInRole();
  if (role.role === "admin") redirect("/admin");
  if (role.role === "creator") redirect("/influencer/me");
  return <HomeClient />;
}
