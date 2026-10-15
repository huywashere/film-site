"use client";

import Script from "next/script";

export function GoogleAnalytics() {
  const primaryGaId = process.env.NEXT_PUBLIC_GA_ID || "G-N09XDT8QNQ";
  const fallbackGaId = "G-F40GYTK95H";
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID || "GTM-5FPK76FV";

  return (
    <>
      {/* ── Google Tag Manager ─────────────────────────────────────── */}
      {gtmId && (
        <>
          <Script
            id="gtm-script"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`,
            }}
          />
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        </>
      )}

      {/* ── Google Analytics 4 (GA4 direct gtag for flexphim-1 & backup) ── */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${primaryGaId}`}
        strategy="afterInteractive"
      />
      <Script
        id="ga4-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${primaryGaId}', {
              page_path: window.location.pathname,
              send_page_view: true
            });
            ${fallbackGaId && fallbackGaId !== primaryGaId ? `gtag('config', '${fallbackGaId}', { page_path: window.location.pathname, send_page_view: true });` : ""}
          `,
        }}
      />
    </>
  );
}

