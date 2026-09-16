import { Suspense } from "react";
import TimelinePageContent from "./timeline-content";
import { TimelinePageFallback } from "./timeline-fallback";

export default function TimelinePage() {
  return (
    <Suspense fallback={<TimelinePageFallback />}>
      <TimelinePageContent />
    </Suspense>
  );
}
