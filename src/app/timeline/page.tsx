import { Suspense } from "react";
import { LoadingPage } from "@/components/ui/loading";
import TimelinePageContent from "./timeline-content";

export default function TimelinePage() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <TimelinePageContent />
    </Suspense>
  );
}
