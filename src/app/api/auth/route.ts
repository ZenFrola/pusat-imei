import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword, setSessionCookie, clearSessionCookie, getSessionUser, hasApprovedResellerAccess, RESELLER_STATUS } from "@/lib/auth";
import { sendResellerRegistrationToOwner } from "@/lib/telegram";
import { randomBytes } from "crypto";

// POST /api/auth — aksi: register | login | logout
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      action?: string;
      email?: string;
      password?: string;
      asReseller?: boolean;
      name?: string;
      phone?: string;
      passwordConfirmation?: string;
      paymentToken?: string;
    };
    const action = body.action;

    if (action === "register") {
      const email = (body.email || "").trim().toLowerCase();
      const password = body.password || "";
      const asReseller = !!body.asReseller;
      const name = (body.name || "").trim();
      const phone = (body.phone || "").replace(/[\s-]/g, "");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 });
      }
      if (password.length < 6) {
        return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
      }
      if (asReseller && body.passwordConfirmation !== password) {
        return NextResponse.json({ error: "Konfirmasi password tidak cocok" }, { status: 400 });
      }
      if (asReseller) {
        if (!name) return NextResponse.json({ error: "Nama wajib diisi untuk reseller" }, { status: 400 });
        if (!/^(\+?62|0)8\d{7,13}$/.test(phone)) {
          return NextResponse.json({ error: "Format No HP/WhatsApp tidak valid" }, { status: 400 });
        }
      }
      const existing = await db.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: "Email sudah terdaftar, silakan login" }, { status: 400 });
      }
      const isFirstUser = (await db.user.count()) === 0;
      const user = await db.user.create({
        data: {
          email,
          password: hashPassword(password),
          name: asReseller ? name : undefined,
          phone: asReseller ? phone : undefined,
          isReseller: false,
          resellerStatus: asReseller ? RESELLER_STATUS.PENDING : RESELLER_STATUS.NONE,
          resellerPaymentStatus: asReseller ? "UNPAID" : "NOT_REQUIRED",
          resellerPaymentToken: asReseller ? randomBytes(32).toString("hex") : undefined,
          isAdmin: isFirstUser,
        },
      });
      if (asReseller) {
        return NextResponse.json({
          pending: true,
          paymentToken: user.resellerPaymentToken,
          user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
        });
      }
      await setSessionCookie(user.id);
      return NextResponse.json({
        user: { id: user.id, email: user.email, isReseller: false, resellerStatus: user.resellerStatus, isAdmin: user.isAdmin },
      });
    }

    if (action === "login") {
      const email = (body.email || "").trim().toLowerCase();
      const password = body.password || "";
      const user = await db.user.findUnique({ where: { email } });
      if (!user || !verifyPassword(password, user.password)) {
        return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
      }
      if (user.resellerStatus === RESELLER_STATUS.PENDING) {
        return NextResponse.json({ error: "Pendaftaran reseller Anda masih menunggu persetujuan owner." }, { status: 403 });
      }
      if (user.resellerStatus === RESELLER_STATUS.REJECTED) {
        return NextResponse.json({ error: "Pendaftaran reseller Anda ditolak. Silakan hubungi admin jika diperlukan." }, { status: 403 });
      }
      await setSessionCookie(user.id);
      return NextResponse.json({
        user: { id: user.id, email: user.email, name: user.name, phone: user.phone, isReseller: hasApprovedResellerAccess(user), resellerStatus: user.resellerStatus, isAdmin: user.isAdmin },
      });
    }
    if (action === "claim_reseller_payment") {
      const token = (body.paymentToken || "").trim();
      if (!token) return NextResponse.json({ error: "Token pembayaran tidak valid" }, { status: 400 });
      const pendingUser = await db.user.findUnique({ where: { resellerPaymentToken: token } });
      if (!pendingUser || pendingUser.resellerStatus !== RESELLER_STATUS.PENDING) {
        return NextResponse.json({ error: "Pendaftaran reseller tidak ditemukan atau sudah diproses" }, { status: 404 });
      }
      const updated = await db.user.updateMany({
        where: { id: pendingUser.id, resellerStatus: RESELLER_STATUS.PENDING, resellerPaymentStatus: "UNPAID" },
        data: { resellerPaymentStatus: "CLAIMED" },
      });
      if (updated.count === 0) return NextResponse.json({ error: "Pembayaran sudah diklaim sebelumnya" }, { status: 409 });
      const setting = await db.setting.findUnique({ where: { id: "main" } });
      if (!setting?.telegramBotToken || !setting.telegramChatId) {
        await db.user.update({ where: { id: pendingUser.id }, data: { resellerPaymentStatus: "UNPAID" } });
        return NextResponse.json({ error: "Bot Telegram owner belum dikonfigurasi" }, { status: 503 });
      }
      const sent = await sendResellerRegistrationToOwner(setting.telegramBotToken, setting.telegramChatId, pendingUser);
      if (!sent.ok) {
        await db.user.update({ where: { id: pendingUser.id }, data: { resellerPaymentStatus: "UNPAID" } });
        return NextResponse.json({ error: sent.description || "Gagal mengirim notifikasi owner" }, { status: 502 });
      }
      return NextResponse.json({ ok: true, message: "Klaim pembayaran terkirim. Owner akan memeriksa mutasi QRIS." });
    }

    if (action === "become_reseller") {
      return NextResponse.json(
        { error: "Silakan daftar sebagai reseller melalui form registrasi agar owner dapat memprosesnya." },
        { status: 400 }
      );
    }

    if (action === "logout") {
      await clearSessionCookie();
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  } catch (e) {
    console.error("auth error", e);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

// GET /api/auth — info user saat ini
export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json({ user });
}
