import Script from 'next/script'

export function Analytics() {
  const gaId     = process.env.NEXT_PUBLIC_GA_ID
  const umamiUrl = process.env.NEXT_PUBLIC_UMAMI_URL
  const umamiId  = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID

  return (
    <>
      {gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `,
            }}
          />
        </>
      )}

      {umamiUrl && umamiId && (
        <Script
          src={`${umamiUrl}/script.js`}
          data-website-id={umamiId}
          strategy="afterInteractive"
          defer
        />
      )}
    </>
  )
}
