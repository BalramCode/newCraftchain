import './globals.css'
import { Providers } from './providers'
import MobileBottomNav from '@/components/MobileBottomNav'
import { Toaster } from '@/components/ui/toaster'

export const metadata = {
  metadataBase: new URL('https://new-craftchain.vercel.app/'),
  title: {
    default: 'CraftChain — Authentic Indian Handicrafts, verified on chain',
    template: '%s | CraftChain',
  },
  description: 'A heritage marketplace of hand-made Indian crafts. Every piece is minted as an NFT authenticity certificate on the Ethereum Sepolia network.',
  keywords: ['Indian handicrafts', 'blockchain', 'NFTs', 'artisan marketplace', 'authenticity verification', 'sustainable shopping', 'handlooms'],
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: 'xgj9JGOPRbq9eT-REIYuQDoftvxpLDxNtigk7xY4cgo',
  },
  openGraph: {
    title: 'CraftChain — Authentic Indian Handicrafts',
    description: 'A heritage marketplace of hand-made Indian crafts verifiable on the blockchain.',
    url: 'https://new-craftchain.vercel.app/',
    siteName: 'CraftChain',
    locale: 'en_IN',
    type: 'website',
  },
  alternates: {
    canonical: 'https://new-craftchain.vercel.app/',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: 'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);' }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "CraftChain",
              url: "https://new-craftchain.vercel.app/",
              logo: "https://new-craftchain.vercel.app/logo.png",
              description: "A heritage marketplace of hand-made Indian crafts.",
            })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "CraftChain",
              url: "https://new-craftchain.vercel.app/",
            })
          }}
        />
      </head>
      <body>
        <Providers>
          {children}
          <MobileBottomNav />
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
