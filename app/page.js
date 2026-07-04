'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { ShieldCheck, Sparkles, Hammer, ShoppingBag, Search, ArrowRight, Link2 } from 'lucide-react'

function App() {
  const [stats, setStats] = useState({ contract: '', explorer: '' })
  useEffect(() => {
    fetch('/api/contract-info').then(r=>r.json()).then(setStats).catch(()=>{})
  }, [])

  const shortAddr = stats.address ? `${stats.address.slice(0,6)}…${stats.address.slice(-4)}` : '0x3435…9e76'

  return (
    <div className="min-h-screen bg-[#F9F6F0]">
      <Nav />

      {/* HERO */}
      <section className="relative">
        <div className="absolute inset-0 overflow-hidden">
          <img src="https://images.unsplash.com/photo-1640292343595-889db1c8262e?w=2000" alt="artisan weaving" className="w-full h-full object-cover opacity-60"/>
          <div className="absolute inset-0 hero-fade"/>
        </div>
        <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-32">
          <div className="max-w-3xl">
            <div className="chip-verified mb-6"><ShieldCheck size={14}/> Every piece verified on Ethereum</div>
            <h1 className="font-heading text-[52px] md:text-[68px] leading-[1.02] font-bold text-[#2C1E21] tracking-tight">
              Heritage crafts,<br/>with a certificate the world can read.
            </h1>
            <p className="mt-6 text-[17px] md:text-[19px] text-[#6E5A5E] leading-relaxed max-w-2xl">
              CraftChain is a marketplace of authentic Indian handicrafts. Each piece is minted as a unique certificate on the Ethereum blockchain — you can verify the artisan, origin, and ownership at any time.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/products" className="btn-cta"><ShoppingBag size={18}/> Explore Products <ArrowRight size={16}/></Link>
              <Link href="/verify" className="btn-outline"><Search size={18}/> Verify a Product</Link>
              <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer" className="btn-outline"><Link2 size={18}/> Connect Wallet</a>
            </div>
            <div className="mt-8 flex flex-wrap gap-6 text-[13px] text-[#6E5A5E]">
              <div>Contract <span className="hash-mono">{shortAddr}</span> · Sepolia</div>
              {stats.address && <a href={`${stats.explorer}/address/${stats.address}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-[#702935]">View on Etherscan →</a>}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="chip-muted mb-4">How it works</div>
          <h2 className="font-heading text-[38px] font-bold text-[#2C1E21] leading-tight">Three steps. Real provenance.</h2>
          <p className="mt-3 text-[16px] text-[#6E5A5E]">The blockchain is a trust layer under the hood — you shop like any premium boutique, but every purchase is verifiable.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Hammer, title: '1. Mint', body: 'An NGO registers each product and mints a unique ERC-721 certificate on Ethereum Sepolia.', color: '#702935' },
            { icon: ShoppingBag, title: '2. Buy', body: 'Browse, cart, and check out. On payment, ownership transfers to you — a real on-chain transaction.', color: '#8B2635' },
            { icon: ShieldCheck, title: '3. Verify', body: 'Anyone can enter a token ID on our Verify page and see the artisan, origin, and current owner — live from the chain.', color: '#00897B' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-7 border border-[#E7DDD6] card-warm">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5" style={{background: s.color+'15'}}>
                <s.icon size={22} style={{color: s.color}}/>
              </div>
              <h3 className="font-heading text-[20px] font-bold text-[#2C1E21] mb-2">{s.title}</h3>
              <p className="text-[15px] text-[#6E5A5E] leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA STRIP */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="rounded-3xl overflow-hidden relative bg-gradient-to-br from-[#702935] to-[#8B2635] p-12 md:p-16">
          <div className="relative z-10 max-w-2xl">
            <Sparkles size={28} className="text-white/80 mb-4"/>
            <h2 className="font-heading text-[36px] font-bold text-white leading-tight">Own a piece of India, verifiable forever.</h2>
            <p className="mt-4 text-[16px] text-white/85">The provenance moves with the object. If you gift it, resell it, or lend it — the chain remembers.</p>
            <div className="mt-8 flex gap-3">
              <Link href="/products" className="bg-white text-[#702935] px-6 py-3 rounded-xl font-heading font-bold hover:bg-[#F9F6F0] transition inline-flex items-center gap-2">Browse marketplace <ArrowRight size={16}/></Link>
              <Link href="/verify" className="border border-white/40 text-white px-6 py-3 rounded-xl font-heading font-bold hover:bg-white/10 transition">Verify a token</Link>
            </div>
          </div>
        </div>
      </section>

      <Footer/>
    </div>
  )
}

export default App
