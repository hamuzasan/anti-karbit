import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Waifu Verifier - Loyalty Test",
  description: "Buktikan kamu bukan raja karbit!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Menambahkan class light dan style colorScheme untuk mematikan mode gelap otomatis
    <html lang="en" className="light" style={{ colorScheme: 'light' }}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased text-slate-800`}
      >
        {/* Container utama agar konten selalu di atas background cerah */}
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}