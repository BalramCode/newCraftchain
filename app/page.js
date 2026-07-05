'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion,AnimatePresence  } from 'framer-motion'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { Reveal } from '@/components/Motion'
import { ShieldCheck, Sparkles, Hammer, ShoppingBag, Search, ArrowRight, Link2 } from 'lucide-react'

function App() {

  const steps = [
    { title: 'Mint', eyebrow: 'Step 01 — On-chain', body: 'An NGO registers each product and mints a unique ERC-721 certificate on Ethereum Sepolia.', color: '#702935', tag: 'TOKEN MINTED', rows: [['Token ID', '#0483'], ['Minted by', 'Artisan Collective NGO'], ['Network', 'Sepolia Testnet']] },
    { title: 'Buy', eyebrow: 'Step 02 — Transaction', body: 'Browse, cart, and check out. On payment, ownership transfers to you — a real on-chain transaction.', color: '#8B2635', tag: 'OWNERSHIP TRANSFERRED', rows: [['From', '0x4a1F...9Ef2'], ['To', '0x71c3...F0a8'], ['Tx hash', '0x8e2d...b71c']] },
    { title: 'Verify', eyebrow: 'Step 03 — Public record', body: 'Anyone can enter a token ID on our Verify page and see the artisan, origin, and current owner — live from the chain.', color: '#00897B', tag: 'VERIFIED', rows: [['Origin', 'Jaipur, India'], ['Artisan', 'Meera Devi'], ['Status', 'Authentic']] },
  ];
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const current = steps[active];

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setActive((a) => (a + 1) % steps.length), 4200);
    return () => clearInterval(t);
  }, [paused]);

  const [stats, setStats] = useState({ contract: '', explorer: '' })
  useEffect(() => {
    fetch('/api/contract-info').then(r => r.json()).then(setStats).catch(() => { })
  }, [])

  const shortAddr = stats.address ? `${stats.address.slice(0, 6)}…${stats.address.slice(-4)}` : '0x3435…9e76'

  return (
    <div className="min-h-screen bg-[#F9F6F0]">
      <Nav />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <motion.div
          initial={{ scale: 1.06, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <img src="https://images.unsplash.com/photo-1640292343595-889db1c8262e?w=2000" alt="artisan weaving" className="w-full h-full object-cover opacity-90" />
          {/* <div className="absolute inset-0 hero-fade"/> */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#F9F6F0] via-[#F9F6F0]/50 to-[#F9F6F0]/20" />
          {/* <div className="absolute inset-0 bg-gradient-to-t from-[#F9F6F0]/60 via-transparent to-transparent" /> */}
        </motion.div>
        <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-32">
          <div className="max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="chip-verified mb-6"><ShieldCheck size={14} /> Every piece verified on Ethereum</motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="font-heading text-[42px] md:text-[58px] leading-[1.02] font-bold text-[#2C1E21] tracking-tight"
            >
              Authenticity You Can Verify.<br />Heritage You Can Trust.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.45 }}
              className="mt-6 text-[17px] md:text-[19px] text-[#6E5A5E] leading-relaxed max-w-2xl"
            >
              CraftChain is a marketplace of authentic Indian handicrafts. Discover blockchain-certified handlooms and handicrafts, directly from artisans and trusted NGOs. Every purchase includes a tamper-proof digital certificate of authenticity.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.65 }}
              className="mt-10 flex flex-wrap gap-3"
            >
              <Link href="/products" className="btn-cta"><ShoppingBag size={18} /> Explore Products <ArrowRight size={16} /></Link>
              <Link href="/verify" className="btn-outline"><Search size={18} /> Verify a Product</Link>
              <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer" className="btn-outline"><Link2 size={18} /> Connect Wallet</a>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.85 }}
              className="mt-8 flex flex-wrap gap-6 text-[13px] text-[#6E5A5E]"
            >
              <div>Contract <span className="hash-mono">{shortAddr}</span> · Sepolia</div>
              {stats.address && <a href={`${stats.explorer}/address/${stats.address}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-[#702935]">View on Etherscan →</a>}
              <Link href="/explorer" className="underline underline-offset-4 hover:text-[#702935]">Live activity →</Link>
            </motion.div>
          </div>
        </div>
      </section>




      {/* HOW IT WORKS */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="chip-muted mb-4">How it works</div>
            <h2 className="font-heading text-[38px] font-bold text-[#2C1E21] leading-tight">
              Three steps. Real provenance.
            </h2>
            <p className="mt-3 text-[16px] text-[#6E5A5E]">
              The blockchain is a trust layer under the hood — you shop like any premium boutique,
              but every purchase is verifiable.
            </p>
          </div>
        </Reveal>

        <Reveal>
          <div
            className="grid md:grid-cols-[380px_1fr] gap-10 items-stretch"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {/* LIVE CERTIFICATE PANEL */}
            <div className="relative rounded-2xl border border-[#E7DDD6] bg-white p-7 card-warm overflow-hidden flex flex-col">
              <div
                className="absolute -top-8 -right-8 w-24 h-24 rounded-full border-[6px] opacity-[0.08]"
                style={{ borderColor: current.color, transition: 'border-color 0.4s ease' }}
              />

              <div className="flex items-center gap-2 mb-6 relative z-10">
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: current.color }}
                />
                <span className="text-[11px] tracking-[0.12em] font-semibold text-[#8A7478] uppercase">
                  Ethereum Sepolia
                </span>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="relative z-10 flex-1 flex flex-col"
                >
                  <span
                    className="inline-block w-fit text-[11px] font-bold tracking-[0.08em] px-2.5 py-1 rounded-md mb-5"
                    style={{ background: current.color + '15', color: current.color }}
                  >
                    {current.tag}
                  </span>

                  <div className="space-y-3 mb-6">
                    {current.rows.map(([label, value]) => (
                      <div key={label} className="flex items-baseline justify-between gap-4 pb-2 border-b border-[#F1E9E3]">
                        <span className="text-[12px] text-[#9C8A8E]">{label}</span>
                        <span className="text-[13px] font-mono text-[#2C1E21] truncate">{value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto pt-2 font-mono text-[11px] text-[#B3A5A8] leading-relaxed">
                    &gt;&gt; certificate.{current.title.toLowerCase()}() confirmed
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* STEP SELECTOR */}
            <div className="flex flex-col gap-2">
              {steps.map((s, i) => {
                const isActive = i === active;
                return (
                  <button
                    key={s.title}
                    onClick={() => setActive(i)}
                    className="group text-left rounded-2xl border transition-colors duration-300 relative overflow-hidden px-6 py-5"
                    style={{
                      borderColor: isActive ? s.color + '55' : '#E7DDD6',
                      background: isActive ? s.color + '08' : 'white',
                    }}
                  >
                    <span
                      className="absolute left-0 top-0 bottom-0 w-[3px]"
                      style={{ background: isActive ? s.color : 'transparent' }}
                    />

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-baseline gap-3">
                        <span
                          className="font-heading font-bold text-[13px] tabular-nums"
                          style={{ color: isActive ? s.color : '#C9BBB6' }}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <h3
                          className="font-heading text-[19px] font-bold transition-colors"
                          style={{ color: isActive ? '#2C1E21' : '#9C8A8E' }}
                        >
                          {s.title}
                        </h3>
                      </div>
                      <span className="text-[11px] uppercase tracking-[0.1em] text-[#B3A5A8] hidden sm:block">
                        {s.eyebrow}
                      </span>
                    </div>

                    <AnimatePresence initial={false}>
                      {isActive && (
                        <motion.p
                          initial={{ height: 0, opacity: 0, marginTop: 0 }}
                          animate={{ height: 'auto', opacity: 1, marginTop: 10 }}
                          exit={{ height: 0, opacity: 0, marginTop: 0 }}
                          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                          className="text-[15px] text-[#6E5A5E] leading-relaxed overflow-hidden"
                        >
                          {s.body}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    {isActive && !paused && (
                      <motion.span
                        key={active}
                        className="absolute bottom-0 left-0 h-[2px]"
                        style={{ background: s.color, opacity: 0.4 }}
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 4.2, ease: 'linear' }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </Reveal>
      </section>

      {/* CTA STRIP */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <Reveal>
          <div className="rounded-3xl overflow-hidden relative bg-[#F9F6F0] border border-[#E7DDD6] card-warm-lg p-12 md:p-16">

            {/* animated node network texture */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.06]" preserveAspectRatio="none">
              <defs>
                <pattern id="cta-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1.5" fill="#702935" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#cta-grid)" />
            </svg>

            {/* drifting connection lines */}
            <motion.svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 800 400"
              preserveAspectRatio="xMidYMid slice"
            >
              {[
                [80, 60, 240, 140], [240, 140, 420, 80], [420, 80, 620, 180],
                [140, 260, 340, 220], [340, 220, 560, 320], [560, 320, 740, 260],
              ].map(([x1, y1, x2, y2], i) => (
                <motion.line
                  key={i}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="rgba(112,41,53,0.15)"
                  strokeWidth="1"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.8, delay: 0.3 + i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                />
              ))}
              {[[80, 60], [240, 140], [420, 80], [620, 180], [140, 260], [340, 220], [560, 320], [740, 260]].map(([cx, cy], i) => (
                <motion.circle
                  key={i}
                  cx={cx} cy={cy} r="4"
                  fill="#702935"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.4, 1], opacity: [0, 1, 0.5] }}
                  transition={{ duration: 0.6, delay: 0.4 + i * 0.12 }}
                />
              ))}
            </motion.svg>

            {/* soft pulsing glow orb */}
            <motion.div
              className="absolute -right-20 -top-20 w-80 h-80 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(112,41,53,0.10) 0%, transparent 70%)' }}
              animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />

            <div className="relative z-10 max-w-2xl">


              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="font-heading text-[36px] font-bold text-[#2C1E21] leading-tight"
              >
                Own a piece of India, verifiable forever.
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mt-4 text-[16px] text-[#6E5A5E]"
              >
                The provenance moves with the object. If you gift it, resell it, or lend it — the chain remembers.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mt-8 flex gap-3 flex-wrap"
              >
                <Link
                  href="/products"
                  className="group btn-cta"
                >
                  Browse marketplace
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/verify"
                  className="btn-outline"
                >
                  Verify a token
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.45 }}
                className="mt-8 flex flex-wrap gap-x-8 gap-y-2 text-[13px] text-[#6E5A5E]"
              >
                <span>Live on Ethereum Sepolia</span>
                <span>Zero gas fees for buyers</span>
                <span>Ownership recorded on every transfer</span>
              </motion.div>
            </div>
          </div>
        </Reveal>
      </section>

      <Footer />
    </div>
  )
}

export default App
