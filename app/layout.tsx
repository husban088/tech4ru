import type { Metadata, Viewport } from "next";
import { Goldman } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Providers from "./providers";
import { CurrencyProvider } from "./context/CurrencyContext";
import { LanguageProvider } from "./context/LanguageContext";
import { getInitialCurrency } from "@/lib/get-initial-currency";

// ─── Font ─────────────────────────────────────────────────────────────────────
// FIX: Added adjustFontFallback:false — Next.js by default injects a fallback
// font with size-adjust that causes a brief layout shift (CLS) while the real
// font loads. Since Goldman is loaded with display:'swap' and preload:true it
// loads fast; the fallback adjustment is more harm than help here.
const goldman = Goldman({
  variable: "--font-goldman",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  preload: true,
  fallback: ["system-ui", "sans-serif"],
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "Tech4U | Luxury in Every Detail",
  description: "Tech4U — Luxury in Every Detail.",
  icons: { icon: "/icon.jpg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialResult = await getInitialCurrency();
  const initialCurrencyCode = initialResult?.currency.code ?? undefined;

  return (
    <html
      lang="en"
      dir="ltr"
      className={goldman.variable}
      suppressHydrationWarning
    >
      <head>
        {/*
          FIX: Added dns-prefetch for Cloudinary since images come from there.
          Also added preconnect for connect.facebook.net so the Meta Pixel
          script loads faster (was previously only dns-prefetch).
        */}
        <link rel="dns-prefetch" href="//res.cloudinary.com" />
        <link rel="dns-prefetch" href="//images.unsplash.com" />
        <link
          rel="preconnect"
          href="https://connect.facebook.net"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="//connect.facebook.net" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />

        {/*
          FIX: Meta Pixel moved to strategy="lazyOnload" so it does NOT block
          the main thread during page load. The pixel fires after the page is
          fully interactive — PageView is still tracked correctly.
          Previously strategy:"afterInteractive" ran it during hydration,
          competing with React for the main thread and causing visible lag.
        */}
        <Script
          id="meta-pixel"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '1929542124417287');
              fbq('track', 'PageView');
            `,
          }}
        />
      </head>
      <body className="flex flex-col" suppressHydrationWarning>
        <LanguageProvider>
          <CurrencyProvider initialCurrencyCode={initialCurrencyCode}>
            <Providers>{children}</Providers>
          </CurrencyProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
