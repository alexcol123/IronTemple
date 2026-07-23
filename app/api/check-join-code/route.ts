import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeJoinCode } from "@/lib/join-code";

// Live availability check for the "Join Code" field on the creator profile
// form — same UX pattern as checking a username on any signup form.
// excludeUserId lets a creator's own current code check as "available"
// against themselves while they're re-saving unrelated fields.
export async function GET(req: NextRequest) {
  const rawCode = req.nextUrl.searchParams.get("code");
  const excludeUserId = req.nextUrl.searchParams.get("excludeUserId");
  if (!rawCode?.trim()) return NextResponse.json({ available: false, error: "Code required" }, { status: 400 });

  const code = normalizeJoinCode(rawCode);
  if (!code) return NextResponse.json({ available: false, error: "Code must contain letters or numbers" });

  const existing = await prisma.creatorProfile.findUnique({ where: { joinCode: code } });
  const available = !existing || existing.userId === excludeUserId;

  return NextResponse.json({ available, normalized: code });
}
