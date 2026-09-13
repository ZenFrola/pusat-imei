import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { sendOrderToOwner } from "@/lib/telegram";
import { cookies } from "next/headers";
import { randomBytes, randomInt } from "crypto";

const GUEST_ORDER_COOKIE = "jasaku_guest_orders";

function makeCode() {
  return `JS-${randomInt(10000, 99999)}`;
}

// GET /api/orders — pesanan user login atau customer guest di browser ini
export async function GET() {
  const user = await getSessionUser();
  const guestToken = (await cookies()).get(GUEST_ORDER_COOKIE)?.value;
  if (!user && !guestToken) return NextResponse.json({ orders: [] });

  const orders = await db.order.findMany({
    where: user ? { userId: user.id } : { guestToken },
    include: { service: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ orders });
}

// POST /api/orders — customer biasa dapat order tanpa login
export async function POST(req: Request) {
  const user = await getSessionUser();

  const body = (await req.json()) as { serviceId?: string; imei?: string; waNumber?: string };
  const imei = (body.imei || "").replace(/\s+/g, "");
  const waNumber = (body.waNumber || "").replace(/[\s-]/g, "");

  if (!body.serviceId) return NextResponse.json({ error: "Layanan wajib dipilih" }, { status: 400 });
  if (!/^\d{10,20}$/.test(imei)) {
    return NextResponse.json({ error: "No IMEI harus 10-20 digit angka" }, { status: 400 });
  }
  if (!/^(\+?62|0)8\d{7,13}$/.test(waNumber)) {
    return NextResponse.json({ error: "Format No WA tidak valid (contoh: 081234567890)" }, { status: 400 });
  }

  const service = await db.service.findUnique({ where: { id: body.serviceId } });
  if (!service || !service.active) {
    return NextResponse.json({ error: "Layanan tidak ditemukan" }, { status: 404 });
  }

  const price = user?.isReseller ? service.resellerPrice : service.price;

  // pastikan kode unik
  let code = makeCode();
  for (let i = 0; i < 5; i++) {
    const dup = await db.order.findUnique({ where: { code } });
    if (!dup) break;
    code = makeCode();
  }

  const order = await db.order.create({
    data: {
      code,
      userId: user?.id,
      guestToken: user ? undefined : randomBytes(32).toString("hex"),
      serviceId: service.id,
      imei,
      waNumber,
      price,
      isResellerOrder: !!user?.isReseller,
      status: "MENUNGGU_PEMBAYARAN",
    },
  });

  const response = NextResponse.json({ order });
  if (!user && order.guestToken) {
    response.cookies.set(GUEST_ORDER_COOKIE, order.guestToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }
  return response;
}

// PATCH /api/orders — klaim pembayaran QRIS { orderId }
export async function PATCH(req: Request) {
  const user = await getSessionUser();
  const guestToken = (await cookies()).get(GUEST_ORDER_COOKIE)?.value;
  if (!user && !guestToken) {
    return NextResponse.json({ error: "Sesi pesanan tidak ditemukan" }, { status: 401 });
  }

  const body = (await req.json()) as { orderId?: string };
  if (!body.orderId) return NextResponse.json({ error: "orderId wajib" }, { status: 400 });

  const order = await db.order.findUnique({
    where: { id: body.orderId },
    include: { service: true, user: true },
  });
  const ownsOrder = user ? order?.userId === user.id : order?.guestToken === guestToken;
  if (!order || !ownsOrder) {
    return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
  }
  if (order.status !== "MENUNGGU_PEMBAYARAN") {
    return NextResponse.json({ error: "Pesanan sudah diklaim / tidak valid" }, { status: 400 });
  }

  const updated = await db.order.update({
    where: { id: order.id },
    data: { status: "MENUNGGU_KONFIRMASI" },
  });

  // Kirim notifikasi ke bot Telegram owner
  let tgSent = false;
  let tgError: string | null = null;
  const setting = await db.setting.findUnique({ where: { id: "main" } });
  if (setting?.telegramBotToken && setting?.telegramChatId) {
    const res = await sendOrderToOwner(setting.telegramBotToken, setting.telegramChatId, order);
    tgSent = !!res.ok;
    if (!res.ok) tgError = res.description || "Gagal kirim ke Telegram";
  } else {
    tgError = "Bot Telegram belum dikonfigurasi (atur di Panel Admin)";
  }

  return NextResponse.json({ order: updated, tgSent, tgError });
}
