import { requireCreator } from "@/lib/auth-roles";
import { ReadNav } from "@/components/read-nav";
import CreatorProfileForm from "../../CreatorProfileForm";

// A creator's own profile editor — the phone is locked server-side to
// whoever is actually signed in (see requireCreator), so there's no way to
// view or edit anyone else's profile, unlike the admin-only onboarding page.
export default async function MyCreatorProfilePage() {
  const { userId, phone } = await requireCreator();
  return (
    <>
      <ReadNav userId={userId} />
      <CreatorProfileForm lockedPhone={phone} />
    </>
  );
}
