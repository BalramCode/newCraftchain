import './globals.css'
import { Providers } from './providers'
import MobileBottomNav from '@/components/MobileBottomNav'
import { Toaster } from '@/components/ui/toaster'

export const metadata = {
  title: 'CraftChain — Authentic Indian Handicrafts, verified on chain',
  description: 'A heritage marketplace of hand-made Indian crafts. Every piece is minted as an NFT authenticity certificate on the Ethereum Sepolia network.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{__html:'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);'}} />
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
