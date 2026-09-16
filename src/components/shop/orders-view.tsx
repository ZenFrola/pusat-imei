"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "./status-badge";
import { PaymentDialog, type PendingOrder } from "./payment-dialog";
import { useAuth, formatRupiah } from "@/lib/store";
import { PackageSearch, QrCode, RefreshCw } from "lucide-react";

type MyOrder = {
  id: string;
  code: string;
  imei: string;
  waNumber: string;
  price: number;
  status: string;
  ceirResult?: { status: string; operator: string | null; result: string; processedAt: string } | null;
  isResellerOrder: boolean;
  createdAt: string;
  service: { name: string };
};

export function OrdersView() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<MyOrder[] | null>(null);
  const [payTarget, setPayTarget] = useState<PendingOrder | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (showSpin = false) => {
    if (showSpin) setRefreshing(true);
    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        const d = await res.json();
        setOrders(d.orders);
      }
    } finally {
      if (showSpin) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    // auto-refresh status tiap 10 detik agar perubahan dari bot Telegram terlihat
    timer.current = setInterval(() => load(), 10000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [user, load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Pesanan Saya</h2>
          <p className="text-sm text-muted-foreground">
            Status otomatis diperbarui setiap 10 detik setelah owner konfirmasi di bot.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Muat Ulang
        </Button>
      </div>

      {orders === null &&
        Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}

      {orders !== null && orders.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <PackageSearch className="h-12 w-12 text-muted-foreground" />
            <p className="font-medium">Belum ada pesanan</p>
            <p className="text-sm text-muted-foreground">
              Pilih salah satu jasa di menu Jasa untuk mulai memesan.
            </p>
          </CardContent>
        </Card>
      )}

      {(orders ?? []).map((o) => (
        <Card key={o.id}>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">
                {o.code} — {o.service.name}
              </CardTitle>
              <div className="flex items-center gap-2">
                {o.isResellerOrder && (
                  <Badge className="bg-emerald-600 text-white">Harga Reseller</Badge>
                )}
                <StatusBadge status={o.status} />
              </div>
            </div>
            <CardDescription>
              Dibuat {new Date(o.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 text-sm sm:grid-cols-3">
              <div className="rounded-lg bg-muted px-3 py-2">
                <span className="block text-xs text-muted-foreground">No IMEI</span>
                <b>{o.imei}</b>
              </div>
              <div className="rounded-lg bg-muted px-3 py-2">
                <span className="block text-xs text-muted-foreground">No WhatsApp</span>
                <b>{o.waNumber}</b>
              </div>
              <div className="rounded-lg bg-emerald-50 px-3 py-2 border border-emerald-200">
                <span className="block text-xs text-emerald-700">Total</span>
                <b className="text-emerald-700">{formatRupiah(o.price)}</b>
              </div>
            </div>

            {o.status === "MENUNGGU_PEMBAYARAN" && (
              <Button
                size="sm"
                onClick={() =>
                  setPayTarget({
                    id: o.id,
                    code: o.code,
                    imei: o.imei,
                    price: o.price,
                    serviceName: o.service.name,
                  })
                }
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <QrCode className="h-4 w-4" />
                Bayar Sekarang (QRIS)
              </Button>
            )}

            {o.status === "MENUNGGU_KONFIRMASI" && (
              <p className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">
                Pembayaran Anda sedang diverifikasi owner melalui bot Telegram. Halaman ini akan
                berubah otomatis setelah disetujui.
              </p>
            )}
            {o.status === "DIPROSES" && (
              <p className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-800">
                Pesanan sedang diproses tim kami. Mohon tunggu, hasil akan diinfokan ke WhatsApp
                Anda.
              </p>
            )}
            {o.status === "SELESAI" && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Pesanan selesai. Terima kasih telah order!
              </p>
            )}
            {o.ceirResult && (
              <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-3 text-sm text-sky-900">
                <b>Hasil CEIR: {o.ceirResult.status}</b>
                {o.ceirResult.operator && <p>Operator: {o.ceirResult.operator}</p>}
                <p className="mt-1 whitespace-pre-wrap">{o.ceirResult.result}</p>
              </div>
            )}
            {o.status === "DIBATALKAN" && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                Pesanan dibatalkan oleh owner. Hubungi kami jika Anda merasa ini keliru.
              </p>
            )}
          </CardContent>
        </Card>
      ))}

      <PaymentDialog
        order={payTarget}
        open={!!payTarget}
        onOpenChange={(v) => !v && setPayTarget(null)}
        onClaimed={() => load()}
      />
    </div>
  );
}
