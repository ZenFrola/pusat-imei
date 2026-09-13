"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth, formatRupiah } from "@/lib/store";
import type { ServiceItem } from "./order-dialog";
import { OrderDialog } from "./order-dialog";
import { ShoppingCart, Sparkles } from "lucide-react";

type Props = {
  limit?: number;
};

export function ServicesView({ limit }: Props) {
  const { user } = useAuth();
  const [services, setServices] = useState<ServiceItem[] | null>(null);
  const [selected, setSelected] = useState<ServiceItem | null>(null);

  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then((d) => setServices(d.services))
      .catch(() => setServices([]));
  }, [user]);

  async function handleOrder(s: ServiceItem) {
    setSelected(s);
  }

  const list = limit ? (services ?? []).slice(0, limit) : services ?? [];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list === null &&
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}

        {list.map((s) => (
          <Card
            key={s.id}
            className="group flex flex-col border-muted/60 transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base leading-snug">{s.name}</CardTitle>
                {user?.isReseller && (
                  <Badge className="shrink-0 bg-emerald-600 text-white">
                    <Sparkles className="mr-1 h-3 w-3" /> Reseller
                  </Badge>
                )}
              </div>
              <CardDescription className="text-sm leading-relaxed line-clamp-3">
                {s.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto space-y-3">
              <div>
                {user?.isReseller && s.resellerPrice < s.price && (
                  <span className="mr-2 text-sm text-muted-foreground line-through">
                    {formatRupiah(s.price)}
                  </span>
                )}
                <span className="text-xl font-bold text-emerald-700">
                  {formatRupiah(user?.isReseller ? s.resellerPrice : s.price)}
                </span>
              </div>
              <Button
                onClick={() => handleOrder(s)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <ShoppingCart className="h-4 w-4" />
                Order Sekarang
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <OrderDialog
        service={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        onOrderComplete={() => {}}
      />
    </>
  );
}
