import { db } from "@/lib/db";

export const STATUS_LABEL: Record<string, string> = {
  MENUNGGU_PEMBAYARAN: "Menunggu Pembayaran",
  MENUNGGU_KONFIRMASI: "Menunggu Konfirmasi Owner",
  DIPROSES: "Sedang Diproses",
  SELESAI: "Selesai",
  DIBATALKAN: "Dibatalkan",
};

export function formatRupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

async function tgApi(token: string, method: string, body: unknown) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { ok: boolean; result?: unknown; description?: string };
  return json;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] || char);
}

export async function sendResellerRegistrationToOwner(
  token: string,
  chatId: string,
  user: { id: string; name: string | null; email: string; phone: string | null; createdAt: Date }
) {
  const text =
    "🔔 <b>PENDAFTARAN RESELLER BARU</b>\n\n" +
    `👤 Nama: ${escapeHtml(user.name || "-")}\n` +
    `📧 Email: ${escapeHtml(user.email)}\n` +
    `📱 No. HP/WhatsApp: ${escapeHtml(user.phone || "-")}\n` +
    `🕐 Waktu Daftar: ${user.createdAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}\n\n` +
    "Status: ⏳ MENUNGGU PERSETUJUAN";
  return tgApi(token, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "✅ TERIMA RESELLER", callback_data: `reseller_approve_${user.id}` },
        { text: "❌ TOLAK RESELLER", callback_data: `reseller_reject_${user.id}` },
      ]],
    },
  });
}

/** Kirim notifikasi pesanan ke owner (chat id) dengan tombol inline */
export async function sendOrderToOwner(
  token: string,
  chatId: string,
  order: {
    id: string;
    code: string;
    imei: string;
    waNumber: string;
    price: number;
    isResellerOrder: boolean;
    status: string;
    service: { name: string };
    user: { email: string } | null;
  }
) {
  const text =
    `🔔 <b>PUSAT IMEI — PESANAN BARU MASUK!</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `📦 Kode: <b>${order.code}</b>\n` +
    `🛠️ Layanan: <b>${order.service.name}</b>\n` +
    `💰 Harga: <b>${formatRupiah(order.price)}</b>${order.isResellerOrder ? " (Reseller)" : ""}\n` +
    `📱 IMEI: <code>${order.imei}</code>\n` +
    `📲 No WA: ${order.waNumber}\n` +
    `👤 Akun: ${order.user?.email ?? "Customer tanpa akun"}\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `✅ Pembeli sudah klik <i>"Saya Sudah Bayar"</i> di Pusat IMEI (QRIS).\n\n` +
    `Klik <b>YES</b> untuk set status <b>DIPROSES</b>.`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: "✅ YES (Diproses)", callback_data: `confirm_${order.id}` },
        { text: "❌ NO (Batal)", callback_data: `cancel_${order.id}` },
      ],
    ],
  };

  return tgApi(token, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
}

