import { requireAdmin } from "@/lib/auth-roles";
import CreatorProfileForm from "../CreatorProfileForm";

// Admin-only: picks any phone number to create or edit that creator's
// profile. Creators editing their own profile use /influencer/me instead,
// which locks the phone to their own verified number.
export default async function InfluencerOnboardingPage() {
  await requireAdmin();
  return <CreatorProfileForm />;
}
