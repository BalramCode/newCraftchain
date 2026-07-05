'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { Search, ShieldCheck, ArrowRight, Layers, Hammer, Box } from 'lucide-react'

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
    try {
      const r = await fetch('/api/products?' + params.toString())
      const d = await r.json()
      setProducts(Array.isArray(d) ? d : [])
    } catch (error) {
      console.error("Failed fetching products:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [category])

  const categories = ['All', 'Textiles', 'Pottery', 'Woodcraft', 'Metalcraft', 'Painting']

  return (
    <div className="min-h-screen bg-[#FAF8F6] text-[#2C1E21] selection:bg-[#702935]/10">
      <Nav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 mb-8 border-b border-[#E7DDD6]/60">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#00897B]/10 rounded-full text-[12px] font-medium text-[#00897B] mb-3">
              <ShieldCheck size={14} /> All products on-chain verified
            </div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">The Marketplace</h1>
            <p className="text-[14px] text-[#6E5A5E] mt-1">Curated authentic handlooms and crafts directly from artisans across India.</p>
          </div>

          {/* Elegant Search Bar */}
          <form onSubmit={(e) => { e.preventDefault(); load() }} className="flex gap-2 w-full md:w-96">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6E5A5E]" />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search premium handlooms & crafts..."
                className="w-full bg-white border border-[#E7DDD6] rounded-xl pl-9 pr-4 py-2.5 text-[14px] placeholder:text-[#6E5A5E]/50 focus:outline-none focus:border-[#702935] transition-all"
              />
            </div>
            <button className="bg-[#702935] hover:bg-[#59202A] text-white px-5 py-2.5 rounded-xl text-[14px] font-medium transition-colors shadow-sm">
              Search
            </button>
          </form>
        </div>

        {/* Categories Tab Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-10 no-scrollbar">
          <div className="flex items-center gap-1 text-[13px] font-medium text-[#6E5A5E] mr-2 shrink-0">
            <Layers size={14} /> Categories:
          </div>
          {categories.map(c => {
            const isActive = (category === c || (c === 'All' && !category));
            return (
              <button
                key={c}
                onClick={() => setCategory(c === 'All' ? '' : c)}
                className={`px-4 py-1.5 rounded-lg text-[13px] font-medium border transition-all shrink-0 duration-200 ${isActive
                    ? 'bg-[#702935] text-white border-[#702935] shadow-sm'
                    : 'bg-white text-[#2C1E21] border-[#E7DDD6] hover:bg-[#FAF8F6] hover:border-[#702935]'
                  }`}
              >
                {c}
              </button>
            )
          })}
        </div>

        {/* Dynamic Products Area */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-3 border border-[#E7DDD6]/50 space-y-4 animate-pulse">
                <div className="aspect-square bg-[#EFE7DE]/50 rounded-xl w-full" />
                <div className="space-y-2 px-1">
                  <div className="h-4 bg-[#EFE7DE]/50 rounded w-1/3" />
                  <div className="h-5 bg-[#EFE7DE] rounded w-3/4" />
                  <div className="h-4 bg-[#EFE7DE]/50 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-28 bg-white rounded-2xl border border-[#E7DDD6]/50 px-6">
            <p className="text-[#6E5A5E] text-[15px]">No items found matching your current filters.</p>
            <p className="text-[13px] text-[#6E5A5E]/70 mt-1">
              Are you an NGO? Register a collection from the {' '}
              <Link href="/dashboard/ngo" className="underline font-medium text-[#702935] hover:text-[#59202A]">
                NGO Dashboard
              </Link>.
            </p>
          </div>
        ) : (
          /* Responsive Balanced Grid Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map(p => (
              <Link
                key={p.id}
                href={`/products/${p.id}`}
                className="group bg-white rounded-2xl border border-[#E7DDD6]/60 overflow-hidden hover:border-[#702935]/40 hover:shadow-md transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Aspect Square Image Canvas */}
                  <div className="aspect-square overflow-hidden bg-[#FAF8F6] relative border-b border-[#E7DDD6]/30">
                    <img
                      src={p.images?.[0]}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                    />
                    {p.tokenId != null && (
                      <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm border border-[#E7DDD6] text-[#00897B] text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                        <ShieldCheck size={11} /> Token #{p.tokenId}
                      </span>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="pt-4 px-4">
                    {/* Category Header Tag */}
                    <span className="text-[11px] font-semibold text-[#702935] tracking-wider uppercase opacity-80 block mb-1">
                      {p.category}
                    </span>

                    {/* Flex container pushing material & craft details cleanly to the right side */}
<div className="flex justify-between items-start gap-3">
  {/* Left Side: Product Name */}
  <div className="flex-1 min-w-0">
    {/* Added 'capitalize' class to ensure the product name has a capital first letter */}
    <h3 className="font-heading text-[15px] font-bold text-[#2C1E21] tracking-tight leading-snug group-hover:text-[#702935] transition-colors line-clamp-2 capitalize">
      {p.name}
    </h3>
  </div>

  {/* Right Side: Specs Box aligned cleanly to the right margin */}
  <div className="space-y-1 shrink-0 text-right">
    <div className="flex items-center justify-end gap-1 text-[12px] text-[#6E5A5E]">
      <Box size={12} className="text-[#6E5A5E]/60 shrink-0" />
      {/* Added 'capitalize' to the nested span for materials */}
      <span className="text-[#6E5A5E]">Material: <span className="text-[#2C1E21] font-medium capitalize">{p.materials || 'Organic'}</span></span>
    </div>
    <div className="flex items-center justify-end gap-1 text-[12px] text-[#6E5A5E]">
      <Hammer size={12} className="text-[#6E5A5E]/60 shrink-0" />
      {/* Added 'capitalize' to the nested span for craftType */}
      <span className="text-[#6E5A5E]">Craft: <span className="text-[#2C1E21] font-medium capitalize">{p.artisan?.craftType || 'Handloom'}</span></span>
    </div>
  </div>
</div>
                  </div>
                </div>

                {/* Bottom Row Footer */}
                <div className="px-4 pb-4 pt-2 flex items-center justify-between border-t border-[#E7DDD6]/20 bg-[#FAF8F6]/30">
                  <div className="font-heading font-extrabold text-[16px] text-[#2C1E21]">
                    ₹{Number(p.price).toLocaleString('en-IN')}
                  </div>
                  <span className="text-[12px] font-medium text-[#702935] flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    View Details <ArrowRight size={12} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}

export default ProductsPage