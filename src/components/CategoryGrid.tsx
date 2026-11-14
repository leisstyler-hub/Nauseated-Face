interface Category {
  emoji: string;
  title: string;
  description: string;
}

const CATEGORIES: Category[] = [
  {
    emoji: "🏆",
    title: "Nauseated Face Hall of Shame",
    description: "The worst inspection outcomes, ranked transparently.",
  },
  {
    emoji: "🚨",
    title: "Red Violation Report",
    description: "Businesses cited for critical (red) violations.",
  },
  {
    emoji: "🔁",
    title: "Repeat Offender",
    description: "Same violation, more than once, at the same business.",
  },
  {
    emoji: "🔒",
    title: "Closed Kitchen Watch",
    description: "Businesses closed by an inspector pending correction.",
  },
  {
    emoji: "📈",
    title: "Comeback of the Week",
    description: "Businesses that passed reinspection after a rough start.",
  },
  {
    emoji: "📋",
    title: "Most Violations",
    description: "Highest violation counts in a single inspection.",
  },
  {
    emoji: "🍽️",
    title: "Clean Plate Award",
    description: "Excellent, violation-free inspection results.",
  },
  {
    emoji: "📸",
    title: "Gross-Out Gallery",
    description: "The most memorable violation descriptions, verbatim.",
  },
];

export function CategoryGrid() {
  return (
    <section id="rankings" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          Ranking Categories
        </h2>
        <span className="rounded-full border border-warning/40 bg-warning/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-warning">
          Nauseated Face Index launching soon
        </span>
      </div>
      <p className="mb-8 max-w-2xl text-sm text-muted">
        These categories will be powered by the Nauseated Face Index, a
        transparent scoring system weighing violation points, red/critical
        violations, closures, reinspection outcomes, and repeat offenses. The
        scoring engine is still in development — nothing below is ranked yet.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CATEGORIES.map((cat) => (
          <div
            key={cat.title}
            className="flex flex-col gap-2 rounded-xl border border-card-border bg-card p-5"
          >
            <span className="text-3xl" aria-hidden>
              {cat.emoji}
            </span>
            <h3 className="text-base font-bold leading-snug">{cat.title}</h3>
            <p className="text-sm text-muted">{cat.description}</p>
            <span className="mt-auto pt-2 text-xs font-semibold text-muted">
              Coming soon
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
