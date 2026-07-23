import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSignedInRole, normalizePhone } from "@/lib/auth-roles";
import { normalizeJoinCode } from "@/lib/join-code";

// Creator onboarding — creates the User if this phone hasn't signed up yet
// (mirrors what JOIN does for a normal athlete, minus the goal/plan step,
// since a creator builds their own plan via /build afterward), then
// upserts their CreatorProfile. Prototype stage: no payment, no recruiter
// attribution — just enough to make a creator's public plan page real.
//
// This route sits outside /admin and /influencer, so Clerk's proxy.ts
// middleware never sees it — the page-level gating on those routes means
// nothing if this endpoint stays open, so role checks are repeated here.
// Admin can read/write any phone; a creator can only read/write their own.

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone");
  if (!phone) return NextResponse.json({ error: "phone required" }, { status: 400 });

  const role = await getSignedInRole();
  if (role.role === "none") return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  if (role.role === "creator" && normalizePhone(role.phone) !== normalizePhone(phone)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({ where: { phone }, include: { creatorProfile: true } });
  if (!user) return NextResponse.json({ found: false });

  return NextResponse.json({
    found: true,
    userId: user.id,
    name: user.name,
    phone: user.phone,
    firstName: user.creatorProfile?.firstName ?? "",
    lastName: user.creatorProfile?.lastName ?? "",
    stageName: user.creatorProfile?.stageName ?? "",
    joinCode: user.creatorProfile?.joinCode ?? "",
    photoUrl: user.creatorProfile?.photoUrl ?? "",
    bio: user.creatorProfile?.bio ?? "",
    instagramUrl: user.creatorProfile?.instagramUrl ?? "",
    youtubeUrl: user.creatorProfile?.youtubeUrl ?? "",
    tiktokUrl: user.creatorProfile?.tiktokUrl ?? "",
    introVideoUrl: user.creatorProfile?.introVideoUrl ?? "",
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    phone,
    firstName,
    lastName,
    stageName,
    joinCode,
    photoUrl,
    bio,
    instagramUrl,
    youtubeUrl,
    tiktokUrl,
    introVideoUrl,
  }: {
    phone?: string;
    firstName?: string;
    lastName?: string;
    stageName?: string;
    joinCode?: string;
    photoUrl?: string;
    bio?: string;
    instagramUrl?: string;
    youtubeUrl?: string;
    tiktokUrl?: string;
    introVideoUrl?: string;
  } = body;

  if (!phone?.trim()) return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
  if (!firstName?.trim()) return NextResponse.json({ error: "First name is required" }, { status: 400 });
  if (!lastName?.trim()) return NextResponse.json({ error: "Last name is required" }, { status: 400 });

  const role = await getSignedInRole();
  if (role.role === "none") return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  if (role.role === "creator" && normalizePhone(role.phone) !== normalizePhone(phone)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const legalName = `${firstName.trim()} ${lastName.trim()}`;
  const normalizedJoinCode = joinCode?.trim() ? normalizeJoinCode(joinCode) : null;

  let user = await prisma.user.findUnique({ where: { phone: phone.trim() } });

  if (normalizedJoinCode) {
    const codeOwner = await prisma.creatorProfile.findUnique({ where: { joinCode: normalizedJoinCode } });
    if (codeOwner && codeOwner.userId !== user?.id) {
      return NextResponse.json({ error: "That join code is already taken." }, { status: 409 });
    }
  }

  if (user) {
    user = await prisma.user.update({ where: { id: user.id }, data: { name: legalName } });
  } else {
    user = await prisma.user.create({ data: { name: legalName, phone: phone.trim() } });
  }

  const profileData = {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    stageName: stageName?.trim() || null,
    joinCode: normalizedJoinCode,
    photoUrl: photoUrl?.trim() || null,
    bio: bio?.trim() || null,
    instagramUrl: instagramUrl?.trim() || null,
    youtubeUrl: youtubeUrl?.trim() || null,
    tiktokUrl: tiktokUrl?.trim() || null,
    introVideoUrl: introVideoUrl?.trim() || null,
  };

  try {
    await prisma.creatorProfile.upsert({
      where: { userId: user.id },
      update: profileData,
      create: { userId: user.id, ...profileData },
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return NextResponse.json({ error: "That join code is already taken." }, { status: 409 });
    }
    throw err;
  }

  return NextResponse.json({ userId: user.id, name: user.name, phone: user.phone });
}
