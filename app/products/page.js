'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import Image from 'next/image'
import { Search, Heart, ShieldCheck, ArrowRight, Layers, Hammer, Box, ShoppingCart } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

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

  const addToCart = (e, p) => {
    e.preventDefault();
    const cart = JSON.parse(localStorage.getItem('cc_cart') || '[]');
    const existing = cart.find(x => x.id === p.id);
    if (existing) {
      toast({
        title: "Already in cart",
        description: `${p.name} is already in your cart.`,
      });
    } else {
      cart.push({ ...p, quantity: 1, image: p.images?.[0] });
      localStorage.setItem('cc_cart', JSON.stringify(cart));
      window.dispatchEvent(new Event('cc_cart_updated'));
      toast({
        title: "Added to Cart",
        description: `${p.name} has been added to your cart.`,
      });
    }
  };

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
          <form onSubmit={(e) => { e.preventDefault(); load() }} className="flex flex-col sm:flex-row gap-2 w-full md:w-96">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6E5A5E]" />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search premium handlooms & crafts..."
                className="w-full bg-white border border-[#E7DDD6] rounded-xl pl-9 pr-4 py-2.5 text-[14px] placeholder:text-[#6E5A5E]/50 focus:outline-none focus:border-[#702935] transition-all"
              />
            </div>
            <button className="bg-[#702935] hover:bg-[#59202A] text-white px-5 py-2.5 rounded-xl text-[14px] font-medium transition-colors shadow-sm min-h-[44px]">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {products.map((p) => (
              <Link
                key={p.id}
                href={`/products/${p.id}`}
                className="group bg-white rounded-xl border border-[#E7DDD6]/70 overflow-hidden hover:border-[#702935]/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between relative"
              >
                <div>
                  {/* Compact Image Container */}
                  <div className="aspect-[4/3] sm:aspect-square overflow-hidden bg-[#FAF8F6] relative border-b border-[#E7DDD6]/30">
                    <Image
                      src={p.images?.[0] || 'https://new-craftchain.vercel.app/logo.png'}
                      alt={p.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Token Tag - Compact */}
                    {p.tokenId != null && (
                      <span className="absolute top-1.5 left-1.5 bg-white/90 backdrop-blur-sm border border-[#E7DDD6] text-[#00897B] text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-xs">
                        <ShieldCheck size={10} /> #{p.tokenId}
                      </span>
                    )}

                    {/* Interactive Add to Cart Button (Flipkart style) */}
                    <button
                      type="button"
                      onClick={(e) => addToCart(e, p)}
                      className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-white/80 backdrop-blur-xs text-[#6E5A5E] hover:text-[#702935] hover:bg-white transition-all shadow-xs active:scale-95"
                      aria-label="Add to Cart"
                    >
                      <ShoppingCart size={13} />
                    </button>
                  </div>

                  {/* Content Body */}
                  <div className="p-2.5">
                    {/* Category */}
                    {/* <span className="text-[9px] font-bold text-[#702935] tracking-wider uppercase opacity-80 block mb-0.5 truncate">
                      {p.category}
                    </span> */}

                    {/* Product Name */}
                    <h3 className="font-heading text-xs font-semibold text-[#2C1E21] leading-tight group-hover:text-[#702935] transition-colors line-clamp-1 capitalize mb-1.5">
                      {p.name}
                    </h3>

                    {/* Inline Micro Specs (Saves vertical space) */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-[#6E5A5E] mb-1">
                      <span className="flex items-center gap-0.5 truncate max-w-[50%]">
                        <Box size={10} className="shrink-0 opacity-60" />
                        <span className="truncate capitalize">{p.materials || 'Organic'}</span>
                      </span>
                      <span className="flex items-center gap-0.5 truncate max-w-[50%]">
                        <Hammer size={10} className="shrink-0 opacity-60" />
                        <span className="truncate capitalize">{p.artisan?.craftType || 'Handloom'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Compact Price & Action Footer */}
                <div className="px-2.5 pb-2.5 pt-1.5 flex items-center justify-between border-t border-[#E7DDD6]/30 bg-[#FAF8F6]/40 mt-auto">
                  <div>
                    <div className="font-heading font-extrabold text-sm text-[#2C1E21] leading-none">
                      ₹{Number(p.price).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <span className="text-[11px] font-semibold text-[#702935] flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    View <ArrowRight size={11} />
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