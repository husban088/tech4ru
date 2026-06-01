// app/layout.tsx
import type { Metadata } from "next";
import { Goldman } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Providers from "./providers";
import { CurrencyProvider } from "./context/CurrencyContext";
import { LanguageProvider } from "./context/LanguageContext";
import { getInitialCurrency } from "@/lib/get-initial-currency";

// ✅ Goldman ONLY — single font
const goldman = Goldman({
  variable: "--font-goldman",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  preload: true,
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Tech4U | Luxury in Every Detail",
  description: "Tech4U — Luxury in Every Detail.",
  icons: { icon: "/icon.jpg" },
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
        {/* ✅ PERF: DNS prefetch + preconnect for faster resource loading */}
        <link rel="dns-prefetch" href="//connect.facebook.net" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />

        {/* ✅ PERF: Viewport meta — prevents double-tap zoom lag on mobile */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />

        {/* ✅ PERF: Meta Pixel — afterInteractive = page load block nahi karega */}
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
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=1929542124417287&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
      </head>

      {/*
        ✅ PERF NOTES:
        - html  → height: auto, overflow: visible  (single scroll container)
        - body  → min-h-screen, overflow-y: auto   (body scrolls only)
        - scrollbar-gutter: stable → no layout shift when scrollbar appears
      */}
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
