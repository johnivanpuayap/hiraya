import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

interface RootLayoutProps {
  children: React.ReactNode;
}

export const metadata: Metadata = {
  title: "Hiraya — Your friendly adaptive PhilNITS reviewer",
  description: "Your friendly adaptive PhilNITS reviewer that tracks your progress and helps you prepare with confidence.",
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body className="bg-background font-body text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
