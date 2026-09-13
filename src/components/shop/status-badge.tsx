"use client";

import { Badge } from "@/components/ui/badge";

export const STATUS_LABEL: Record<string, string> = {
  MENUNGGU_PEMBAYARAN: "Menunggu Pembayaran",
  MENUNGGU_KONFIRMASI: "Menunggu Konfirmasi",
  DIPROSES: "Sedang Diproses",
  SELESAI: "Selesai",
  DIBATALKAN: "Dibatalkan",
};

const STATUS_STYLE: Record<string, string> = {
  MENUNGGU_PEMBAYARAN: "bg-amber-100 text-amber-800 border-amber-300",
  MENUNGGU_KONFIRMASI: "bg-orange-100 text-orange-800 border-orange-300",
  DIPROSES: "bg-violet-100 text-violet-800 border-violet-300",
  SELESAI: "bg-emerald-100 text-emerald-800 border-emerald-300",
  DIBATALKAN: "bg-rose-100 text-rose-800 border-rose-300",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={STATUS_STYLE[status] ?? "bg-muted text-muted-foreground"}>
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}
