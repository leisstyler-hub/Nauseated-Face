import Link from "next/link";

const NAV_LINKS = [
  { href: "/#latest", label: "Latest" },
  { href: "/#rankings", label: "Rankings" },
  { href: "/methodology", label: "Methodology" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-card-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl sm:text-3xl" aria-hidden>
            🤢
          </span>
          <span className="text-base font-extrabold tracking-tight sm:text-lg">
            Nauseated Face
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/#latest"
          className="rounded-full bg-nausea px-4 py-2 text-sm font-bold text-background transition-opacity hover:opacity-90 sm:hidden"
        >
          Latest
        </Link>
      </div>
    </header>
  );
}
