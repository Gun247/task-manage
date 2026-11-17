import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "TIM TaskManage" },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
