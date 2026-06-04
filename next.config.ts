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
    // FIX: webp first — faster decode than avif on most devices
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // FIX: 7-day cache — images rarely change, fewer round-trips = faster loads
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },

  experimental: {
    // FIX: Tree-shakes lucide-react and framer-motion — only used icons/components bundled
    optimizePackageImports: ["lucide-react", "framer-motion"],

    // FIX: Partial prerendering — static shell renders instantly,
    // dynamic parts stream in. Major speed boost for pages with both
    // static and dynamic content.
    // ppr: true, // uncomment if on Next.js 15+
  },

  // FIX: React strict mode — catches double-effect bugs in dev
  reactStrictMode: true,

  // FIX: gzip compression — reduces response payload size
  compress: true,

  // FIX: removes X-Powered-By header — minor security + saves bytes
  poweredByHeader: false,

  // FIX: Custom headers for ALL pages:
  // - Cache static assets aggressively
  // - DNS prefetch control for privacy
  async headers() {
    return [
      {
        // Static assets — cache forever (fingerprinted by Next.js)
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Images — cache 7 days
        source: "/_next/image",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // All pages — performance headers
        source: "/(.*)",
        headers: [
          // FIX: Prefetch DNS for external domains on every page load
          {
            key: "Link",
            value: [
              "<https://res.cloudinary.com>; rel=preconnect",
              "<https://fonts.gstatic.com>; rel=preconnect; crossorigin",
            ].join(", "),
          },
          // FIX: X-Content-Type-Options prevents MIME sniffing attacks
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },

  transpilePackages: [],
};

module.exports = nextConfig;
