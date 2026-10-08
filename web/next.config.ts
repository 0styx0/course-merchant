import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  experimental: { testProxy: process.env.PLAYWRIGHT === "1" },
  turbopack: {
    root: path.resolve(__dirname, ".."),
  }
};

export default nextConfig;
