import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the development compiler's chunks separate from production builds.
  // `npm run build` clears `.next`, which must not invalidate a running dev
  // server's webpack runtime during Fast Refresh.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
