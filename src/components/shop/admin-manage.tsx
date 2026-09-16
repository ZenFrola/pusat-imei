"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatRupiah } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge, STATUS_LABEL } from "./status-badge";
import { Loader2, Plus, Pencil, Trash2, RefreshCw } from "lucide-react";

export function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [busyId, setBusyId] = useState("");
  const [imeiSearch, setImeiSearch] = useState("");

  type AdminOrder = {
    id: string;
    code: string;
    imei: string;
    waNumber: string;
    price: number;
    status: string;
    isResellerOrder: boolean;
    createdAt: string;
    service: { name: string };
    user: { email: string } | null;
  };

  const load = useCallback(async () => {
    const query = imeiSearch.trim() ? `?imei=${encodeURIComponent(imeiSearch.trim())}` : "";
    const res = await fetch(`/api/admin/orders${query}`);
    if (res.ok) {
      const d = await res.json();
      setOrders(d.orders);
    }
  }, [imeiSearch]);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  async function changeStatus(orderId: string, status: string) {
    setBusyId(orderId);
    try {
      await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status }),
      });
      await load();
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Riwayat semua order tersimpan di sini. Klik YES di bot Telegram <b>atau</b> ubah status manual.
        </p>
        <div className="flex gap-2">
          <Input className="h-9 w-52" placeholder="Cari IMEI..." value={imeiSearch} onChange={(e) => setImeiSearch(e.target.value)} />
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /> Muat</Button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Kode</TableHead>
              <TableHead>Layanan</TableHead>
              <TableHead>IMEI</TableHead>
              <TableHead>No WA</TableHead>
              <TableHead>Harga</TableHead>
              <TableHead>Pembeli</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead className="text-right">Ubah Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders === null &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={9}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {orders !== null && orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  Belum ada pesanan masuk.
                </TableCell>
              </TableRow>
            )}
            {(orders ?? []).map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{o.code}</TableCell>
                <TableCell>{o.service.name}</TableCell>
                <TableCell className="font-mono text-xs">{o.imei}</TableCell>
                <TableCell>{o.waNumber}</TableCell>
                <TableCell>
                  {formatRupiah(o.price)}{" "}
                  {o.isResellerOrder && (
                    <Badge className="ml-1 bg-emerald-600 text-white">R</Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs">{o.user?.email ?? "Customer tanpa akun"}</TableCell>
                <TableCell>
                  <StatusBadge status={o.status} />
                </TableCell>
                <TableCell>{new Date(o.createdAt).toLocaleString("id-ID")}</TableCell>
                <TableCell className="text-right">
                  {busyId === o.id ? (
                    <Loader2 className="ml-auto h-4 w-4 animate-spin" />
                  ) : (
                    <Select value={o.status} onValueChange={(v) => changeStatus(o.id, v)}>
                      <SelectTrigger className="h-8 w-[190px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABEL).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

type AdminService = {
  id: string;
  name: string;
  description: string;
  price: number;
  resellerPrice: number;
  serviceType: "UNBLOCK_IMEI" | "CEIR_CHECK";
  active: boolean;
};

const EMPTY_FORM = {
  name: "",
  description: "",
  price: "",
  resellerPrice: "",
  serviceType: "UNBLOCK_IMEI" as "UNBLOCK_IMEI" | "CEIR_CHECK",
};

export function AdminServices() {
  const [services, setServices] = useState<AdminService[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminService | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/services");
    if (res.ok) {
      const d = await res.json();
      setServices(d.services);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setDialogOpen(true);
  }

  function openEdit(s: AdminService) {
    setEditing(s);
    setForm({
      name: s.name,
      description: s.description,
      price: String(s.price),
      resellerPrice: String(s.resellerPrice),
      serviceType: s.serviceType,
    });
    setError("");
    setDialogOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = {
        id: editing?.id,
        name: form.name,
        description: form.description,
        price: Number(form.price),
        resellerPrice: Number(form.resellerPrice),
        serviceType: form.serviceType,
      };
      const res = await fetch("/api/admin/services", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Gagal menyimpan");
      setDialogOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(s: AdminService) {
    await fetch("/api/admin/services", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: s.id, active: !s.active }),
    });
    await load();
  }

  async function remove(s: AdminService) {
    if (!confirm(`Hapus jasa "${s.name}"?`)) return;
    const res = await fetch(`/api/admin/services?id=${s.id}`, { method: "DELETE" });
    const d = await res.json();
    if (d.message) alert(d.message);
    await load();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Kelola 5 jasa utama: nama, harga, dan status aktif.</p>
        <Button size="sm" onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4" /> Tambah Jasa
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Nama</TableHead>
              <TableHead>Harga Reguler</TableHead>
              <TableHead>Harga Reseller</TableHead>
              <TableHead>Aktif</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services === null &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {(services ?? []).map((s) => (
              <TableRow key={s.id}>
                <TableCell className="max-w-[260px]">
                  <b className="block truncate">{s.name}</b>
                  <span className="block truncate text-xs text-muted-foreground">{s.description}</span>
                </TableCell>
                <TableCell>{formatRupiah(s.price)}</TableCell>
                <TableCell className="text-emerald-700">{formatRupiah(s.resellerPrice)}</TableCell>
                <TableCell>
                  <Switch checked={s.active} onCheckedChange={() => toggleActive(s)} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(s)} aria-label="Edit jasa">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => remove(s)}
                      className="text-rose-600 hover:bg-rose-50"
                      aria-label="Hapus jasa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Jasa" : "Tambah Jasa Baru"}</DialogTitle>
            <DialogDescription>
              Harga reseller harus lebih murah atau sama dengan harga reguler.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="svc-name">Nama Jasa</Label>
              <Input
                id="svc-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-desc">Deskripsi</Label>
              <Input
                id="svc-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="svc-price">Harga Reguler (Rp)</Label>
                <Input
                  id="svc-price"
                  inputMode="numeric"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value.replace(/\D/g, "") })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="svc-rprice">Harga Reseller (Rp)</Label>
                <Input
                  id="svc-rprice"
                  inputMode="numeric"
                  value={form.resellerPrice}
                  onChange={(e) => setForm({ ...form, resellerPrice: e.target.value.replace(/\D/g, "") })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-type">Tipe Layanan</Label>
              <Select value={form.serviceType} onValueChange={(v) => setForm({ ...form, serviceType: v as "UNBLOCK_IMEI" | "CEIR_CHECK" })}>
                <SelectTrigger id="svc-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNBLOCK_IMEI">Unblock IMEI</SelectItem>
                  <SelectItem value="CEIR_CHECK">Cek CEIR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && (
              <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 border border-rose-200">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  isReseller: boolean;
  resellerStatus: string;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  _count: { orders: number };
};

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const d = await res.json();
      setUsers(d.users);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  async function patch(userId: string, data: Record<string, boolean>) {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...data }),
    });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error || "Gagal memperbarui user");
    }
    await load();
  }

  async function remove(user: AdminUser) {
    if (!confirm(`Hapus user ${user.email}? Penghapusan hanya bisa dilakukan jika belum memiliki order.`)) return;
    const res = await fetch(`/api/admin/users?id=${user.id}`, { method: "DELETE" });
    const d = await res.json();
    if (!res.ok) alert(d.error || "Gagal menghapus user");
    await load();
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Email</TableHead>
            <TableHead>Nama / No. HP</TableHead>
            <TableHead>Total Order</TableHead>
            <TableHead>Status Reseller</TableHead>
            <TableHead>Admin</TableHead>
            <TableHead>Status Akun</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users === null &&
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={7}>
                  <Skeleton className="h-6 w-full" />
                </TableCell>
              </TableRow>
            ))}
          {(users ?? []).map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.email}</TableCell>
              <TableCell className="text-xs">{u.name || "-"}<br />{u.phone || "-"}</TableCell>
              <TableCell>{u._count.orders}</TableCell>
              <TableCell>
                <div className="space-y-1">
                  <Badge className={u.isReseller ? "bg-emerald-600 text-white" : u.resellerStatus === "PENDING" ? "bg-amber-500 text-white" : "bg-slate-500 text-white"}>
                    {u.isReseller ? "Approved/Aktif" : u.resellerStatus === "PENDING" ? "Pending" : u.resellerStatus === "REJECTED" ? "Rejected" : "Customer"}
                  </Badge>
                  <Switch checked={u.isReseller} onCheckedChange={(v) => patch(u.id, { isReseller: v })} />
                </div>
              </TableCell>
              <TableCell>
                <Switch checked={u.isAdmin} onCheckedChange={(v) => patch(u.id, { isAdmin: v })} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Switch checked={u.isActive} onCheckedChange={(v) => patch(u.id, { isActive: v })} />
                  <span className="text-xs">{u.isActive ? "Aktif" : "Nonaktif"}</span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Button size="icon" variant="ghost" className="text-rose-600 hover:bg-rose-50" onClick={() => remove(u)} aria-label="Hapus user">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
