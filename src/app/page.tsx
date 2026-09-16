"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/store";
import { AuthDialog } from "@/components/shop/auth-dialog";
import { ServicesView } from "@/components/shop/services-view";
import { ResellerView } from "@/components/shop/reseller-view";
import { OrdersView } from "@/components/shop/orders-view";
import { AdminOrders, AdminServices, AdminUsers } from "@/components/shop/admin-manage";
import { AdminBotSettings } from "@/components/shop/admin-bot";
import {
  Home,
  Wrench,
  Users,
  Package,
  ShieldCheck,
  LogOut,
  LogIn,
  Zap,
  Smartphone,
  Clock,
  ShieldCheck as ShieldIcon,
  Loader2,
  MessageCircle,
} from "lucide-react";

type Tab = "home" | "jasa" | "reseller" | "orders" | "admin";

const NAV: { key: Tab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
  { key: "home", label: "Beranda", icon: <Home className="h-4 w-4" /> },
  { key: "jasa", label: "Jasa", icon: <Wrench className="h-4 w-4" /> },
  { key: "reseller", label: "Reseller", icon: <Users className="h-4 w-4" /> },
  { key: "orders", label: "Pesanan", icon: <Package className="h-4 w-4" /> },
  { key: "admin", label: "Admin", icon: <ShieldCheck className="h-4 w-4" />, adminOnly: true },
];

