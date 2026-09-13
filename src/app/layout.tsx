import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pusat IMEI — Layanan IMEI Profesional",
  description:
    "Pusat IMEI menyediakan layanan IMEI iPhone secara online dengan pembayaran QRIS dan pemantauan status pesanan.",
  keywords: ["Pusat IMEI", "IMEI iPhone", "layanan IMEI", "cek IMEI", "unlock iPhone", "QRIS"],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Pusat IMEI — Layanan IMEI Profesional",
    description: "Pesan layanan IMEI iPhone secara online, bayar via QRIS, dan pantau status pesanan.",
    siteName: "Pusat IMEI",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
