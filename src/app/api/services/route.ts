import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, hasApprovedResellerAccess } from "@/lib/auth";

// GET /api/services — daftar jasa aktif (harga menyesuaikan status reseller)
export async function GET() {
  const user = await getSessionUser();
  const services = await db.service.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      price: s.price,
      resellerPrice: s.resellerPrice,
      activePrice: user && hasApprovedResellerAccess(user) ? s.resellerPrice : s.price,
      isReseller: !!user && hasApprovedResellerAccess(user),
    })),
  });
}
