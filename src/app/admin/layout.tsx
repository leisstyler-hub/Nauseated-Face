import type { Metadata } from "next";
import { AdminNavigation } from "@/components/AdminNavigation";
export const metadata: Metadata = { title: "Command Center", robots: { index: false, follow: false } };
export default function AdminLayout({ children }: { children: React.ReactNode }) { return <><AdminNavigation/>{children}</>; }
