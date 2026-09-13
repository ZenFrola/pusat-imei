"use client";

import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/store";
import { LogIn, UserPlus, Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** tab awal saat dialog dibuka */
  initialMode?: "login" | "register";
  /** setelah sukses, diarahkan ke tab tertentu (mis. "reseller") */
  onSuccess?: () => void;
};

export function AuthDialog({ open, onOpenChange, initialMode = "login", onSuccess }: Props) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [asReseller, setAsReseller] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { login, register } = useAuth();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, asReseller);
      }
      onOpenChange(false);
      setEmail("");
      setPassword("");
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setError("");
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "login" ? "Masuk ke Akun" : "Daftar Akun Baru"}</DialogTitle>
          <DialogDescription>
            {mode === "login"
              ? "Gunakan email dan password yang sudah terdaftar."
              : "Daftar gratis menggunakan alamat email dan password."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
              mode === "login" ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
              mode === "register" ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
          >
            Daftar
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Alamat Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder={mode === "register" ? "Minimal 6 karakter" : "Password Anda"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {mode === "register" && (
            <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <div className="space-y-0.5">
                <Label htmlFor="reseller" className="text-emerald-900">
                  Daftar sebagai Reseller
                </Label>
                <p className="text-xs text-emerald-700">Dapatkan harga khusus lebih murah</p>
              </div>
              <Switch id="reseller" checked={asReseller} onCheckedChange={setAsReseller} />
            </div>
          )}

          {error && (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 border border-rose-200">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={busy}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === "login" ? (
              <LogIn className="h-4 w-4" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {mode === "login" ? "Masuk" : "Daftar Sekarang"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
