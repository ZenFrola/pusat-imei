# Worklog

---
Task ID: 1
Agent: Super Z (main)
Task: Membangun website jasa (5 jasa) dengan halaman reseller, registrasi email/password, order IMEI + No WA, pembayaran QRIS (gambar), klaim "sudah bayar", notifikasi ke bot Telegram, dan konfirmasi YES owner untuk update status di website.

Work Log:
- Inisialisasi environment fullstack (init script CDN)
- Desain skema Prisma: User (email, password hash, isReseller, isAdmin), Service (harga reguler + reseller), Order (kode unik, IMEI, No WA, status), Setting (bot token, chat id, QRIS base64, offset polling) → db:push
- Seed: 5 jasa (Bypass iCloud 150k/100k, Unlock SIM 75k/50k, Flash Android 100k/70k, Remove FRP 60k/40k, Cek Info iPhone 25k/15k), admin@jasaku.id/admin123, reseller@jasaku.id/reseller123
- Generate QRIS placeholder (scripts/gen_qris.py) di public/qris-placeholder.png
- Auth custom: scrypt hash + session HMAC httpOnly cookie (src/lib/auth.ts)
- API routes: /api/auth (register/login/logout/become_reseller), /api/services, /api/orders (GET/POST/PATCH klaim bayar), /api/admin/orders|services|users|settings|telegram, /api/telegram/webhook, /api/qris
- Telegram (src/lib/telegram.ts): kirim notifikasi pesanan dengan inline keyboard YES(Diproses)/NO(Batal)/SELESAI; proses callback_query (webhook + polling getUpdates); edit pesan status
- UI single-page (SPA tab): Beranda (hero, keunggulan, 3 jasa populer, cara order), Jasa (5 kartu), Reseller (tabel harga + aktivasi), Pesanan Saya (auto-refresh 10s), Panel Admin (Pesanan/Kelola Jasa/Pengguna/Bot & QRIS)
- Alur: order → form IMEI+WA → QRIS + total → klik "Saya Sudah Melakukan Pembayaran" → status MENUNGGU_KONFIRMASI → notif Telegram → owner YES → DIPROSES → SELESAI/DIBATALKAN
- Fix lint: setState-in-effect (AdminUsers pakai setTimeout), hapus directive img tak terpakai
- Verifikasi agent-browser end-to-end: registrasi, aktivasi reseller, order reseller (harga 100k benar), QRIS, klaim, status berubah ke Sedang Diproses dari panel admin terlihat di sisi pembeli, kelola jasa, pengguna, bot & QRIS, mobile 390px responsive, footer sticky, tanpa error console/server

Stage Summary:
- Deliverable: website Next.js 16 full-stack berjalan di port 3000, DB SQLite (db/custom.db via prisma)
- Akun: admin@jasaku.id / admin123 (admin+reseller), reseller@jasaku.id / reseller123, pembeli@test.com / test123 (data uji)
- Telegram belum aktif sampai owner isi Bot Token + Chat ID + QRIS asli di Panel Admin > Bot & QRIS
- Konfirmasi via tombol YES bot (webhook publik atau tombol Sinkron Polling) atau dropdown manual di Panel Admin
