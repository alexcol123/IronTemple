import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Creator onboarding — creates the User if this phone hasn't signed up yet
// (mirrors what JOIN does for a normal athlete, minus the goal/plan step,
// since a creator builds their own plan via /build afterward), then
// upserts their CreatorProfile. Prototype stage: no payment, no recruiter
// attribution — just enough to make a creator's public plan page real.

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone");
  if (!phone) return NextResponse.json({ error: "phone required" }, { status: 400 });

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

  const legalName = `${firstName.trim()} ${lastName.trim()}`;

  let user = await prisma.user.findUnique({ where: { phone: phone.trim() } });
  if (user) {
    user = await prisma.user.update({ where: { id: user.id }, data: { name: legalName } });
  } else {
    user = await prisma.user.create({ data: { name: legalName, phone: phone.trim() } });
  }

  const profileData = {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    stageName: stageName?.trim() || null,
    photoUrl: photoUrl?.trim() || null,
    bio: bio?.trim() || null,
    instagramUrl: instagramUrl?.trim() || null,
    youtubeUrl: youtubeUrl?.trim() || null,
    tiktokUrl: tiktokUrl?.trim() || null,
    introVideoUrl: introVideoUrl?.trim() || null,
  };

  await prisma.creatorProfile.upsert({
    where: { userId: user.id },
    update: profileData,
    create: { userId: user.id, ...profileData },
  });

  return NextResponse.json({ userId: user.id, name: user.name, phone: user.phone });
}
