'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { Reveal } from '@/components/Motion'
import { ShieldCheck, ExternalLink, Package, ShoppingBag, Sparkles } from 'lucide-react'

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
      fetch('/api/orders', { headers: { Authorization: `Bearer ${t}` } }).then(r=>r.json()),
      fetch('/api/certificates/me', { headers: { Authorization: `Bearer ${t}` } }).then(r=>r.json()),
    ]).then(([o, c]) => {
      setOrders(Array.isArray(o) ? o : [])
      setCerts(Array.isArray(c) ? c : [])
      setLoading(false)
    })
  }, [])

  const totalSpent = orders.reduce((s, o) => s + Number(o.price || 0), 0)

  return (
    <div className="min-h-screen">
      <Nav/>
      <div className="max-w-7xl mx-auto px-6 py-10">
        <Reveal>
          <div className="chip-verified mb-3"><Sparkles size={14}/> Your account</div>
          <h1 className="font-heading text-[38px] font-bold text-[#2C1E21] leading-tight">Welcome, {user?.name?.split(' ')[0] || 'friend'}.</h1>
          <p className="text-[15px] text-[#6E5A5E] mt-2">Your orders and digital certificates — all backed by real transactions on Sepolia.</p>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {[
            { label: 'Orders', value: orders.length, icon: ShoppingBag, color: '#702935' },
            { label: 'Certificates owned', value: certs.length, icon: ShieldCheck, color: '#00897B' },
            { label: 'Total spent', value: `₹${totalSpent.toLocaleString('en-IN')}`, icon: Package, color: '#8B2635' },
          ].map((s, i) => (
            <Reveal key={i} delay={i*0.08}>
              <div className="bg-white rounded-2xl border border-[#E7DDD6] p-5 card-warm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{background: s.color+'15'}}>
                  <s.icon size={20} style={{color: s.color}}/>
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
          <div className="grid md:grid-cols-3 gap-5">{[...Array(3)].map((_,i)=><div key={i} className="bg-white rounded-2xl h-[380px] animate-pulse border border-[#E7DDD6]"/>) }</div>
        ) : certs.length === 0 ? (
          <div className="text-center py-16 text-[#6E5A5E] bg-white rounded-2xl border border-[#E7DDD6]">
            No certificates yet. <Link href="/products" className="text-[#702935] underline">Explore products</Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {certs.map((c, i) => (
              <Reveal key={c.orderId} delay={i*0.05}>
                <div className="bg-white rounded-2xl border border-[#00897B]/25 card-warm overflow-hidden">
                  <div className="aspect-[4/3] bg-[#EFE7DE] overflow-hidden">
                    <img src={c.image} alt={c.name} className="w-full h-full object-cover"/>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="chip-verified"><ShieldCheck size={12}/> Token #{c.tokenId}</span>
                      <span className="text-[11px] text-[#6E5A5E]">{new Date(c.purchasedAt).toLocaleDateString()}</span>
                    </div>
                    <h3 className="font-heading font-bold text-[16px] text-[#2C1E21]">{c.name}</h3>
                    <div className="mt-4 space-y-2 text-[12px]">
                      <div>
                        <div className="uppercase tracking-wider text-[10px] text-[#6E5A5E] mb-0.5">Mint tx</div>
                        <a href={`https://sepolia.etherscan.io/tx/${c.mintTxHash}`} target="_blank" rel="noopener noreferrer" className="hash-mono text-[#702935] hover:underline inline-flex items-center gap-1 break-all">{c.mintTxHash?.slice(0,22)}… <ExternalLink size={11}/></a>
                      </div>
                      {c.transferTxHash && (
                        <div>
                          <div className="uppercase tracking-wider text-[10px] text-[#6E5A5E] mb-0.5">Transfer tx</div>
                          <a href={`https://sepolia.etherscan.io/tx/${c.transferTxHash}`} target="_blank" rel="noopener noreferrer" className="hash-mono text-[#00897B] hover:underline inline-flex items-center gap-1 break-all">{c.transferTxHash?.slice(0,22)}… <ExternalLink size={11}/></a>
                        </div>
                      )}
                      {!c.transferTxHash && <div className="chip-muted text-[10px]">NGO custody — not transferred to a wallet</div>}
                    </div>
                    <Link href={`/verify?token=${c.tokenId}`} className="mt-4 inline-flex items-center gap-1 text-[12px] font-medium text-[#00897B] hover:underline">Open full authenticity report →</Link>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        )}

        {/* ORDERS TABLE */}
        <Reveal delay={0.05}>
          <h2 className="font-heading text-[24px] font-bold text-[#2C1E21] mt-12 mb-4">Order history</h2>
        </Reveal>
        <Reveal>
          <div className="bg-white rounded-2xl border border-[#E7DDD6] overflow-hidden card-warm">
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
                      <img src={o.productImage} className="w-10 h-10 rounded-lg object-cover" alt=""/>
                      <span className="font-medium text-[#2C1E21]">{o.productName}</span>
                    </td>
                    <td className="px-5 py-3">#{o.tokenId}</td>
                    <td className="px-5 py-3 font-heading font-bold">₹{Number(o.price).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3"><span className="chip-verified"><ShieldCheck size={10}/> {o.status}</span></td>
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
      <Footer/>
    </div>
  )
}
export default CustomerDashboard
