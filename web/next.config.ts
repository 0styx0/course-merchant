import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { testProxy: process.env.PLAYWRIGHT === "1" },
  turbopack: {
    root: process.cwd()
  }
};

export default nextConfig;
