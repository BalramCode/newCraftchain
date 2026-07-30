'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { Reveal } from '@/components/Motion'
import { ShieldCheck, ExternalLink, Package, ShoppingBag, Sparkles } from 'lucide-react'
import Image from 'next/image'

function CustomerDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [orders, setOrders] = useState([])
  const [certs, setCerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const u = localStorage.getItem('cc_user')
    const t = localStorage.getItem('cc_token')
    if (!u || !t) { router.push('/auth'); return }
    setUser(JSON.parse(u))
    Promise.all([
      fetch('/api/orders', { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()),
      fetch('/api/certificates/me', { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()),
    ]).then(([o, c]) => {
      setOrders(Array.isArray(o) ? o : [])
      setCerts(Array.isArray(c) ? c : [])
      setLoading(false)
    })
  }, [])

  const totalSpent = orders.reduce((s, o) => s + Number(o.price || 0), 0)

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <Reveal>
          <div className="chip-verified mb-3"><Sparkles size={14} /> Your account</div>
          <h1 className="font-heading text-[38px] font-bold text-[#2C1E21] leading-tight">Welcome, {user?.name?.split(' ')[0] || 'friend'}.</h1>
          <p className="text-[15px] text-[#6E5A5E] mt-2">Your orders and digital certificates — all backed by real transactions on Sepolia.</p>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {[
            { label: 'Orders', value: orders.length, icon: ShoppingBag, color: '#702935' },
            { label: 'Certificates owned', value: certs.length, icon: ShieldCheck, color: '#00897B' },
            { label: 'Total spent', value: `₹${totalSpent.toLocaleString('en-IN')}`, icon: Package, color: '#8B2635' },
          ].map((s, i) => (
            <Reveal key={i} delay={i * 0.08}>
              <div className="bg-white rounded-2xl border border-[#E7DDD6] p-5 card-warm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: s.color + '15' }}>
                  <s.icon size={20} style={{ color: s.color }} />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-[#6E5A5E]">{s.label}</div>
                  <div className="font-heading text-[24px] font-bold text-[#2C1E21]">{s.value}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* CERTIFICATES */}
        <Reveal delay={0.05}>
          <h2 className="font-heading text-[24px] font-bold text-[#2C1E21] mt-12 mb-4">Your digital certificates</h2>
        </Reveal>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">{[...Array(5)].map((_, i) => <div key={i} className="bg-white rounded-xl aspect-[4/5] animate-pulse border border-[#E7DDD6]" />)}</div>
        ) : certs.length === 0 ? (
          <div className="text-center py-16 text-[#6E5A5E] bg-white rounded-2xl border border-[#E7DDD6]">
            No certificates yet. <Link href="/products" className="text-[#702935] underline">Explore products</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {certs.map((c, i) => (
              <Reveal key={c.orderId} delay={i * 0.05}>
                <Link
                  href={`/verify?token=${c.tokenId}`}
                  className="group block bg-white rounded-xl border border-[#00897B]/20 overflow-hidden flex flex-col h-full hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(44,30,33,0.08)] transition-all duration-300"
                >
                  <div className="aspect-square bg-[#EFE7DE] overflow-hidden shrink-0">
                    <Image src={c.image} alt={c.name} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-3 flex flex-col flex-1 justify-between gap-2">
                    {/* <div>
                      <div className="mb-1.5">
                        <span className="chip-verified text-[9px] px-1.5 py-0.5"><ShieldCheck size={10} /> Verified</span>
                      </div>
                      <h3 className="font-heading font-bold text-[13px] sm:text-[14px] text-[#2C1E21] leading-tight line-clamp-2">{c.name}</h3>
                    </div> */}
                    <h3 className="font-heading font-bold text-[13px] sm:text-[14px] text-[#2C1E21] leading-tight line-clamp-2">{c.name}</h3>

                    <div className="mt-1 text-[11px] font-semibold text-[#00897B] group-hover:text-[#00695C] transition-colors flex items-center justify-between">
                      View details <span className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">→</span>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}

        {/* ORDERS TABLE */}
        <Reveal delay={0.05}>
          <h2 className="font-heading text-[24px] font-bold text-[#2C1E21] mt-12 mb-4">Order history</h2>
        </Reveal>
        <Reveal>
          {/* MOBILE CARDS VIEW */}
          <div className="md:hidden space-y-4">
            {orders.length === 0 ? (
              <div className="text-center py-8 text-[#6E5A5E] bg-white rounded-2xl border border-[#E7DDD6]">No orders yet.</div>
            ) : (
              orders.map(o => (
                <div key={o.id} className="bg-white rounded-2xl border border-[#E7DDD6] p-4 card-warm">
                  <div className="flex gap-3 mb-3">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0"><Image src={o.productImage || 'https://new-craftchain.vercel.app/logo.png'} fill sizes="48px" className="object-cover" alt="" /></div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <span className="font-heading font-bold text-[15px] text-[#2C1E21] leading-tight line-clamp-2">{o.productName}</span>
                        <span className="chip-verified text-[10px] whitespace-nowrap ml-2"><ShieldCheck size={10} /> {o.status}</span>
                      </div>
                      <div className="text-[11px] text-[#6E5A5E] mt-1">Token #{o.tokenId}</div>
                    </div>
                  </div>
                  <div className="h-px bg-[#E7DDD6] my-3" />
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-[#6E5A5E]">{new Date(o.createdAt).toLocaleDateString()}</span>
                    <span className="font-heading font-bold text-[15px] text-[#702935]">₹{Number(o.price).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* DESKTOP TABLE VIEW */}
          <div className="hidden md:block bg-white rounded-2xl border border-[#E7DDD6] overflow-hidden card-warm">
            <table className="w-full text-[13px]">
              <thead className="bg-[#F9F6F0] text-[11px] uppercase tracking-wider text-[#6E5A5E]">
                <tr>
                  <th className="text-left px-5 py-3">Product</th>
                  <th className="text-left px-5 py-3">Token</th>
                  <th className="text-left px-5 py-3">Amount</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} className="border-t border-[#E7DDD6]">
                    <td className="px-5 py-3 flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0"><Image src={o.productImage || 'https://new-craftchain.vercel.app/logo.png'} fill sizes="40px" className="object-cover" alt="" /></div>
                      <span className="font-medium text-[#2C1E21]">{o.productName}</span>
                    </td>
                    <td className="px-5 py-3">#{o.tokenId}</td>
                    <td className="px-5 py-3 font-heading font-bold">₹{Number(o.price).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3"><span className="chip-verified"><ShieldCheck size={10} /> {o.status}</span></td>
                    <td className="px-5 py-3 text-[#6E5A5E]">{new Date(o.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan="5" className="text-center py-8 text-[#6E5A5E]">No orders yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Reveal>
      </div>
      <Footer />
    </div>
  )
}
export default CustomerDashboard
