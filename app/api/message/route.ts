import { NextRequest, NextResponse } from "next/server";
import { handleMessage, State } from "@/lib/sms-engine";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { phone, text, state, context = {} }: { phone: string; text: string; state: State; context: Record<string, unknown> } = body;

  const result = await handleMessage(phone, text, state, context);
  return NextResponse.json(result);
}
