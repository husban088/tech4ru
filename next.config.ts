/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
    // FIX: avif is slower to encode/decode than webp on low-end devices.
    // Keep webp first so it is preferred. avif is kept as a fallback for
    // browsers that support it and benefit from the smaller file size.
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // FIX: Increased cache TTL from Next.js default (60s) to 7 days.
    // Images don't change often; longer cache = fewer round-trips = faster loads.
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },

  experimental: {
    // FIX: Kept optimizePackageImports — this tree-shakes large libraries
    // so only the icons/components you actually use are bundled.
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },

  // FIX: Enable React strict mode — catches accidental double-effects in dev
  // so production has fewer surprise re-renders.
  reactStrictMode: true,

  // FIX: Compress responses with gzip. Next.js can do this at the edge;
  // if you're behind a CDN or reverse proxy that handles compression,
  // set this to false to avoid double-compressing.
  compress: true,

  // FIX: poweredByHeader adds an X-Powered-By header on every response —
  // it's a minor security concern and wastes a few bytes per request.
  poweredByHeader: false,

  transpilePackages: [],
};

module.exports = nextConfig;
