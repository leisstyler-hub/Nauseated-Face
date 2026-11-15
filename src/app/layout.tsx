import { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://nauseated-face.app";
const TITLE = "Nauseated Face — America’s Irreverent Food-Safety Watchdog";
const DESCRIPTION =
  "Official restaurant inspection records, turned into readable rankings and stories. Explore inspections near you. Funny, sarcastic, dramatic, and always data-backed.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s | Nauseated Face",
  },
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "Nauseated Face",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Suspense fallback={<header className="h-16 border-b border-card-border" />}><SiteHeader /></Suspense>
        <main className="flex flex-1 flex-col"><Suspense fallback={<p className="p-8 text-muted">Loading official records...</p>}>{children}</Suspense></main>
        <SiteFooter />
      </body>
    </html>
  );
}
