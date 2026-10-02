import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js blocks /_next/* dev resources from non-localhost origins by default.
  // Allow the LAN so the site can be opened from a phone on the same network.
  allowedDevOrigins: ["192.168.2.102", "192.168.2.*", "localhost"],

  // Proxy /api/* → backend so browser cookies work on same origin (no cross-port issues)
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_INTERNAL_URL || "http://127.0.0.1:8000"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
