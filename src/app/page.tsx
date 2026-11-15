import { getHomeArea } from "@/lib/home-area";
import { Hero } from "@/components/Hero";
import { TickerSection } from "@/components/TickerSection";
import { Suspense } from "react";
import { Intro } from "@/components/Intro";
import { InspectionFeedSection } from "@/components/InspectionFeedSection";
import { FeedSkeleton } from "@/components/FeedSkeleton";
import { InspectionDeskSection } from "@/components/InspectionDeskSection";
import { NewsletterTeaser } from "@/components/NewsletterTeaser";
import { AdSlot } from "@/components/AdSlot";
import { RecordLoader } from "@/components/RecordLoader";
import { LocationPrompt } from "@/components/LocationPrompt";

export default async function Home() {
  const area = await getHomeArea();
  return (
    <>
      <Intro />
      <Suspense
        key={`ticker-${area.key}`}
        fallback={
          <div className="ticker px-4 py-3 text-xs text-muted">
            <RecordLoader compact />
          </div>
        }
      >
        <TickerSection />
      </Suspense>
      <Suspense fallback={<div className="hero"><RecordLoader /></div>}><Hero /></Suspense>
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <AdSlot kind="top-leaderboard" />
      </div>

      {area.selected ? <Suspense key={`feed-${area.key}`} fallback={<FeedSkeleton />}>
        <InspectionFeedSection />
      </Suspense> : <LocationPrompt/>}

      {area.selected && <Suspense key={`desk-${area.key}`} fallback={<section className="categories"><RecordLoader /></section>}><InspectionDeskSection /></Suspense>}
      <NewsletterTeaser />
    </>
  );
}
