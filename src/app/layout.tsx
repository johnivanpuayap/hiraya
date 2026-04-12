import type { Metadata } from "next";
import { Inter, DM_Serif_Display } from "next/font/google";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const dmSerifDisplay = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-dm-serif-display",
});

interface RootLayoutProps {
  children: React.ReactNode;
}

export const metadata: Metadata = {
  title: "Hiraya — Your friendly adaptive PhilNITS reviewer",
  description:
    "Your friendly adaptive PhilNITS reviewer that tracks your progress and helps you prepare with confidence.",
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSerifDisplay.variable}`}>
      <body className="bg-atmosphere font-body text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