/** Proses satu update callback_query dari Telegram. Return true jika diproses. */
export async function processTelegramUpdate(update: {
  callback_query?: {
    id: string;
    data?: string;
    message?: { chat: { id: number }; message_id: number };
  };
}): Promise<{ handled: boolean; info?: string }> {
  const cb = update.callback_query;
  if (!cb?.data) return { handled: false };

  const action = cb.data.split("_")[0];
  const orderId = cb.data.slice(action.length + 1);

  const setting = await db.setting.findUnique({ where: { id: "main" } });
  if (!setting?.telegramBotToken) return { handled: false, info: "Bot token belum diatur" };
  if (!setting.telegramChatId || String(cb.message?.chat.id) !== String(setting.telegramChatId)) {
    await tgApi(setting.telegramBotToken, "answerCallbackQuery", {
      callback_query_id: cb.id,
      text: "Aksi hanya dapat dilakukan oleh owner",
      show_alert: true,
    });
    return { handled: false, info: "Callback bukan dari chat owner" };
  }

  const resellerMatch = cb.data.match(/^reseller_(approve|reject)_(.+)$/);
  if (resellerMatch) {
    const [, decision, userId] = resellerMatch;
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      await tgApi(setting.telegramBotToken, "answerCallbackQuery", {
        callback_query_id: cb.id,
        text: "Pendaftar tidak ditemukan",
        show_alert: true,
      });
      return { handled: false, info: "Pendaftar tidak ditemukan" };
    }
    const approved = decision === "approve";
    const updated = await db.user.updateMany({
      where: { id: user.id, resellerStatus: "PENDING", resellerPaymentStatus: "CLAIMED", isReseller: false },
      data: { resellerStatus: approved ? "APPROVED" : "REJECTED", isReseller: approved },
    });
    if (updated.count === 0) {
      await tgApi(setting.telegramBotToken, "answerCallbackQuery", {
        callback_query_id: cb.id,
        text: "Pendaftaran sudah diproses",
        show_alert: true,
      });
      return { handled: false, info: "Pendaftaran reseller sudah diproses" };
    }
    const statusText = approved ? "✅ <b>RESELLER DISETUJUI</b>" : "❌ <b>PENDAFTARAN RESELLER DITOLAK</b>";
    const detail =
      `${statusText}\n\n` +
      `👤 Nama: ${escapeHtml(user.name || "-")}\n` +
      `📧 Email: ${escapeHtml(user.email)}\n` +
      `📱 No. HP: ${escapeHtml(user.phone || "-")}\n\n` +
      `Status: ${approved ? "🟢 RESELLER AKTIF" : "🔴 DITOLAK"}`;
    await tgApi(setting.telegramBotToken, "answerCallbackQuery", {
      callback_query_id: cb.id,
      text: approved ? "Reseller disetujui" : "Pendaftaran ditolak",
    });
    if (cb.message) {
      await tgApi(setting.telegramBotToken, "editMessageText", {
        chat_id: cb.message.chat.id,
        message_id: cb.message.message_id,
        text: detail,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [] },
      });
    }
    return { handled: true, info: `${user.email} -> ${approved ? "APPROVED" : "REJECTED"}` };
  }

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { service: true, user: true },
  });
  if (!order) {
    await tgApi(setting.telegramBotToken, "answerCallbackQuery", {
      callback_query_id: cb.id,
      text: "Pesanan tidak ditemukan",
    });
    return { handled: false, info: "Pesanan tidak ditemukan" };
  }

  const ALLOWED: Record<
    string,
    {
      from: string;
      status: string;
      msg: string;
      statusText: string;
      keyboard: "done" | "none";
    }
  > = {
    confirm: {
      from: "MENUNGGU_KONFIRMASI",
      status: "DIPROSES",
      msg: "Pesanan diproses ✅",
      statusText: "🔄 DIPROSES",
      keyboard: "done",
    },
    done: {
      from: "DIPROSES",
      status: "SELESAI",
      msg: "Pesanan selesai 🏁",
      statusText: "✅ PESANAN SELESAI",
      keyboard: "none",
    },
    cancel: {
      from: "MENUNGGU_KONFIRMASI",
      status: "DIBATALKAN",
      msg: "Pesanan dibatalkan ❌",
      statusText: "❌ PESANAN DIBATALKAN",
      keyboard: "none",
    },
  };
  const conf = ALLOWED[action];
  if (!conf) {
    await tgApi(setting.telegramBotToken, "answerCallbackQuery", {
      callback_query_id: cb.id,
      text: "Aksi tidak dikenal",
      show_alert: true,
    });
    return { handled: false, info: `Aksi tidak dikenal: ${action}` };
  }

  // Conditional update prevents a replayed/stale Telegram callback from changing status again.
  const updated = await db.order.updateMany({
    where: { id: order.id, status: conf.from },
    data: { status: conf.status },
  });
  if (updated.count === 0) {
    await tgApi(setting.telegramBotToken, "answerCallbackQuery", {
      callback_query_id: cb.id,
      text: `Pesanan sudah berstatus ${STATUS_LABEL[order.status] || order.status}`,
      show_alert: true,
    });
    return { handled: false, info: `Transisi ditolak: ${order.code} berstatus ${order.status}` };
  }

  await tgApi(setting.telegramBotToken, "answerCallbackQuery", {
    callback_query_id: cb.id,
    text: conf.msg,
  });

  // Edit pesan di Telegram agar owner tahu sudah diklik
  if (cb.message) {
    const newText =
      `📦 <b>${order.code}</b> — ${order.service.name}\n` +
      `💰 ${formatRupiah(order.price)}${order.isResellerOrder ? " (Reseller)" : ""}\n` +
      `📱 IMEI: <code>${order.imei}</code> | 📲 ${order.waNumber}\n` +
      `👤 ${order.user?.email ?? "Customer tanpa akun"}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `<b>PUSAT IMEI — ${conf.statusText}</b>`;
    await tgApi(setting.telegramBotToken, "editMessageText", {
      chat_id: cb.message.chat.id,
      message_id: cb.message.message_id,
      text: newText,
      parse_mode: "HTML",
      reply_markup:
        conf.keyboard === "done"
          ? {
              inline_keyboard: [
                [{ text: "🏁 TANDAI SELESAI", callback_data: `done_${order.id}` }],
              ],
            }
          : { inline_keyboard: [] },
    });
  }

  return { handled: true, info: `${order.code} -> ${conf.status}` };
}
