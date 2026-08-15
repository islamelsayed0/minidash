import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MiniDash",
  description: "Read-only homelab dashboard for a self-hosted monitoring stack",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
