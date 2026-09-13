"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth, formatRupiah } from "@/lib/store";
import type { ServiceItem } from "./order-dialog";
import { OrderDialog } from "./order-dialog";
import { Users, TrendingDown, BadgeCheck, Loader2 } from "lucide-react";

type Props = {
  onNeedAuth: (mode?: "login" | "register") => void;
};

export function ResellerView({ onNeedAuth }: Props) {
  const { user, becomeReseller } = useAuth();
  const [services, setServices] = useState<ServiceItem[] | null>(null);
  const [selected, setSelected] = useState<ServiceItem | null>(null);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then((d) => setServices(d.services))
      .catch(() => setServices([]));
  }, [user]);

  async function handleUpgrade() {
    setUpgrading(true);
    try {
      await becomeReseller();
    } finally {
      setUpgrading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Users className="h-6 w-6 text-emerald-600" />
            Program Reseller
          </CardTitle>
          <CardDescription className="text-base">
            Jual kembali layanan kami dengan harga khusus yang lebih murah dan atur keuntungan
            Anda sendiri.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-white/70 p-3 text-sm">
              <b className="block text-emerald-700">Harga Khusus</b>
              Semua layanan lebih murah dari harga reguler.
            </div>
            <div className="rounded-lg bg-white/70 p-3 text-sm">
              <b className="block text-emerald-700">Tanpa Minimal Order</b>
              Order 1 pun tetap dapat harga reseller.
            </div>
            <div className="rounded-lg bg-white/70 p-3 text-sm">
              <b className="block text-emerald-700">Proses Prioritas</b>
              Pesanan reseller diproses lebih dulu.
            </div>
          </div>

          {!user ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Daftar akun baru dengan mencentang <b>&quot;Daftar sebagai Reseller&quot;</b>, atau
                masuk jika sudah punya akun reseller.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => onNeedAuth("register")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Daftar sebagai Reseller
                </Button>
                <Button variant="outline" onClick={() => onNeedAuth("login")}>
                  Sudah Punya Akun
                </Button>
              </div>
            </div>
          ) : !user.isReseller ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Akun Anda saat ini statusnya pembeli reguler. Aktifkan status reseller untuk
                langsung menikmati harga khusus di seluruh layanan.
              </p>
              <Button
                onClick={handleUpgrade}
                disabled={upgrading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {upgrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                Aktifkan Status Reseller Saya
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-white/70 p-3 text-sm">
              <BadgeCheck className="h-5 w-5 text-emerald-600" />
              <span>
                Akun Anda <b>aktif sebagai reseller</b> — semua harga di bawah sudah menjadi harga
                khusus Anda.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingDown className="h-5 w-5 text-emerald-600" />
            Daftar Harga Reseller
          </CardTitle>
          <CardDescription>
            Perbandingan harga reguler vs harga reseller untuk 5 layanan kami.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Layanan</TableHead>
                  <TableHead className="text-right">Harga Reguler</TableHead>
                  <TableHead className="text-right">Harga Reseller</TableHead>
                  <TableHead className="text-right">Hemat</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(services ?? []).map((s) => {
                  const hemat = s.price - s.resellerPrice;
                  const persen = s.price > 0 ? Math.round((hemat / s.price) * 100) : 0;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-right text-muted-foreground line-through">
                        {formatRupiah(s.price)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-700">
                        {formatRupiah(s.resellerPrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">
                          -{persen}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          onClick={() => (user ? setSelected(s) : onNeedAuth("login"))}
                        >
                          Order
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!services && (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <OrderDialog
        service={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        onOrderComplete={() => {}}
      />
    </div>
  );
}
