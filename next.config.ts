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
    // FIX: webp first — avif decode is CPU-heavy on mobile, webp is faster
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // 7-day cache — images rarely change
    minimumCacheTTL: 60 * 60 * 24 * 7,
    // FIX: Disable blurDataURL generation — saves server CPU on every image request
    // Use placeholder="empty" in your Image components instead of placeholder="blur"
    // unless you explicitly need blur-up effect
    dangerouslyAllowSVG: false,
  },

  experimental: {
    // Tree-shakes lucide-react and framer-motion
    optimizePackageImports: ["lucide-react", "framer-motion"],
    // FIX: scrollRestoration — browser handles scroll pos on back/forward
    // avoids janky manual scroll-to-top conflicts
    scrollRestoration: true,
  },

  // React strict mode — catches double-effect bugs in dev
  reactStrictMode: true,

  // gzip compression
  compress: true,

  // removes X-Powered-By header
  poweredByHeader: false,

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
        // All pages
        source: "/(.*)",
        headers: [
          // FIX: Removed multi-value Link preconnect header — some CDNs and
          // proxies don't handle comma-joined Link headers correctly, causing
          // the hint to be ignored. Preconnect is already in layout.tsx <head>
          // which is more reliable and fires earlier in the HTML parse.

          // X-Content-Type-Options prevents MIME sniffing attacks
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // FIX: Permissions-Policy — disable unused browser APIs
          // Reduces attack surface + browser doesn't negotiate unused features
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // FIX: Referrer-Policy — don't leak full URL to third parties
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },

  transpilePackages: [],
};

module.exports = nextConfig;
