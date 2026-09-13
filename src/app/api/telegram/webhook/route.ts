import { NextResponse } from "next/server";
import { processTelegramUpdate } from "@/lib/telegram";

// POST /api/telegram/webhook — penerima update dari Telegram Bot API
export async function POST(req: Request) {
  try {
    const update = await req.json();
    const result = await processTelegramUpdate(update);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("telegram webhook error", e);
    // selalu balas 200 ke Telegram agar tidak retry terus
    return NextResponse.json({ ok: true });
  }
}

// GET /api/telegram/webhook — healthcheck
export async function GET() {
  return NextResponse.json({ ok: true, service: "telegram-webhook" });
}
