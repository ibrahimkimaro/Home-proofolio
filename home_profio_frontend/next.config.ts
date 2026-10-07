import type { NextConfig } from "next";

// Bundle analyzer only for `ANALYZE=true npm run build`. Loaded on demand: it's a dev dependency, and
// importing it unconditionally stops the whole site from starting wherever it isn't installed.
function withAnalyzer(config: NextConfig): NextConfig {
  if (process.env.ANALYZE !== "true") return config;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const withBundleAnalyzer = require("@next/bundle-analyzer");
  return withBundleAnalyzer({ enabled: true })(config);
}

const nextConfig: NextConfig = {
  // Configurable output directory so dev (.next) and prod-test (.next_test) don't overwrite each other
  distDir: process.env.NEXT_DIST_DIR || ".next",

  // Turbopack empty config prevents Next 16 build conflict with custom webpack options
  turbopack: {},

  // 85 is used by the landing hero plate: it is a dark, grainy photo that bands badly at 75.
  images: {
    qualities: [75, 85, 90, 95],
  },

  // No floating Next.js button in development (compile/runtime errors still show).
  devIndicators: false,

  // Next.js blocks /_next/* dev resources from non-localhost origins by default.
  allowedDevOrigins: [
    "localhost",
    "localhost:3000",
    "localhost:3001",
    "127.0.0.1",
    "127.0.0.1:3000",
    "127.0.0.1:3001",
    "192.168.100.60",
    "192.168.100.60:3000",
    "192.168.100.16",
    "192.168.100.16:3000",
    "192.168.100.*",
    "192.168.*.*",
    "*.devtunnels.ms",
    "*.devtunnels.ms:3000",
    "homeproofolio.devtunnels.ms",
    "rl4whc7r-3000.uks1.devtunnels.ms",
    "rl4whc7r-3001.uks1.devtunnels.ms",
    "*.lhr.life",
    "*.localhost.run",
    "*.trycloudflare.com",
    "*.local",
    "*.lan"
  ],

  // Proxy /api/* → backend so browser cookies work on same origin (no cross-port issues)
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_INTERNAL_URL || "http://127.0.0.1:8000"}/:path*`,
      },
      // Realtime chat + call signaling websocket (Phoenix). Pages served over https (e.g. through a
      // Cloudflare or Dev Tunnel to this port) connect to wss://<same host>/socket; see socketUrl() in
      // src/lib/realtime.ts. Plain-http pages keep connecting to :4000 directly.
      {
        source: "/socket/:path*",
        destination: `${process.env.REALTIME_INTERNAL_URL || "http://127.0.0.1:4000"}/socket/:path*`,
      },
    ];
  },

  // Lightweight polling for Docker host mounts on Windows (ignoring heavy directories)
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1500,
        aggregateTimeout: 300,
        ignored: [
          "**/node_modules/**",
          "**/.next/**",
          "**/.git/**",
          "**/public/**",
        ],
      };
    }
    return config;
  },
};

export default withAnalyzer(nextConfig);

