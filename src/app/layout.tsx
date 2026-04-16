import type { Metadata } from "next";
import { Inter, DM_Serif_Display } from "next/font/google";

import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const dmSerifDisplay = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-dm-serif-display",
  display: "swap",
});

interface RootLayoutProps {
  children: React.ReactNode;
}

export const metadata: Metadata = {
  title: "Hiraya — Study smart. Rise ready.",
  description:
    "Your adaptive PhilNITS exam reviewer. Hiraya tracks what you know, finds what you don't, and builds a study path uniquely yours.",
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSerifDisplay.variable}`}>
      <body className="bg-atmosphere font-body text-text-primary antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
