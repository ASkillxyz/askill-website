'use client'

// 访问统计组件
// 支持两种方案（可同时使用）：
// 1. Google Analytics 4 — 填入 NEXT_PUBLIC_GA_ID
// 2. Umami — 填入 NEXT_PUBLIC_UMAMI_URL 和 NEXT_PUBLIC_UMAMI_WEBSITE_ID（隐私友好、免费自托管）

import Script from 'next/script'

const GA_ID       = process.env.NEXT_PUBLIC_GA_ID
const UMAMI_URL   = process.env.NEXT_PUBLIC_UMAMI_URL
const UMAMI_ID    = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID

export function Analytics() {
  return (
    <>
      {/* Google Analytics 4 */}
      {GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}', { page_path: window.location.pathname });
            `}
          </Script>
        </>
      )}

      {/* Umami（隐私友好，无需 Cookie 弹窗） */}
      {UMAMI_URL && UMAMI_ID && (
        <Script
          src={`${UMAMI_URL}/script.js`}
          data-website-id={UMAMI_ID}
          strategy="afterInteractive"
          defer
        />
      )}
    </>
  )
}
