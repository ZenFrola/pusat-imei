import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/qris — gambar QRIS publik untuk halaman pembayaran
export async function GET() {
  const setting = await db.setting.findUnique({ where: { id: "main" } });
  return NextResponse.json({ qrisImage: setting?.qrisImage || "" });
}
