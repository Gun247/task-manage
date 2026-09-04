import { Suspense } from "react";
import { LoadingPage } from "@/components/ui/loading";
import HistoryPageContent from "./history-content";

export default function HistoryPage() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <HistoryPageContent />
    </Suspense>
  );
}
