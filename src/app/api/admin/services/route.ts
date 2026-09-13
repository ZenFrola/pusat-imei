import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user?.isAdmin) return null;
  return user;
}

// GET /api/admin/services — semua jasa (termasuk nonaktif)
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Akses admin diperlukan" }, { status: 403 });
  }
  const services = await db.service.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json({ services });
}

// POST /api/admin/services — tambah jasa baru
export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Akses admin diperlukan" }, { status: 403 });
  }
  const body = (await req.json()) as {
    name?: string;
    description?: string;
    price?: number;
    resellerPrice?: number;
  };
  if (!body.name?.trim() || !body.description?.trim()) {
    return NextResponse.json({ error: "Nama dan deskripsi wajib diisi" }, { status: 400 });
  }
  if (!body.price || body.price < 1000 || !body.resellerPrice || body.resellerPrice < 1000) {
    return NextResponse.json({ error: "Harga minimal Rp 1.000" }, { status: 400 });
  }
  if (body.resellerPrice > body.price) {
    return NextResponse.json({ error: "Harga reseller tidak boleh lebih mahal dari harga reguler" }, { status: 400 });
  }
  const maxSort = await db.service.aggregate({ _max: { sortOrder: true } });
  const service = await db.service.create({
    data: {
      name: body.name.trim(),
      description: body.description.trim(),
      price: Math.round(body.price),
      resellerPrice: Math.round(body.resellerPrice),
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
    },
  });
  return NextResponse.json({ service });
}

// PATCH /api/admin/services — edit jasa { id, ...fields }
export async function PATCH(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Akses admin diperlukan" }, { status: 403 });
  }
  const body = (await req.json()) as {
    id?: string;
    name?: string;
    description?: string;
    price?: number;
    resellerPrice?: number;
    active?: boolean;
  };
  if (!body.id) return NextResponse.json({ error: "id wajib" }, { status: 400 });

  const data: Record<string, string | number | boolean> = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if (body.description !== undefined) data.description = body.description.trim();
  if (body.price !== undefined) data.price = Math.round(body.price);
  if (body.resellerPrice !== undefined) data.resellerPrice = Math.round(body.resellerPrice);
  if (body.active !== undefined) data.active = body.active;

  const service = await db.service.update({ where: { id: body.id }, data });
  return NextResponse.json({ service });
}

// DELETE /api/admin/services?id=xxx — hapus jasa
export async function DELETE(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Akses admin diperlukan" }, { status: 403 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });

  const orderCount = await db.order.count({ where: { serviceId: id } });
  if (orderCount > 0) {
    // jangan hapus kalau masih ada order — nonaktifkan saja
    await db.service.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ ok: true, deactivated: true, message: "Jasa memiliki riwayat pesanan, jadi dinonaktifkan saja" });
  }
  await db.service.delete({ where: { id } });
  return NextResponse.json({ ok: true, deleted: true });
}
