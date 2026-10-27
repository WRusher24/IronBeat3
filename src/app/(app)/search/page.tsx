import { Suspense } from "react";

import { SearchBarSkeleton, TrackListSkeleton } from "@/components/ui/skeletons";
import { SearchView } from "./search-view";

export const metadata = {
  title: "Search",
};

function SearchFallback() {
  return (
    <div className="px-5 pt-[max(env(safe-area-inset-top),1.1rem)]">
      <p className="eyebrow">Instant search</p>
      <h1 className="mt-1 font-display text-[34px] leading-none">
        Find the energy.
      </h1>
      <div className="mt-5">
        <SearchBarSkeleton />
      </div>
      <div className="mt-8">
        <TrackListSkeleton rows={6} />
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchView />
    </Suspense>
  );
}
