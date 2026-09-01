import { Suspense } from "react";
import { LoadingPage } from "@/components/ui/loading";
import { TasksPageContent } from "./tasks-content";

export default function TasksPage() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <TasksPageContent />
    </Suspense>
  );
}
