import { Hero } from "@/components/Hero";
import { TickerSection } from "@/components/TickerSection";
import { Suspense } from "react";
import { Intro } from "@/components/Intro";
import { InspectionFeedSection } from "@/components/InspectionFeedSection";
import { FeedSkeleton } from "@/components/FeedSkeleton";
import { CategoryGrid } from "@/components/CategoryGrid";
import { NewsletterTeaser } from "@/components/NewsletterTeaser";
import { AdSlot } from "@/components/AdSlot";
import { RecordLoader } from "@/components/RecordLoader";

export default function Home() {
  return (
    <>
      <Intro />
      <Suspense
        fallback={
          <div className="ticker px-4 py-3 text-xs text-muted">
            <RecordLoader compact />
          </div>
        }
      >
        <TickerSection />
      </Suspense>
      <Hero />
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <AdSlot kind="top-leaderboard" />
      </div>

      <Suspense fallback={<FeedSkeleton />}>
        <InspectionFeedSection />
      </Suspense>

      <CategoryGrid />
      <NewsletterTeaser />
    </>
  );
}
