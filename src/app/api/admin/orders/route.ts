import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user?.isAdmin) return null;
  return user;
}

// GET /api/admin/orders — semua pesanan
export async function GET(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Akses admin diperlukan" }, { status: 403 });
  }
  const imei = new URL(req.url).searchParams.get("imei")?.trim() || "";
  const orders = await db.order.findMany({
    where: imei ? { imei: { contains: imei } } : undefined,
    include: {
      service: { select: { name: true, serviceType: true } },
      user: { select: { email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ orders });
}

// PATCH /api/admin/orders — ubah status manual { orderId, status }
export async function PATCH(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Akses admin diperlukan" }, { status: 403 });
  }
  const body = (await req.json()) as { orderId?: string; status?: string };
  const allowed = ["MENUNGGU_PEMBAYARAN", "MENUNGGU_KONFIRMASI", "DIPROSES", "SELESAI", "DIBATALKAN"];
  if (!body.orderId || !body.status || !allowed.includes(body.status)) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }
  const order = await db.order.update({
    where: { id: body.orderId },
    data: { status: body.status },
  });
  return NextResponse.json({ order });
}
