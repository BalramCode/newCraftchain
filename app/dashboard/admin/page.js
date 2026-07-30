'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { Reveal, CountUp } from '@/components/Motion'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Package, Users, ShoppingBag, IndianRupee, ExternalLink, ShieldCheck } from 'lucide-react'

const COLORS = ['#702935', '#8B2635', '#00897B', '#B87333', '#6E5A5E']

function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const u = localStorage.getItem('cc_user')
    const t = localStorage.getItem('cc_token')
    if (!u || !t) { router.push('/auth'); return }
    const parsed = JSON.parse(u)
    if (parsed.role !== 'admin') { router.push('/'); return }
    fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${t}` } })
      .then(r=>r.json()).then(d => { if (d.error) setError(d.error); else setStats(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) return <div className="min-h-screen"><Nav/><div className="max-w-7xl mx-auto p-12 text-[#6E5A5E]">Loading admin…</div></div>
  if (error) return <div className="min-h-screen"><Nav/><div className="max-w-7xl mx-auto p-12 text-[#8B2635]">{error}</div></div>

  const kpis = stats.kpis
  const kpiCards = [
    { label: 'Products', value: kpis.productsCount, icon: Package, color: '#702935' },
    { label: 'Users', value: kpis.usersCount, icon: Users, color: '#8B2635' },
    { label: 'Orders', value: kpis.ordersCount, icon: ShoppingBag, color: '#00897B' },
    { label: 'Revenue', value: kpis.revenue, prefix: '₹', icon: IndianRupee, color: '#B87333' },
  ]

  return (
    <div className="min-h-screen">
      <Nav/>
      <div className="max-w-7xl mx-auto px-6 py-10">
        <Reveal>
          <div className="chip-verified mb-3"><ShieldCheck size={14}/> Admin console</div>
          <h1 className="font-heading text-[38px] font-bold text-[#2C1E21] leading-tight">Overview</h1>
          <p className="text-[15px] text-[#6E5A5E] mt-2">Live marketplace metrics with real on-chain data.</p>
        </Reveal>

        {/* KPI row */}
        <div className="grid md:grid-cols-4 gap-4 mt-8">
          {kpiCards.map((k, i) => (
            <Reveal key={k.label} delay={i*0.08}>
              <div className="bg-white rounded-2xl border border-[#E7DDD6] p-5 card-warm">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] uppercase tracking-wider text-[#6E5A5E]">{k.label}</div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background: k.color+'15'}}><k.icon size={16} style={{color: k.color}}/></div>
                </div>
                <div className="font-heading text-[32px] font-bold text-[#2C1E21] mt-3">
                  <CountUp value={k.value} prefix={k.prefix || ''}/>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-3 gap-5 mt-10">
          <Reveal className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-[#E7DDD6] p-6 card-warm h-full">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-heading font-bold text-[16px] text-[#2C1E21]">Revenue · last 14 days</div>
                  <div className="text-[12px] text-[#6E5A5E]">Daily total from confirmed orders</div>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.revenueOverTime}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#702935" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#702935" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E7DDD6"/>
                    <XAxis dataKey="date" stroke="#6E5A5E" fontSize={11}/>
                    <YAxis stroke="#6E5A5E" fontSize={11}/>
                    <Tooltip contentStyle={{ background: 'white', border: '1px solid #E7DDD6', borderRadius: 12, fontSize: 12 }} formatter={(v)=>[`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']}/>
                    <Area type="monotone" dataKey="revenue" stroke="#702935" fillOpacity={1} fill="url(#revGrad)" strokeWidth={2}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="bg-white rounded-2xl border border-[#E7DDD6] p-6 card-warm h-full">
              <div className="font-heading font-bold text-[16px] text-[#2C1E21] mb-4">By category</div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.categories} innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value" nameKey="name">
                      {stats.categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'white', border: '1px solid #E7DDD6', borderRadius: 12, fontSize: 12 }}/>
                    <Legend wrapperStyle={{ fontSize: 11 }}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Products table */}
        <Reveal delay={0.05}>
          <h2 className="font-heading text-[22px] font-bold text-[#2C1E21] mt-12 mb-4">All minted products</h2>
          <div className="bg-white rounded-2xl border border-[#E7DDD6] overflow-hidden card-warm">
            <table className="w-full text-[13px]">
              <thead className="bg-[#F9F6F0] text-[11px] uppercase tracking-wider text-[#6E5A5E]">
                <tr>
                  <th className="text-left px-5 py-3">Token</th>
                  <th className="text-left px-5 py-3">Product</th>
                  <th className="text-left px-5 py-3">Artisan</th>
                  <th className="text-left px-5 py-3">Category</th>
                  <th className="text-left px-5 py-3">Price</th>
                  <th className="text-left px-5 py-3">Mint tx</th>
                </tr>
              </thead>
              <tbody>
                {stats.products.map(p => (
                  <tr key={p.id} className="border-t border-[#E7DDD6]">
                    <td className="px-5 py-3 font-heading font-bold text-[#702935]">#{p.tokenId}</td>
                    <td className="px-5 py-3">
                      <Link href={`/products/${p.id}`} className="flex items-center gap-3 hover:text-[#702935]">
                        <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0"><Image src={p.images?.[0] || 'https://new-craftchain.vercel.app/logo.png'} fill sizes="36px" className="object-cover" alt=""/></div>
                        <span className="font-medium text-[#2C1E21]">{p.name}</span>
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-[#6E5A5E]">{p.artisan?.name || '—'}</td>
                    <td className="px-5 py-3"><span className="chip-muted">{p.category}</span></td>
                    <td className="px-5 py-3 font-heading font-bold">₹{Number(p.price).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3">
                      <a href={`https://sepolia.etherscan.io/tx/${p.mintTxHash}`} target="_blank" rel="noopener noreferrer" className="hash-mono text-[#702935] hover:underline inline-flex items-center gap-1">{p.mintTxHash?.slice(0,14)}… <ExternalLink size={11}/></a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </div>
      <Footer/>
    </div>
  )
}
export default AdminDashboard
