import { Suspense } from "react";
import { LoadingPage } from "@/components/ui/loading";
import DashboardPageContent from "./dashboard-content";

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <DashboardPageContent />
    </Suspense>
  );
}
