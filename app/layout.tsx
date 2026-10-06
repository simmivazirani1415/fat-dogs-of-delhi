import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Providers } from "@/components/providers/Providers";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://fatdogsofdelhi.wedevit.in"),
  title: { default: "Fat Dogs of Delhi — 64 dogs. One champion.", template: "%s | Fat Dogs of Delhi" },
  description:
    "Pick a champion from 64 of Delhi-NCR's chonkiest street and community dogs, see the most-picked favourites and put your own fat dog on the India map.",
  openGraph: {
    siteName: "Fat Dogs of Delhi",
    locale: "en_IN",
    type: "website",
    images: [{ url: "/dogs/d17a.jpg" }],
  },
  twitter: { card: "summary_large_image", site: "@fatdogsofdelhi" },
};

export const viewport: Viewport = { themeColor: "#f4df4b" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN" className={outfit.variable}>
      <body className="flex min-h-dvh flex-col">
        <Providers>
          <Navbar />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
