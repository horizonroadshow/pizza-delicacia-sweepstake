import type { Metadata } from "next";
import { activeSweepstakeConfig } from "@/data/sweepstakes";
import "./globals.css";

export const metadata: Metadata = {
  title: activeSweepstakeConfig.name,
  description: `Track the ${activeSweepstakeConfig.name}, including team owners, prizes, fixtures, results, and knockout progress.`,
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
