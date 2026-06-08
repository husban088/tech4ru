import type { Metadata, Viewport } from "next";
import { Goldman } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Providers from "./providers";
import { CurrencyProvider } from "./context/CurrencyContext";
import { LanguageProvider } from "./context/LanguageContext";
import { getInitialCurrency } from "@/lib/get-initial-currency";

// ─── Font ─────────────────────────────────────────────────────────────────────
// FIX: adjustFontFallback:false — removes CLS-causing fallback size-adjust
// Goldman with display:'swap' + preload:true loads fast enough without it
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
        {/* Cloudinary — product images */}
        <link
          rel="preconnect"
          href="https://res.cloudinary.com"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="//res.cloudinary.com" />
        <link rel="dns-prefetch" href="//images.unsplash.com" />

        {/* Google Fonts — Goldman */}
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />

        {/* Facebook — preconnect BEFORE pixel script fires */}
        <link
          rel="preconnect"
          href="https://connect.facebook.net"
          crossOrigin="anonymous"
        />

        {/*
          Meta Pixel: afterInteractive = fires after hydration complete.
          lazyOnload was too late sometimes — missed PageView on fast navigations.
          afterInteractive is the sweet spot: no hydration blocking, reliable PageView.
        */}
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
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