export default function Page() {
  const { user, loading, fetchMe, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("home");
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [adminSub, setAdminSub] = useState<"orders" | "services" | "users" | "bot">("orders");

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  function needAuth(mode: "login" | "register" = "login") {
    setAuthMode(mode);
    setAuthOpen(true);
  }

  const visibleNav = NAV.filter((n) => !n.adminOnly || user?.isAdmin);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-emerald-50/60 via-background to-background">
      {/* ===== Header ===== */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <button
            onClick={() => setTab("home")}
            className="flex items-center gap-2 font-bold text-lg tracking-tight"
            aria-label="Pusat IMEI - ke beranda"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Smartphone className="h-5 w-5" />
            </span>
            <span>
              Pusat <span className="text-emerald-600">IMEI</span>
            </span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Navigasi utama">
            {visibleNav.map((n) => (
              <button
                key={n.key}
                onClick={() => setTab(n.key)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === n.key
                    ? "bg-emerald-100 text-emerald-800"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {n.icon}
                {n.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : user ? (
              <>
                <span className="hidden text-sm text-muted-foreground sm:inline">
                  {user.email}
                  {user.isReseller && (
                    <Badge className="ml-2 bg-emerald-600 text-white">Reseller</Badge>
                  )}
                </span>
                <Button variant="outline" size="sm" onClick={() => logout()}>
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Keluar</span>
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={() => needAuth("login")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <LogIn className="h-4 w-4" />
                Masuk / Daftar
              </Button>
            )}
          </div>
        </div>

        {/* Mobile nav */}
        <nav
          className="flex overflow-x-auto border-t px-2 py-1.5 md:hidden"
          aria-label="Navigasi mobile"
        >
          {visibleNav.map((n) => (
            <button
              key={n.key}
              onClick={() => setTab(n.key)}
              className={`flex min-w-[72px] flex-col items-center gap-0.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                tab === n.key ? "bg-emerald-100 text-emerald-800" : "text-muted-foreground"
              }`}
            >
              {n.icon}
              {n.label}
            </button>
          ))}
        </nav>
      </header>

      {/* ===== Main ===== */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {tab === "home" && (
          <div className="space-y-10">
            {/* Hero */}
            <section className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 px-6 py-12 text-white sm:px-10 sm:py-16">
              <div className="relative z-10 max-w-2xl space-y-4">
                <Badge className="bg-white/20 text-white hover:bg-white/30">
                  Pembayaran QRIS &bull; Proses Cepat
                </Badge>
                <h1 className="text-3xl font-bold leading-tight sm:text-5xl">
                  Layanan IMEI iPhone, Cepat dan Transparan
                </h1>
                <p className="text-base text-emerald-50 sm:text-lg">
                  Pesan layanan, lakukan pembayaran via QRIS, dan pantau status pesanan Anda dengan
                  mudah.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    size="lg"
                    onClick={() => setTab("jasa")}
                    className="bg-white text-emerald-700 hover:bg-emerald-50"
                  >
                    <Wrench className="h-5 w-5" />
                    Lihat Semua Jasa
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => setTab("reseller")}
                    className="border-white/50 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  >
                    <Users className="h-5 w-5" />
                    Jadi Reseller
                  </Button>
                </div>
              </div>
              <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-24 right-24 h-72 w-72 rounded-full bg-teal-300/20 blur-2xl" />
            </section>

            {/* Keunggulan */}
            <section className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: <Zap className="h-6 w-6 text-emerald-600" />,
                  title: "Proses Kilat",
                  desc: "Sebagian layanan selesai dalam hitungan menit setelah pembayaran dikonfirmasi owner.",
                },
                {
                  icon: <ShieldIcon className="h-6 w-6 text-emerald-600" />,
                  title: "Aman & Bergaransi",
                  desc: "Data IMEI hanya dipakai untuk proses layanan. Jika gagal, dana dikembalikan penuh.",
                },
                {
                  icon: <Clock className="h-6 w-6 text-emerald-600" />,
                  title: "Status Real-time",
                  desc: "Pantau progres pesanan langsung di menu Pesanan — otomatis terupdate saat owner konfirmasi.",
                },
              ].map((f) => (
                <div key={f.title} className="rounded-xl border bg-card p-5 shadow-sm">
                  {f.icon}
                  <h3 className="mt-2 font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </section>

            {/* Jasa terpopuler (3) */}
            <section className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Jasa Terpopuler</h2>
                  <p className="text-sm text-muted-foreground">
                    Pilihan layanan andalan kami minggu ini.
                  </p>
                </div>
                <Button variant="ghost" onClick={() => setTab("jasa")} className="text-emerald-700">
                  Lihat semua →
                </Button>
              </div>
              <ServicesView limit={3} />
            </section>

            {/* Cara order */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold">Cara Order</h2>
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  { n: 1, t: "Daftar / Masuk", d: "Registrasi pakai email & password. Centang reseller bila perlu harga khusus." },
                  { n: 2, t: "Isi IMEI & No WA", d: "Pilih jasa, isi nomor IMEI perangkat dan nomor WhatsApp aktif." },
                  { n: 3, t: "Bayar via QRIS", d: "Scan QRIS, lalu klik tombol \"Saya Sudah Melakukan Pembayaran\"." },
                  { n: 4, t: "Owner Konfirmasi", d: "Owner tekan YES di bot Telegram, status pesanan berubah otomatis." },
                ].map((s) => (
                  <div key={s.n} className="relative rounded-xl border bg-card p-4 pt-6 shadow-sm">
                    <span className="absolute -top-3 left-4 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                      {s.n}
                    </span>
                    <h3 className="font-semibold">{s.t}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <h2 className="text-2xl font-bold text-amber-950">Syarat Proses IMEI</h2>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-950">
                <li>Nomor Modem / BB tersedia.</li>
                <li>Unit Sim lock wajib ada Rsim dan setting pribadi.</li>
                <li>Wajib IMEI original, bukan IMEI suntik.</li>
                <li>HP benar kasus blokir, bukan hardware, ex kemen, atau ex bypass.</li>
              </ul>
              <details className="mt-4 rounded-lg border border-amber-200 bg-white/60 p-3">
                <summary className="cursor-pointer font-semibold text-amber-950">Ketentuan Garansi IMEI</summary>
                <div className="mt-2 space-y-2 text-sm text-amber-950">
                  <p><b>Repeat:</b> proses ulang gratis oleh server jika status done tetapi HP belum naik jaringan, dalam interval 24 jam.</p>
                  <p><b>Claim:</b> garansi gratis jika signal tiba-tiba hilang selama masa garansi berlaku.</p>
                  <p>Jika Repeat dan Claim sudah dilakukan namun tetap gagal, server mengembalikan dana tanpa potongan.</p>
                  <p><b>Refund tidak berlaku untuk:</b> salah input IMEI, SIM lock/MCK, nomor modem null, hardware, double input, atau masa interval kedaluwarsa.</p>
                </div>
              </details>
            </section>
          </div>
        )}

        {tab === "jasa" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold">Semua Jasa</h2>
              <p className="text-sm text-muted-foreground">
                5 layanan unggulan — klik Order untuk mulai. Harga otomatis menyesuaikan untuk
                reseller.
              </p>
            </div>
            <ServicesView />
          </div>
        )}

        {tab === "reseller" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold">Khusus Reseller</h2>
              <p className="text-sm text-muted-foreground">
                Harga lebih murah untuk semua layanan — cocok untuk dijual kembali.
              </p>
            </div>
            <ResellerView onNeedAuth={(m) => needAuth(m ?? "login")} />
          </div>
        )}

        {tab === "orders" && <OrdersView />}

        {tab === "admin" && user?.isAdmin && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold">Panel Admin</h2>
              <p className="text-sm text-muted-foreground">
                Kelola pesanan, jasa, pengguna, dan bot Telegram.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { k: "orders", t: "Pesanan" },
                  { k: "services", t: "Kelola Jasa" },
                  { k: "users", t: "Pengguna" },
                  { k: "bot", t: "Bot & QRIS" },
                ] as const
              ).map((s) => (
                <button
                  key={s.k}
                  onClick={() => setAdminSub(s.k)}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    adminSub === s.k
                      ? "bg-emerald-600 text-white"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s.t}
                </button>
              ))}
            </div>
            {adminSub === "orders" && <AdminOrders />}
            {adminSub === "services" && <AdminServices />}
            {adminSub === "users" && <AdminUsers />}
            {adminSub === "bot" && <AdminBotSettings />}
          </div>
        )}
      </main>

      {/* ===== Footer ===== */}
      <footer className="mt-auto border-t bg-background">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Pusat IMEI — Layanan IMEI Profesional.</p>
          <p>
            Pembayaran QRIS &bull; Konfirmasi otomatis via Bot Telegram
          </p>
        </div>
      </footer>

      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        initialMode={authMode}
        onSuccess={() => setTab("reseller")}
      />
      {process.env.NEXT_PUBLIC_WHATSAPP_OWNER_NUMBER && (
        <a
          href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_OWNER_NUMBER.replace(/\D/g, "")}?text=Halo%20saya%20butuh%20bantuan%20Pusat%20IMEI`}
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-green-600 px-4 py-3 font-semibold text-white shadow-lg transition hover:bg-green-700"
          aria-label="Hubungi owner melalui WhatsApp"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="hidden sm:inline">Bantuan</span>
        </a>
      )}
    </div>
  );
}
