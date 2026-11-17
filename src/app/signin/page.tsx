import { Suspense } from "react";
import { SignInPageContent } from "./signin-content";

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--background,#E8F4FC)] text-sm text-slate-500">
          กำลังโหลด...
        </div>
      }
    >
      <SignInPageContent />
    </Suspense>
  );
}
