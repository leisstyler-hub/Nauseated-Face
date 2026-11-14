// Reserved ad placements. No provider is connected yet, so every slot is
// disabled by default and renders nothing — this is layout scaffolding only.
// Flip a slot's `enabled` flag once a real ad provider (AdSense, direct
// sponsorship, etc.) is wired up.

export type AdSlotKind =
  | "top-leaderboard"
  | "in-feed"
  | "sidebar"
  | "article"
  | "mobile-sticky"
  | "newsletter-sponsor"
  | "sponsored-feature";

const SLOT_ENABLED: Record<AdSlotKind, boolean> = {
  "top-leaderboard": false,
  "in-feed": false,
  sidebar: false,
  article: false,
  "mobile-sticky": false,
  "newsletter-sponsor": false,
  "sponsored-feature": false,
};

const SLOT_DIMENSIONS: Record<AdSlotKind, string> = {
  "top-leaderboard": "min-h-[90px]",
  "in-feed": "min-h-[120px]",
  sidebar: "min-h-[250px]",
  article: "min-h-[250px]",
  "mobile-sticky": "min-h-[50px]",
  "newsletter-sponsor": "min-h-[60px]",
  "sponsored-feature": "min-h-[160px]",
};

export function AdSlot({ kind }: { kind: AdSlotKind }) {
  if (!SLOT_ENABLED[kind]) return null;

  return (
    <div
      data-ad-slot={kind}
      className={`w-full rounded-lg border border-dashed border-card-border bg-card text-center text-xs text-muted ${SLOT_DIMENSIONS[kind]}`}
    >
      <span className="sr-only">Advertisement</span>
    </div>
  );
}
