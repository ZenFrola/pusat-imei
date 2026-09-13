import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword, setSessionCookie, clearSessionCookie, getSessionUser } from "@/lib/auth";

// POST /api/auth — aksi: register | login | logout
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      action?: string;
      email?: string;
      password?: string;
      asReseller?: boolean;
    };
    const action = body.action;

    if (action === "register") {
      const email = (body.email || "").trim().toLowerCase();
      const password = body.password || "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 });
      }
      if (password.length < 6) {
        return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
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
          isReseller: !!body.asReseller,
          isAdmin: isFirstUser,
        },
      });
      await setSessionCookie(user.id);
      return NextResponse.json({
        user: { id: user.id, email: user.email, isReseller: user.isReseller, isAdmin: user.isAdmin },
      });
    }

    if (action === "login") {
      const email = (body.email || "").trim().toLowerCase();
      const password = body.password || "";
      const user = await db.user.findUnique({ where: { email } });
      if (!user || !verifyPassword(password, user.password)) {
        return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
      }
      await setSessionCookie(user.id);
      return NextResponse.json({
        user: { id: user.id, email: user.email, isReseller: user.isReseller, isAdmin: user.isAdmin },
      });
    }

    if (action === "become_reseller") {
      const current = await getSessionUser();
      if (!current) return NextResponse.json({ error: "Harus login dulu" }, { status: 401 });
      const user = await db.user.update({
        where: { id: current.id },
        data: { isReseller: true },
      });
      return NextResponse.json({
        user: { id: user.id, email: user.email, isReseller: user.isReseller, isAdmin: user.isAdmin },
      });
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
