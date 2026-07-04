'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { Search, ShieldCheck, MapPin } from 'lucide-react'

function ProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')

  const load = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (category) params.set('category', category)
    const r = await fetch('/api/products?' + params.toString())
    const d = await r.json()
    setProducts(Array.isArray(d) ? d : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [category])

  const categories = ['All', 'Textiles', 'Pottery', 'Woodcraft', 'Metalcraft', 'Painting']

  return (
    <div className="min-h-screen">
      <Nav/>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="chip-verified mb-3"><ShieldCheck size={14}/> All products on-chain verified</div>
            <h1 className="font-heading text-[42px] font-bold text-[#2C1E21] leading-tight">The Marketplace</h1>
            <p className="text-[15px] text-[#6E5A5E] mt-2">Curated crafts from artisans across India.</p>
          </div>
          <form onSubmit={(e)=>{e.preventDefault(); load()}} className="flex gap-2 w-full md:w-96">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6E5A5E]"/>
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search products..." className="input-heritage pl-9"/>
            </div>
            <button className="btn-cta">Search</button>
          </form>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map(c => (
            <button
              key={c}
              onClick={()=>setCategory(c === 'All' ? '' : c)}
              className={`px-4 py-2 rounded-full text-[13px] font-medium border transition ${
                (category === c || (c==='All' && !category))
                  ? 'bg-[#702935] text-white border-[#702935]'
                  : 'bg-white text-[#2C1E21] border-[#E7DDD6] hover:border-[#702935]'
              }`}
            >{c}</button>
          ))}
        </div>

        {loading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[...Array(6)].map((_,i)=> <div key={i} className="bg-white rounded-2xl h-[420px] animate-pulse border border-[#E7DDD6]"/>) }
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24 text-[#6E5A5E]">
            No products yet. If you’re an NGO, register one from the <Link href="/dashboard/ngo" className="underline text-[#702935]">NGO dashboard</Link>.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(p => (
              <Link key={p.id} href={`/products/${p.id}`} className="group bg-white rounded-2xl border border-[#E7DDD6] card-warm overflow-hidden hover:card-warm-lg transition-shadow">
                <div className="aspect-[4/5] overflow-hidden bg-[#EFE7DE]">
                  <img src={p.images?.[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="chip-muted">{p.category}</span>
                    {p.tokenId != null && <span className="chip-verified"><ShieldCheck size={12}/> Token #{p.tokenId}</span>}
                  </div>
                  <h3 className="font-heading text-[17px] font-bold text-[#2C1E21] leading-snug group-hover:text-[#702935]">{p.name}</h3>
                  {p.artisan && (
                    <div className="mt-1.5 flex items-center gap-1 text-[12px] text-[#6E5A5E]">
                      <MapPin size={12}/> {p.artisan.name} · {p.artisan.district}
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="font-heading font-bold text-[20px] text-[#2C1E21]">₹{Number(p.price).toLocaleString('en-IN')}</div>
                    <span className="text-[13px] text-[#702935] font-medium">View →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Footer/>
    </div>
  )
}
export default ProductsPage
