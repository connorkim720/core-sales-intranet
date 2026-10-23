import { Suspense } from "react";

import { InfluencerSearchPanel } from "@/components/influencers/influencer-search-panel";

export default function InfluencersPage() {
  return (
    <Suspense fallback={null}>
      <InfluencerSearchPanel />
    </Suspense>
  );
}
