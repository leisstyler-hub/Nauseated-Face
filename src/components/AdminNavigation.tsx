"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminSections } from "@/lib/admin-navigation";
export function AdminNavigation(){
 const path=usePathname();if(['/admin/login','/admin/forgot-password','/admin/reset-password'].includes(path))return null;
 return <nav aria-label="Admin sections" className="mx-auto w-full max-w-6xl border-b border-card-border px-4 py-5 sm:px-6"><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">{[{href:'/admin',label:'Overview'},...adminSections].map(item=><Link key={item.href} href={item.href} aria-current={path===item.href?'page':undefined} className={`flex min-h-12 items-center justify-center rounded-lg border px-3 py-2 text-center text-xs font-bold sm:text-sm ${path===item.href?'border-nausea bg-nausea-soft text-nausea':'border-card-border bg-card text-muted hover:text-foreground'}`}>{item.label}</Link>)}</div></nav>;
}
