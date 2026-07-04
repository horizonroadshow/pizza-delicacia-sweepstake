import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pizza Delicacia World Cup Sweepstake",
  description:
    "Track the Pizza Delicacia family World Cup sweepstake, including team owners, prizes, fixtures, results, and knockout progress.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
