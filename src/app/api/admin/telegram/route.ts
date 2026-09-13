import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { processTelegramUpdate } from "@/lib/telegram";

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user?.isAdmin) return null;
  return user;
}

async function tgApi(token: string, method: string, body?: unknown) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return (await res.json()) as { ok: boolean; result?: unknown; description?: string };
}

// POST /api/admin/telegram — { action: "test" | "setwebhook" | "poll", baseUrl? }
export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Akses admin diperlukan" }, { status: 403 });
  }
  const setting = await db.setting.findUnique({ where: { id: "main" } });
  if (!setting?.telegramBotToken) {
    return NextResponse.json({ error: "Simpan Bot Token dulu di pengaturan" }, { status: 400 });
  }
  const body = (await req.json()) as { action?: string; baseUrl?: string };

  // 1. Tes koneksi + info bot
  if (body.action === "test") {
    const me = await tgApi(setting.telegramBotToken, "getMe");
    if (!me.ok) {
      return NextResponse.json({ error: `Token tidak valid: ${me.description}` }, { status: 400 });
    }
    const bot = me.result as { username?: string };
    let chatOk = false;
    let chatInfo = "Chat ID belum diisi";
    if (setting.telegramChatId) {
      const chat = await tgApi(setting.telegramBotToken, "getChat", { chat_id: setting.telegramChatId });
      chatOk = chat.ok;
      chatInfo = chat.ok
        ? `Terhubung ke: ${(chat.result as { title?: string; first_name?: string }).title || (chat.result as { first_name?: string }).first_name}`
        : `Chat ID bermasalah: ${chat.description}`;
    }
    return NextResponse.json({
      ok: true,
      botUsername: bot.username,
      chatOk,
      chatInfo,
      hint: chatOk ? "Bot siap digunakan" : "Pastikan owner sudah kirim /start ke bot",
    });
  }

  // 2. Pasang webhook
  if (body.action === "setwebhook") {
    const base = (body.baseUrl || "").trim().replace(/\/+$/, "");
    if (!base.startsWith("https://")) {
      return NextResponse.json(
        { error: "URL harus https:// (gunakan URL preview publik)" },
        { status: 400 }
      );
    }
    const url = `${base}/api/telegram/webhook`;
    const res = await tgApi(setting.telegramBotToken, "setWebhook", { url });
    if (!res.ok) {
      return NextResponse.json({ error: res.description || "Gagal pasang webhook" }, { status: 400 });
    }
    // webhook aktif -> reset offset polling agar tidak bentrok
    await db.setting.update({ where: { id: "main" }, data: { tgOffset: 0 } });
    const info = await tgApi(setting.telegramBotToken, "getWebhookInfo");
    return NextResponse.json({ ok: true, url, webhookInfo: info.result });
  }

  // 3. Polling manual: tarik update dari Telegram & proses tombol YES/NO
  if (body.action === "poll") {
    if (setting.telegramChatId) {
      // hapus webhook agar getUpdates tidak ditolak
      await tgApi(setting.telegramBotToken, "deleteWebhook", { drop_pending_updates: false });
    }
    const updates = (await tgApi(setting.telegramBotToken, "getUpdates", {
      offset: setting.tgOffset,
      timeout: 0,
      allowed_updates: ["callback_query", "message"],
    })) as { ok: boolean; result?: Array<{ update_id: number; callback_query?: unknown }>; description?: string };
    if (!updates.ok) {
      return NextResponse.json({ error: updates.description || "Gagal getUpdates" }, { status: 400 });
    }
    const list = updates.result || [];
    let processed = 0;
    let maxId = setting.tgOffset;
    for (const u of list) {
      await processTelegramUpdate(u as never);
      processed++;
      maxId = Math.max(maxId, u.update_id + 1);
    }
    if (maxId !== setting.tgOffset) {
      await db.setting.update({ where: { id: "main" }, data: { tgOffset: maxId } });
    }
    return NextResponse.json({ ok: true, diterima: list.length, diproses: processed });
  }

  return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
}
