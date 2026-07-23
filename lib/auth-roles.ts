import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

// Clerk gives us "is this a real, logged-in person" (see proxy.ts). This
// layer answers the next question — "which person" — by matching their
// verified Clerk phone number against ADMIN_PHONES (you) or an existing
// CreatorProfile (a creator). No Clerk roles/orgs involved on purpose: the
// whole app's identity model is already phone-keyed (see User.phone), so
// reusing that instead of a second, separate role system avoids having to
// keep two identities in sync.

// Only the last 10 digits are compared so formatting differences (E.164
// "+1..." from Clerk vs. this app's inconsistently-stored User.phone values,
// e.g. Larry Wheels was saved as "5555555555" with no country code) don't
// cause a false "no match".
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

const ADMIN_PHONES = (process.env.ADMIN_PHONES ?? "")
  .split(",")
  .map(normalizePhone)
  .filter(Boolean);

// "unclaimed" = a real, phone-verified Clerk session that doesn't match an
// admin or an existing CreatorProfile — today the only way to reach Clerk
// auth at all is /admin, /influencer, or the self-serve creator signup link
// (/influencer/join), so this state specifically means "verified, mid-way
// through becoming a creator" rather than some other kind of visitor.
export type SignedInRole =
  | { role: "admin" }
  | { role: "creator"; userId: string; phone: string }
  | { role: "unclaimed"; phone: string }
  | { role: "none" };

export async function getSignedInRole(): Promise<SignedInRole> {
  const user = await currentUser();
  const rawPhone = user?.phoneNumbers[0]?.phoneNumber;
  if (!rawPhone) return { role: "none" };

  const normalized = normalizePhone(rawPhone);
  if (ADMIN_PHONES.includes(normalized)) return { role: "admin" };

  // Small creator count for now — a plain findMany + JS comparison is simpler
  // and fast enough than pushing phone normalization into SQL.
  const creators = await prisma.creatorProfile.findMany({ include: { user: true } });
  const match = creators.find((c) => normalizePhone(c.user.phone) === normalized);
  if (match) return { role: "creator", userId: match.userId, phone: match.user.phone };

  return { role: "unclaimed", phone: rawPhone };
}

export async function requireAdmin(): Promise<void> {
  const role = await getSignedInRole();
  if (role.role !== "admin") redirect("/");
}

export async function requireCreator(): Promise<{ userId: string; phone: string }> {
  const role = await getSignedInRole();
  if (role.role !== "creator") redirect("/");
  return { userId: role.userId, phone: role.phone };
}
