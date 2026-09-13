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
import { formatRupiah } from "@/lib/store";
import { Loader2, QrCode, ShieldCheck, CircleCheck } from "lucide-react";

export type PendingOrder = {
  id: string;
  code: string;
  imei: string;
  price: number;
  serviceName: string;
};

type Props = {
  order: PendingOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClaimed: () => void;
};

/** Dialog QRIS + tombol klaim pembayaran untuk pesanan yang masih menunggu pembayaran */
export function PaymentDialog({ order, open, onOpenChange, onClaimed }: Props) {
  const [qris, setQris] = useState("");
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      fetch("/api/qris")
        .then((r) => r.json())
        .then((d) => setQris(d.qrisImage || ""))
        .catch(() => setQris(""));
      setClaimed(false);
      setError("");
    }
  }, [open]);

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
      onClaimed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setClaimBusy(false);
    }
  }

  if (claimed) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CircleCheck className="h-9 w-9 text-emerald-600" />
            </div>
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-xl">Klaim Terkirim!</DialogTitle>
              <DialogDescription>
                Menunggu owner menekan YES di bot Telegram untuk pesanan <b>{order?.code}</b>.
              </DialogDescription>
            </DialogHeader>
            <Button onClick={() => onOpenChange(false)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-emerald-600" />
            Pembayaran QRIS — {order?.code}
          </DialogTitle>
          <DialogDescription>
            {order?.serviceName} &bull; Total <b>{formatRupiah(order?.price ?? 0)}</b>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-center rounded-xl border bg-white p-3">
            <img
              src={qris || "/qris-placeholder.png"}
              alt="Kode QRIS pembayaran"
              className="h-64 w-auto rounded-lg object-contain"
            />
          </div>
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
            {claimBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
            Saya Sudah Melakukan Pembayaran
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
