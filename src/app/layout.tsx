import type { Metadata } from "next";
import { Inter, Nunito } from "next/font/google";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito" });

interface RootLayoutProps {
  children: React.ReactNode;
}

export const metadata: Metadata = {
  title: "Hiraya — Aral hanggang pasa",
  description: "A friendly, adaptive PhilNITS exam reviewer that tracks your progress and helps you prepare with confidence.",
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`${inter.variable} ${nunito.variable}`}>
      <body className="bg-background font-body text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
