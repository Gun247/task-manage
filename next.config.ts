import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: ["googleapis", "google-auth-library", "xlsx"],
};

export default nextConfig;
