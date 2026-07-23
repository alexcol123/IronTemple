import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/app/generated/prisma/client";
import { handleMessage, State } from "@/lib/sms-engine";

function twiml(message: string) {
  const escaped = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`;
}

export async function POST(req: NextRequest) {
  const body = await req.formData();
  const from = body.get("From") as string;
  const text = (body.get("Body") as string) ?? "";

  console.log(`📩 Inbound SMS from ${from}: "${text}"`);

  const saved = await prisma.smsState.findUnique({ where: { phone: from } });
  const state = (saved?.state as State) ?? "idle";
  const context = (saved?.context as Record<string, unknown>) ?? {};

  const result = await handleMessage(from, text, state, context);

  const nextContext = (result.context ?? {}) as Prisma.InputJsonValue;
  await prisma.smsState.upsert({
    where: { phone: from },
    create: { phone: from, state: result.nextState, context: nextContext },
    update: { state: result.nextState, context: nextContext },
  });

  return new NextResponse(twiml(result.reply), { headers: { "Content-Type": "text/xml" } });
}
