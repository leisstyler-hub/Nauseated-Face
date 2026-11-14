import { Suspense } from "react";
import { Hero } from "@/components/Hero";
import { InspectionFeedSection } from "@/components/InspectionFeedSection";
import { FeedSkeleton } from "@/components/FeedSkeleton";
import { CategoryGrid } from "@/components/CategoryGrid";
import { NewsletterTeaser } from "@/components/NewsletterTeaser";
import { AdSlot } from "@/components/AdSlot";

export default function Home() {
  return (
    <>
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
