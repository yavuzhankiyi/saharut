import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Saharut | Saha Satış ve Operasyon Platformu",
  description:
    "Müşteri, ürün ve saha ziyaretlerini tek merkezden yönetin.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
