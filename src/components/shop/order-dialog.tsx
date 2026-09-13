"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth, formatRupiah } from "@/lib/store";
import { Loader2, QrCode, ShieldCheck, CircleCheck, ClipboardList } from "lucide-react";

export type ServiceItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  resellerPrice: number;
  activePrice: number;
  isReseller: boolean;
};

type OrderResult = {
  id: string;
  code: string;
  imei: string;
  waNumber: string;
  price: number;
};

type Props = {
  service: ServiceItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderComplete: () => void;
};

export function OrderDialog({ service, open, onOpenChange, onOrderComplete }: Props) {
  const { user } = useAuth();
  const [imei, setImei] = useState("");
  const [wa, setWa] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<OrderResult | null>(null);
  const [qris, setQris] = useState<string>("");
  const [claimed, setClaimed] = useState(false);
  const [claimBusy, setClaimBusy] = useState(false);

  // ambil gambar QRIS saat dialog pembayaran terbuka
  useEffect(() => {
    if (open) {
      fetch("/api/qris")
        .then((r) => r.json())
        .then((d) => setQris(d.qrisImage || ""))
        .catch(() => setQris(""));
    }
  }, [open]);

  // reset saat service berubah / dialog ditutup
  useEffect(() => {
    if (!open) {
      setImei("");
      setWa("");
      setError("");
      setOrder(null);
      setClaimed(false);
    }
  }, [open, service]);

  async function submitOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!service) return;
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: service.id, imei, waNumber: wa }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat pesanan");
      setOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setBusy(false);
    }
  }

  async function claimPaid() {
    if (!order) return;
    setClaimBusy(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal klaim pembayaran");
      setClaimed(true);
      onOrderComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setClaimBusy(false);
    }
  }

  // ---------- Tampilan 3: klaim terkirim ----------
  if (claimed && order) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CircleCheck className="h-9 w-9 text-emerald-600" />
            </div>
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-xl">Klaim Pembayaran Terkirim!</DialogTitle>
              <DialogDescription>
                Pesanan <b>{order.code}</b> sedang menunggu konfirmasi owner melalui bot Telegram.
                Status akan berubah menjadi <b>&quot;Sedang Diproses&quot;</b> setelah owner
                menekan YES.
              </DialogDescription>
            </DialogHeader>
            <div className="w-full rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              Pantau progres di menu <b>Pesanan Saya</b>. Kami juga akan menghubungi WhatsApp
              Anda bila diperlukan.
            </div>
            <Button
              onClick={() => onOpenChange(false)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Selesai
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ---------- Tampilan 2: QRIS pembayaran ----------
  if (order) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-emerald-600" />
              Pembayaran QRIS
            </DialogTitle>
            <DialogDescription>
              Pesanan <b>{order.code}</b> berhasil dibuat. Scan QRIS di bawah lalu klik tombol
              konfirmasi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
              <div className="flex justify-between py-0.5">
                <span className="text-emerald-700">Layanan</span>
                <b>{service?.name}</b>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-emerald-700">Total Bayar</span>
                <b className="text-emerald-700">{formatRupiah(order.price)}</b>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-emerald-700">IMEI</span>
                <b>{order.imei}</b>
              </div>
            </div>

            <div className="flex justify-center rounded-xl border bg-white p-3">
              <img
                src={qris || "/qris-placeholder.png"}
                alt="Kode QRIS pembayaran"
                className="h-64 w-auto rounded-lg object-contain"
              />
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Satu kali scan &rarr; masukkan nominal{" "}
              <b className="text-foreground">{formatRupiah(order.price)}</b> &rarr; selesaikan
              pembayaran di aplikasi e-wallet / m-banking Anda.
            </p>

            {error && (
              <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 border border-rose-200">
                {error}
              </p>
            )}

            <Button
              onClick={claimPaid}
              disabled={claimBusy}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-base"
            >
              {claimBusy ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ShieldCheck className="h-5 w-5" />
              )}
              Saya Sudah Melakukan Pembayaran
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Setelah diklik, data pesanan otomatis dikirim ke bot Telegram owner untuk
              dikonfirmasi.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ---------- Tampilan 1: form order ----------
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-emerald-600" />
            Form Pesanan
          </DialogTitle>
          <DialogDescription>
            Isi data perangkat Anda untuk layanan <b>{service?.name}</b>
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center justify-between">
          <span className="text-sm text-emerald-700">Harga {service?.isReseller ? "Reseller" : "Reguler"}</span>
          <b className="text-lg text-emerald-700">{formatRupiah(service?.activePrice ?? 0)}</b>
        </div>

        <form onSubmit={submitOrder} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="imei">No IMEI</Label>
            <Input
              id="imei"
              inputMode="numeric"
              placeholder="Contoh: 356789102345678"
              value={imei}
              onChange={(e) => setImei(e.target.value.replace(/[^\d]/g, ""))}
              required
            />
            <p className="text-xs text-muted-foreground">
              Ambil dengan menekan *#06# di dial pad HP Anda (10-20 digit).
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wa">No WhatsApp Aktif</Label>
            <Input
              id="wa"
              inputMode="tel"
              placeholder="Contoh: 081234567890"
              value={wa}
              onChange={(e) => setWa(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Digunakan owner untuk menghubungi Anda saat pesanan diproses.
            </p>
          </div>

          {error && (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 border border-rose-200">
              {error}
            </p>
          )}

          <Separator />
          <Button
            type="submit"
            disabled={busy}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-base"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            Lanjut ke Pembayaran QRIS
          </Button>
          {!user && (
            <p className="text-center text-xs text-muted-foreground">
              Tidak perlu login untuk customer biasa. Pesanan ini akan tersimpan di browser ini.
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
