import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // don't tell scanners which framework to probe for known bugs
  poweredByHeader: false,
  experimental: { testProxy: process.env.PLAYWRIGHT === "1" },
  turbopack: {
    root: path.resolve(import.meta.dirname, ".."),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // browsers trust the declared file type instead of guessing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // other sites see our origin, never the full path
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // no site may frame our pages (clickjacking on admin pages)
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
