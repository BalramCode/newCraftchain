'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { ShieldCheck, ExternalLink, MapPin, Loader2, ShoppingBag, Check, ArrowRight } from 'lucide-react'

function ProductDetail() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [chain, setChain] = useState(null)
  const [added, setAdded] = useState(false)
  const [contractInfo, setContractInfo] = useState({ explorer: 'https://sepolia.etherscan.io' })

  useEffect(() => {
    fetch('/api/contract-info').then(r=>r.json()).then(setContractInfo).catch(()=>{})
    fetch(`/api/products/${id}`).then(r=>r.json()).then(p => {
      setProduct(p); setLoading(false)
      if (p?.tokenId != null) {
        fetch(`/api/verify/${p.tokenId}`).then(r=>r.json()).then(setChain).catch(()=>{})
      }
    })
  }, [id])

  const addToCart = () => {
    if (!product) return
    const cart = JSON.parse(localStorage.getItem('cc_cart') || '[]')
    if (!cart.find(x => x.id === product.id)) {
      cart.push({ id: product.id, name: product.name, price: product.price, image: product.images?.[0], tokenId: product.tokenId })
      localStorage.setItem('cc_cart', JSON.stringify(cart))
      window.dispatchEvent(new Event('cc_cart_updated'))
    }
    setAdded(true); setTimeout(()=>setAdded(false), 2500)
  }

  if (loading) return <div className="min-h-screen"><Nav/><div className="max-w-7xl mx-auto p-12 text-[#6E5A5E]">Loading…</div></div>
  if (!product) return <div className="min-h-screen"><Nav/><div className="max-w-7xl mx-auto p-12">Not found</div></div>

  const explorer = contractInfo.explorer || 'https://sepolia.etherscan.io'

  return (
    <div className="min-h-screen">
      <Nav/>
      <div className="max-w-7xl mx-auto px-6 py-10">
        <Link href="/products" className="text-[13px] text-[#6E5A5E] hover:text-[#702935]">← Back to marketplace</Link>
        <div className="grid md:grid-cols-2 gap-10 mt-6">
          {/* Gallery */}
          <div>
            <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-[#EFE7DE] card-warm">
              <img src={product.images?.[0]} alt={product.name} className="w-full h-full object-cover"/>
            </div>
          </div>
          {/* Info */}
          <div>
            <span className="chip-muted">{product.category}</span>
            <h1 className="font-heading text-[38px] font-bold text-[#2C1E21] leading-tight mt-3">{product.name}</h1>
            {product.artisan && (
              <div className="mt-2 flex items-center gap-1.5 text-[14px] text-[#6E5A5E]">
                <MapPin size={14}/> {product.artisan.name} · {product.artisan.village}, {product.artisan.district}
              </div>
            )}
            <div className="mt-6 font-heading text-[36px] font-bold text-[#2C1E21]">₹{Number(product.price).toLocaleString('en-IN')}</div>
            <p className="mt-4 text-[15px] text-[#6E5A5E] leading-relaxed">{product.description}</p>

            <div className="mt-6 space-y-2 text-[14px]">
              <div className="flex gap-2"><span className="text-[#6E5A5E] w-24">Materials</span><span className="text-[#2C1E21]">{product.materials}</span></div>
              {product.artisan?.craftType && <div className="flex gap-2"><span className="text-[#6E5A5E] w-24">Craft</span><span className="text-[#2C1E21]">{product.artisan.craftType}</span></div>}
            </div>

            <div className="mt-8 flex gap-3">
              <button onClick={addToCart} className="btn-cta flex-1 justify-center">
                {added ? <><Check size={18}/> Added</> : <><ShoppingBag size={18}/> Add to Cart</>}
              </button>
              <Link href="/cart" className="btn-outline">View cart <ArrowRight size={16}/></Link>
            </div>

            {/* Blockchain Certificate Card */}
            <div className="mt-8 rounded-2xl border border-[#00897B]/25 bg-gradient-to-br from-[#00897B]/5 to-transparent p-6">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck size={20} className="text-[#00897B]"/>
                <span className="font-heading font-bold text-[16px] text-[#2C1E21]">Blockchain Certificate</span>
                <span className="chip-verified text-[10px] ml-auto">Sepolia · Live</span>
              </div>
              <div className="space-y-3 text-[13px]">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-[#6E5A5E] mb-1">Token ID</div>
                  <div className="font-heading font-bold text-[#2C1E21] text-[18px]">#{product.tokenId}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-[#6E5A5E] mb-1">Contract</div>
                  <div className="hash-mono">{product.contractAddress}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-[#6E5A5E] mb-1">Mint transaction</div>
                  <a href={`${explorer}/tx/${product.mintTxHash}`} target="_blank" rel="noopener noreferrer" className="hash-mono text-[#702935] hover:underline inline-flex items-center gap-1 break-all">
                    {product.mintTxHash} <ExternalLink size={12}/>
                  </a>
                </div>
                {chain && chain.authentic && (
                  <>
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-[#6E5A5E] mb-1">Current owner (live from chain)</div>
                      <a href={`${explorer}/address/${chain.currentOwner}`} target="_blank" rel="noopener noreferrer" className="hash-mono text-[#702935] hover:underline inline-flex items-center gap-1">
                        {chain.currentOwner} <ExternalLink size={12}/>
                      </a>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-[#6E5A5E] mb-1">Minted at</div>
                      <div className="text-[#2C1E21]">{new Date(chain.mintDate).toLocaleString()}</div>
                    </div>
                  </>
                )}
              </div>
              <Link href={`/verify?token=${product.tokenId}`} className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#00897B] hover:underline">Open full authenticity report →</Link>
            </div>
          </div>
        </div>
      </div>
      <Footer/>
    </div>
  )
}
export default ProductDetail
