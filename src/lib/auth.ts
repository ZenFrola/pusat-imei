import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be configured in production");
  }
  return secret || "development-only-session-secret";
}
export const SESSION_COOKIE = "jasaku_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 hari
export const RESELLER_STATUS = {
  NONE: "NONE",
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export function hasApprovedResellerAccess(user: { isReseller: boolean; resellerStatus: string }) {
  // isReseller=true keeps existing approved reseller accounts working after migration.
  return (
    user.resellerStatus === RESELLER_STATUS.APPROVED ||
    (user.isReseller && user.resellerStatus === RESELLER_STATUS.NONE)
  );
}

// ---------- Password ----------
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

// ---------- Session token (HMAC signed) ----------
function sign(payload: string): string {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("hex");
}

export function createSessionToken(userId: string): string {
  const expires = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = `${userId}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expires, sig] = parts;
  if (sign(`${userId}.${expires}`) !== sig) return null;
  if (Number(expires) < Date.now()) return null;
  return userId;
}

// ---------- Cookie helpers ----------
export async function setSessionCookie(userId: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/" });
}

// ---------- Current user ----------
export async function getSessionUser() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const userId = verifySessionToken(token);
  if (!userId) return null;
  return db.user.findUnique({
    where: { id: userId, isActive: true },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      isReseller: true,
      resellerStatus: true,
      isAdmin: true,
      createdAt: true,
    },
  });
}
