import { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";
import { headers } from "next/headers";
import { TrafficTracker } from "@/components/TrafficTracker";

async function WebsiteShell({ children }: { children: React.ReactNode }) {
  if ((await headers()).get("x-nf-maintenance") === "1") return children;
  return <>
    <TrafficTracker />
    <Suspense fallback={<header className="h-16 border-b border-card-border" />}><SiteHeader /></Suspense>
    <main className="flex flex-1 flex-col"><Suspense fallback={<p className="p-8 text-muted">Loading official records...</p>}>{children}</Suspense></main>
    <SiteFooter />
  </>;
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://nauseated-face.app";
const TITLE = "Nauseated Face — The Food-Safety Watchdog No One Asked For";
const DESCRIPTION =
  "Real inspections. Real disgusting. Explore official food inspection records from the cities we cover. The food-safety watchdog no one asked for.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s | Nauseated Face",
  },
  description: DESCRIPTION,
  icons: { icon: '/nauseated-face-artwork.png', apple: '/nauseated-face-artwork.png' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "Nauseated Face",
    type: "website",
    images: [{ url:'/nauseated-face-artwork.png',width:1024,height:1024,alt:'Nauseated Face' }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ['/nauseated-face-artwork.png'],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}><WebsiteShell>{children}</WebsiteShell></Suspense>
      </body>
    </html>
  );
}
