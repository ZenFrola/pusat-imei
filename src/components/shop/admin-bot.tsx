"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Send, Link2, DownloadCloud, ImageIcon, Trash2, CheckCircle2 } from "lucide-react";

export function AdminBotSettings() {
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [hasToken, setHasToken] = useState(false);
  const [tokenMasked, setTokenMasked] = useState("");
  const [qris, setQris] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/settings");
    if (res.ok) {
      const d = await res.json();
      setHasToken(d.setting.hasBotToken);
      setTokenMasked(d.setting.telegramBotToken || "");
      setChatId(d.setting.telegramChatId || "");
      setQris(d.setting.qrisImage || "");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(fields: Record<string, string>, label: string) {
    setBusy(label);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Gagal menyimpan");
      await load();
      setMsg({ type: "ok", text: "Pengaturan tersimpan" });
    } catch (err) {
      setMsg({ type: "err", text: err instanceof Error ? err.message : "Terjadi kesalahan" });
    } finally {
      setBusy("");
    }
  }

  async function tgAction(action: "test" | "setwebhook" | "poll") {
    setBusy(action);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, baseUrl: window.location.origin }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Gagal");
      if (action === "test") {
        setMsg({
          type: "ok",
          text: `Bot @${d.botUsername} terhubung. ${d.chatInfo}${d.hint ? ` — ${d.hint}` : ""}`,
        });
      } else if (action === "setwebhook") {
        setMsg({ type: "ok", text: `Webhook aktif: ${d.url}` });
      } else {
        setMsg({ type: "ok", text: `Polling selesai: ${d.diterima} update diterima, ${d.diproses} diproses.` });
      }
    } catch (err) {
      setMsg({ type: "err", text: err instanceof Error ? err.message : "Terjadi kesalahan" });
    } finally {
      setBusy("");
    }
  }

  function pickQris() {
    fileRef.current?.click();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setMsg({ type: "err", text: "Maksimal 2MB" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => save({ qrisImage: reader.result as string }, "qris");
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Send className="h-5 w-5 text-emerald-600" />
            Bot Telegram
          </CardTitle>
          <CardDescription>
            Buat bot lewat <b>@BotFather</b> (perintah /newbot), salin token di sini. Chat ID
            owner bisa didapat lewat bot <b>@userinfobot</b> — lalu kirim <b>/start</b> ke bot Anda.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tg-token">Bot Token</Label>
            <div className="flex gap-2">
              <Input
                id="tg-token"
                type="password"
                placeholder={hasToken ? tokenMasked : "123456:ABC-xxxxxxx"}
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
              />
              <Button
                onClick={() => save({ telegramBotToken: botToken }, "token")}
                disabled={busy === "token" || !botToken.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {busy === "token" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Simpan
              </Button>
            </div>
            {hasToken && (
              <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="mr-1 h-3 w-3" /> Token terpasang ({tokenMasked})
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tg-chat">Chat ID Owner</Label>
            <div className="flex gap-2">
              <Input
                id="tg-chat"
                placeholder="Contoh: 123456789"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
              />
              <Button
                onClick={() => save({ telegramChatId: chatId }, "chat")}
                disabled={busy === "chat" || !chatId.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {busy === "chat" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Simpan
              </Button>
            </div>
          </div>

          <Separator />

          <div className="grid gap-2 sm:grid-cols-3">
            <Button variant="outline" onClick={() => tgAction("test")} disabled={!!busy}>
              {busy === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Tes Koneksi
            </Button>
            <Button variant="outline" onClick={() => tgAction("setwebhook")} disabled={!!busy}>
              {busy === "setwebhook" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Pasang Webhook
            </Button>
            <Button variant="outline" onClick={() => tgAction("poll")} disabled={!!busy}>
              {busy === "poll" ? <Loader2 className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
              Sinkron Polling
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            <b>Pasang Webhook</b>: notifikasi masuk otomatis ke bot. Jika webhook bermasalah,
            gunakan <b>Sinkron Polling</b> setelah klaim pembayaran untuk menarik tombol YES yang
            sudah ditekan owner.
          </p>

          {msg && (
            <p
              className={`rounded-md px-3 py-2 text-sm border ${
                msg.type === "ok"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              {msg.text}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ImageIcon className="h-5 w-5 text-emerald-600" />
            Gambar QRIS
          </CardTitle>
          <CardDescription>
            Upload foto QRIS Anda (PNG/JPG maks 2MB). Gambar ini yang ditampilkan ke pembeli saat
            checkout.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center rounded-xl border bg-white p-3">
            <img
              src={qris || "/qris-placeholder.png"}
              alt="QRIS saat ini"
              className="h-56 w-auto rounded-lg object-contain"
            />
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
          <div className="flex gap-2">
            <Button
              onClick={pickQris}
              disabled={busy === "qris"}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {busy === "qris" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
              Upload QRIS Baru
            </Button>
            {qris && (
              <Button variant="outline" onClick={() => save({ qrisImage: "" }, "qris")} disabled={!!busy}>
                <Trash2 className="h-4 w-4" />
                Hapus
              </Button>
            )}
          </div>
          {!qris && (
            <p className="text-center text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Masih memakai QRIS contoh. Upload QRIS asli Anda agar pembeli bisa membayar.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
