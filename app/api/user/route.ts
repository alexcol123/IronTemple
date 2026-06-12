import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone");
  if (!phone) return NextResponse.json({ user: null });

  const user = await prisma.user.findUnique({ where: { phone } });
  return NextResponse.json({ user });
}
