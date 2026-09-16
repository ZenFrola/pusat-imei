import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user?.isAdmin) return null;
  return user;
}

// GET /api/admin/users — daftar semua user
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Akses admin diperlukan" }, { status: 403 });
  }
  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      isReseller: true,
      resellerStatus: true,
      isAdmin: true,
      isActive: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ users });
}

// PATCH /api/admin/users — ubah status user { userId, isReseller?, isAdmin?, isActive? }
export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Akses admin diperlukan" }, { status: 403 });
  }
  const body = (await req.json()) as {
    userId?: string;
    isReseller?: boolean;
    isAdmin?: boolean;
    isActive?: boolean;
  };
  if (!body.userId) return NextResponse.json({ error: "userId wajib" }, { status: 400 });
  if (body.userId === admin.id && body.isAdmin === false) {
    return NextResponse.json({ error: "Tidak bisa mencabut admin diri sendiri" }, { status: 400 });
  }
  if (body.userId === admin.id && body.isActive === false) {
    return NextResponse.json({ error: "Tidak bisa menonaktifkan akun sendiri" }, { status: 400 });
  }
  const data: { isReseller?: boolean; resellerStatus?: string; isAdmin?: boolean; isActive?: boolean } = {};
  if (body.isReseller !== undefined) {
    data.isReseller = body.isReseller;
    data.resellerStatus = body.isReseller ? "APPROVED" : "NONE";
  }
  if (body.isAdmin !== undefined) data.isAdmin = body.isAdmin;
  if (body.isActive !== undefined) data.isActive = body.isActive;

  const user = await db.user.update({
    where: { id: body.userId },
    data,
    select: { id: true, email: true, isReseller: true, resellerStatus: true, isAdmin: true, isActive: true },
  });
  return NextResponse.json({ user });
}

// DELETE /api/admin/users?id=... — hapus user tanpa order
export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Akses admin diperlukan" }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "userId wajib" }, { status: 400 });
  if (id === admin.id) return NextResponse.json({ error: "Tidak bisa menghapus akun sendiri" }, { status: 400 });
  const user = await db.user.findUnique({ where: { id }, select: { id: true, isAdmin: true, _count: { select: { orders: true } } } });
  if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
  if (user.isAdmin) return NextResponse.json({ error: "Akun admin tidak dapat dihapus" }, { status: 400 });
  if (user._count.orders > 0) return NextResponse.json({ error: "User memiliki riwayat order. Nonaktifkan akun saja agar riwayat tetap tersimpan." }, { status: 409 });
  await db.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
