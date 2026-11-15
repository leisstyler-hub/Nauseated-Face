import { getHomeArea } from "@/lib/home-area";
import { Face } from "@/components/Face";
import Link from "next/link";
import { LocationSelector, type SelectorState } from "@/components/LocationSelector";
import { STATUS_LABEL, getStates } from "@/lib/locations";

const NAV_LINKS = [
  { href: "/search", label: "Search" },
  { href: "/#rankings", label: "Rankings" },
  { href: "/locations", label: "Cities" },
  { href: "/about", label: "About" },
];

export async function SiteHeader() {
  const area = await getHomeArea();
  const states: SelectorState[] = (await getStates()).map((state) => ({
    code: state.code,
    name: state.name,
    slug: state.slug,
    cities: state.cities.map((city) => ({
      name: city.name,
      slug: city.slug,
      statusLabel: STATUS_LABEL[city.status],
      covered: city.covered,
      latitude: city.latitude,
      longitude: city.longitude,
    })),
  }));
  return (
    <header className="sticky top-0 z-40 border-b border-card-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="Nauseated Face home" className="flex items-center gap-2">
          <span className="text-2xl sm:text-3xl" aria-hidden>
            <Face />
          </span>
          <span className="hidden text-base font-extrabold tracking-tight min-[400px]:inline sm:text-lg">
            Nauseated Face
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted md:flex">
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
        <div className="flex items-center gap-2">
          <Link
            href="/search"
            aria-label="Search restaurants"
            className="rounded-full border border-card-border bg-card px-3 py-1.5 text-sm font-semibold transition-colors hover:border-nausea md:hidden"
          >
            <span aria-hidden>🔍</span>
          </Link>
          <LocationSelector states={states} initialArea={area.key} />
        </div>
      </div>
    </header>
  );
}
