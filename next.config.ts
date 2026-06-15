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
    // webp first — avif decode heavy on mobile
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 7,
    dangerouslyAllowSVG: false,
  },

  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
    // FIX: scrollRestoration REMOVED — it conflicts with manual
    // window.scrollTo(0,0) in providers.tsx on route change.
    // Two systems fighting = scroll stuck / jumping on navigation.
    // providers.tsx handles scroll reset already.
    // scrollRestoration: true,  <-- REMOVED
  },

  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/_next/image",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
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
