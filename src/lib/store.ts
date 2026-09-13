"use client";

import { create } from "zustand";

export type SessionUser = {
  id: string;
  email: string;
  isReseller: boolean;
  isAdmin: boolean;
};

type AuthState = {
  user: SessionUser | null;
  loading: boolean;
  fetchMe: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, asReseller: boolean) => Promise<void>;
  becomeReseller: () => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,

  fetchMe: async () => {
    try {
      const res = await fetch("/api/auth");
      const data = await res.json();
      set({ user: data.user ?? null, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },

  login: async (email, password) => {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login gagal");
    set({ user: data.user });
  },

  register: async (email, password, asReseller) => {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "register", email, password, asReseller }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registrasi gagal");
    set({ user: data.user });
  },

  becomeReseller: async () => {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "become_reseller" }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gagal jadi reseller");
    set({ user: data.user });
  },

  logout: async () => {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    set({ user: null });
  },
}));

export function formatRupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}
