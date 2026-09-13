import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user?.isAdmin) return null;
  return user;
}

// GET /api/admin/settings — pengaturan (token disamarkan sebagian)
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Akses admin diperlukan" }, { status: 403 });
  }
  const setting = await db.setting.findUnique({ where: { id: "main" } });
  return NextResponse.json({
    setting: {
      telegramBotToken: setting?.telegramBotToken
        ? setting.telegramBotToken.slice(0, 8) + "..." + setting.telegramBotToken.slice(-4)
        : "",
      hasBotToken: !!setting?.telegramBotToken,
      telegramChatId: setting?.telegramChatId || "",
      hasQris: !!setting?.qrisImage,
      qrisImage: setting?.qrisImage || "",
    },
  });
}

// PUT /api/admin/settings — simpan pengaturan
export async function PUT(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Akses admin diperlukan" }, { status: 403 });
  }
  const body = (await req.json()) as {
    telegramBotToken?: string;
    telegramChatId?: string;
    qrisImage?: string | null;
  };

  const data: Record<string, string> = {};
  if (body.telegramBotToken !== undefined && body.telegramBotToken.trim() !== "") {
    data.telegramBotToken = body.telegramBotToken.trim();
  }
  if (body.telegramChatId !== undefined && body.telegramChatId.trim() !== "") {
    data.telegramChatId = body.telegramChatId.trim();
  }
  if (body.qrisImage !== undefined) {
    if (body.qrisImage === null || body.qrisImage === "") {
      data.qrisImage = "";
    } else if (body.qrisImage.length > 3_000_000) {
      return NextResponse.json({ error: "Ukuran gambar QRIS terlalu besar (maks ~2MB)" }, { status: 400 });
    } else {
      data.qrisImage = body.qrisImage;
    }
  }

  await db.setting.upsert({
    where: { id: "main" },
    update: data,
    create: { id: "main", ...data },
  });
  return NextResponse.json({ ok: true });
}
