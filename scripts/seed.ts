/**
 * Seed database: 5 jasa + akun admin + setting awal
 * Jalankan: bun /home/z/my-project/scripts/seed.ts
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";

const db = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const SERVICES = [
  {
    name: "Bypass iCloud iPhone",
    description:
      "Lepas akun iCloud aktivasiPhone 5s - X, proses 1-3 hari kerja. Cukup kirim IMEI, perangkat harus tidak hilang/baru reset.",
    price: 150000,
    resellerPrice: 100000,
    sortOrder: 1,
  },
  {
    name: "Unlock SIM iPhone (MEID/GSX)",
    description:
      "Buka kunci operator carrier iPhone dari luar negeri, support semua operator. Proses 1-2 hari kerja.",
    price: 75000,
    resellerPrice: 50000,
    sortOrder: 2,
  },
  {
    name: "Flash Software Android",
    description:
      "Install ulang OS Android (bootloop, mati total, hang logo). Support Xiaomi, Samsung, Oppo, Vivo, Realme.",
    price: 100000,
    resellerPrice: 70000,
    sortOrder: 3,
  },
  {
    name: "Remove FRP Google Android",
    description:
      "Hapus verifikasi akun Google setelah hard reset. Tanpa perlu kirim perangkat, remote via IMEI untuk sebagian tipe.",
    price: 60000,
    resellerPrice: 40000,
    sortOrder: 4,
  },
  {
    name: "Cek Info iPhone by IMEI",
    description:
      "Cek lengkap status iPhone: garansi, carrier, Find My iPhone, blacklist, model, dan aktivasi. Hasil 5-30 menit.",
    price: 25000,
    resellerPrice: 15000,
    sortOrder: 5,
  },
];

async function main() {
  console.log("Seeding mulai...");

  // Akun admin
  const adminEmail = "admin@jasaku.id";
  const existingAdmin = await db.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await db.user.create({
      data: {
        email: adminEmail,
        password: hashPassword("admin123"),
        isAdmin: true,
        isReseller: true,
      },
    });
    console.log(`Admin dibuat: ${adminEmail} / admin123`);
  } else {
    console.log("Admin sudah ada, lewati");
  }

  // Akun reseller demo
  const resellerEmail = "reseller@jasaku.id";
  const existingReseller = await db.user.findUnique({ where: { email: resellerEmail } });
  if (!existingReseller) {
    await db.user.create({
      data: {
        email: resellerEmail,
        password: hashPassword("reseller123"),
        isReseller: true,
      },
    });
    console.log(`Reseller demo dibuat: ${resellerEmail} / reseller123`);
  }

  // 5 jasa
  const count = await db.service.count();
  if (count === 0) {
    for (const s of SERVICES) {
      await db.service.create({ data: s });
    }
    console.log(`${SERVICES.length} jasa dibuat`);
  } else {
    console.log(`Sudah ada ${count} jasa, lewati seed jasa`);
  }

  // Setting awal
  const setting = await db.setting.findUnique({ where: { id: "main" } });
  if (!setting) {
    await db.setting.create({ data: { id: "main" } });
    console.log("Setting awal dibuat");
  }

  console.log("Seeding selesai!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
