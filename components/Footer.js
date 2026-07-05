'use client'
import Link from 'next/link'
import { useState } from 'react'
import { ShieldCheck, Mail, Twitter, Instagram, Linkedin, Github, ArrowRight, Check } from 'lucide-react'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleSubscribe = (e) => {
    e.preventDefault()
    if (!email.includes('@')) return
    setSubscribed(true)
    setEmail('')
  }

  const columns = [
    {
      title: 'Explore',
      links: [
        { label: 'Marketplace', href: '/products' },
        { label: 'Verify a Product', href: '/verify' },
        { label: 'Blockchain Explorer', href: '/explorer' },
        { label: 'Featured Artisans', href: '/products' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About Us', href: '/about' },
        { label: 'Contact', href: '/contact' },
        { label: 'Help Center', href: '/help' },
        { label: 'Careers', href: '/about' },
      ],
    },
    {
      title: 'Trust & Verification',
      links: [
        { label: 'How Verification Works', href: '/verify' },
        { label: 'GI Tag Certification', href: '/about' },
        { label: 'Blockchain Technology', href: '/explorer' },
        { label: 'Report Counterfeit', href: '/contact' },
      ],
    },
    {
      title: 'For Artisans & NGOs',
      links: [
        { label: 'Register as NGO', href: '/auth' },
        { label: 'Artisan Dashboard', href: '/dashboard/ngo' },
        { label: 'Mint a Product', href: '/dashboard/ngo' },
        { label: 'Partner With Us', href: '/contact' },
      ],
    },
  ]

  const socials = [
    { icon: Twitter, href: 'https://twitter.com', label: 'Twitter' },
    { icon: Instagram, href: 'https://instagram.com', label: 'Instagram' },
    { icon: Linkedin, href: 'https://linkedin.com', label: 'LinkedIn' },
    { icon: Github, href: 'https://github.com', label: 'GitHub' },
  ]

  return (
    <footer className="mt-24 border-t border-[#E7DDD6] bg-[#F9F6F0]">
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-10">

        {/* Top: brand + newsletter */}
        <div className="flex flex-col lg:flex-row justify-between gap-10 pb-12 border-b border-[#E7DDD6]">
          <div className="max-w-sm">
            <Link href="/" className="flex items-center gap-2 mb-4 group w-fit">
              <div className="w-8 h-8 rounded-lg bg-[#702935] flex items-center justify-center text-white font-bold font-heading transition-transform group-hover:scale-105">C</div>
              <span className="font-heading font-bold text-[17px] text-[#2C1E21] tracking-tight group-hover:text-[#702935] transition-colors">CraftChain</span>
            </Link>
            <p className="text-[14px] text-[#6E5A5E] leading-relaxed">
              Every piece you buy comes with an on-chain certificate, verifiable on Ethereum Sepolia. Made by artisans across India, protected by technology that respects the craft.
            </p>
            <div className="flex items-center gap-3 mt-5">
              {socials.map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-9 h-9 rounded-full border border-[#E7DDD6] bg-white flex items-center justify-center text-[#6E5A5E] hover:text-[#702935] hover:border-[#702935] hover:-translate-y-0.5 transition-all duration-200 shadow-sm"
                >
                  <s.icon size={16}/>
                </a>
              ))}
            </div>
          </div>

          <div className="max-w-sm w-full">
            <h4 className="font-heading font-semibold text-[14px] text-[#2C1E21] mb-2">Stay in the loop</h4>
            <p className="text-[13px] text-[#6E5A5E] mb-4">New artisan drops, verification updates, and heritage stories — no spam.</p>
            
            {subscribed ? (
              <div className="flex items-center gap-2 text-[13px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-4 py-2.5 rounded-lg font-medium animate-fadeIn">
                <Check size={15} className="text-emerald-600 shrink-0" /> Subscribed — welcome aboard
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <div className="relative flex-1">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6E5A5E]"/>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="w-full bg-white border border-[#E7DDD6] rounded-lg pl-9 pr-4 py-2.5 text-[14px] text-[#2C1E21] placeholder-[#6E5A5E]/60 focus:outline-none focus:border-[#702935] focus:ring-1 focus:ring-[#702935] transition-all"
                  />
                </div>
                <button 
                  type="submit" 
                  className="bg-[#702935] text-white hover:bg-[#582029] active:scale-[0.98] transition-all duration-150 py-2.5 px-4 rounded-lg shrink-0 flex items-center justify-center shadow-sm"
                >
                  <ArrowRight size={16}/>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Middle: link columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12 border-b border-[#E7DDD6]">
          {columns.map(col => (
            <div key={col.title}>
              <h4 className="font-heading font-semibold text-[12px] text-[#2C1E21] uppercase tracking-wider mb-4">{col.title}</h4>
              <ul className="flex flex-col gap-2.5">
                {col.links.map(link => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-[13.5px] text-[#6E5A5E] hover:text-[#702935] hover:translate-x-0.5 inline-block transition-all duration-150">
                      ={link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-8">
          <div className="flex items-center gap-2 text-[12px] bg-white border border-[#E7DDD6] px-3 py-1.5 rounded-full text-[#6E5A5E]">
            <ShieldCheck size={14} className="text-[#702935]"/> Contract <span className="font-mono text-[11px] bg-[#F2ECE4] px-1.5 py-0.5 rounded text-[#2C1E21]">0x3435...9e76</span> · Sepolia
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px] text-[#6E5A5E]">
            <span>© 2026 CraftChain. Heritage, verified.</span>
            <Link href="/about" className="hover:text-[#702935] transition-colors">Privacy Policy</Link>
            <Link href="/about" className="hover:text-[#702935] transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}