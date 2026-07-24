'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { toast } from '@/hooks/use-toast'
import { ShieldCheck, ExternalLink, MapPin, Loader2, ShoppingBag, Check, ArrowRight, Copy, ArrowLeft, Zap, Minus, Plus, ChevronLeft, ChevronRight, X } from 'lucide-react'

function ProductDetail() {
  const { id } = useParams()
  const router = useRouter()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [chain, setChain] = useState(null)
  const [added, setAdded] = useState(false)
  const [copiedField, setCopiedField] = useState(null)
  const [contractInfo, setContractInfo] = useState({ explorer: 'https://sepolia.etherscan.io' })
  const [quantity, setQuantity] = useState(1)
  const [selectedVariants, setSelectedVariants] = useState({})
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!lightboxOpen) return
      if (e.key === 'Escape') setLightboxOpen(false)
      if (e.key === 'ArrowRight') setActiveImageIndex(prev => prev < (product?.images?.length || 1) - 1 ? prev + 1 : 0)
      if (e.key === 'ArrowLeft') setActiveImageIndex(prev => prev > 0 ? prev - 1 : (product?.images?.length || 1) - 1)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxOpen, product])

  useEffect(() => {
    fetch('/api/contract-info').then(r => r.json()).then(setContractInfo).catch(() => { })
    fetch(`/api/products/${id}`).then(r => r.json()).then(p => {
      setProduct(p)
      setLoading(false)
      if (p?.tokenId != null) {
        fetch(`/api/verify/${p.tokenId}`).then(r => r.json()).then(setChain).catch(() => { })
      }
    })
  }, [id])

  const productVariants = Array.isArray(product?.variants) ? product.variants : []
  const isOutOfStock = product?.stock === 0 || product?.inventory === 0 || product?.status === 'sold' || product?.status === 'out-of-stock'
  const hasRequiredVariants = productVariants.every(variant => {
    const name = variant.name || variant.label || variant.type
    return !name || selectedVariants[name]
  })
  const originalPrice = Number(product?.originalPrice || product?.mrp || product?.compareAtPrice || 0)
  const discountedPrice = Number(product?.discountedPrice || product?.salePrice || product?.price || 0)
  const hasDiscount = originalPrice > discountedPrice && discountedPrice > 0
  const discountPercentage = hasDiscount ? Math.round(((originalPrice - discountedPrice) / originalPrice) * 100) : 0
  const purchaseDisabled = isOutOfStock || !hasRequiredVariants

  const getVariantKey = (variants) => JSON.stringify(variants || {})

  const getCartItem = () => ({
    id: product.id,
    name: product.name,
    price: discountedPrice || Number(product.price),
    originalPrice: hasDiscount ? originalPrice : undefined,
    image: product.images?.[0],
    tokenId: product.tokenId,
    variants: selectedVariants,
    quantity,
  })

  const addToCart = ({ redirectToCart = false } = {}) => {
    if (!product) return
    if (purchaseDisabled) {
      toast({
        title: isOutOfStock ? 'Out of stock' : 'Choose your options',
        description: isOutOfStock ? 'This product is not available right now.' : 'Please select the required product variants first.',
      })
      return
    }

    const cart = JSON.parse(localStorage.getItem('cc_cart') || '[]')
    const variantKey = getVariantKey(selectedVariants)
    const existingIndex = cart.findIndex(x => x.id === product.id && getVariantKey(x.variants) === variantKey)
    if (existingIndex >= 0) {
      cart[existingIndex] = {
        ...cart[existingIndex],
        quantity: Number(cart[existingIndex].quantity || 1) + quantity,
      }
    } else {
      cart.push(getCartItem())
    }
    localStorage.setItem('cc_cart', JSON.stringify(cart))
    window.dispatchEvent(new Event('cc_cart_updated'))
    setAdded(true)
    setTimeout(() => setAdded(false), 2500)
    toast({
      title: 'Added to cart',
      description: `${product.name} is ready for checkout.`,
    })
    if (redirectToCart) router.push('/cart')
  }

  const buyNow = () => {
    if (!product) return
    if (purchaseDisabled) {
      toast({
        title: isOutOfStock ? 'Out of stock' : 'Choose your options',
        description: isOutOfStock ? 'This product is not available right now.' : 'Please select the required product variants first.',
      })
      return
    }
    localStorage.setItem('cc_cart', JSON.stringify([getCartItem()]))
    window.dispatchEvent(new Event('cc_cart_updated'))
    router.push('/cart')
  }

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F6] flex flex-col justify-between">
        <Nav />
        <div className="flex-grow flex flex-col items-center justify-center text-[#6E5A5E] gap-3">
          <Loader2 className="animate-spin text-[#702935]" size={28} />
          <p className="text-sm font-medium tracking-wide">Retrieving asset data...</p>
        </div>
        <Footer />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#FAF8F6] flex flex-col justify-between">
        <Nav />
        <div className="flex-grow flex flex-col items-center justify-center text-center py-20 px-4">
          <h2 className="font-heading text-2xl font-bold text-[#2C1E21]">Artifact Not Found</h2>
          <p className="text-sm text-[#6E5A5E] mt-1 mb-6">This item may have been unlisted or moved.</p>
          <Link href="/products" className="inline-flex items-center gap-2 bg-[#702935] text-white text-sm px-5 py-2.5 rounded-xl font-medium">
            <ArrowLeft size={16} /> Return to Marketplace
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  const explorer = contractInfo.explorer || 'https://sepolia.etherscan.io'

  return (
    <div className="min-h-screen bg-[#FAF8F6] text-[#2C1E21] selection:bg-[#702935]/10">
      <Nav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Modern Breadcrumb Navigation */}
        <Link href="/products" className="group inline-flex items-center gap-2 text-[13px] font-medium text-[#6E5A5E] hover:text-[#702935] transition-colors mb-8">
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" /> Back to Marketplace
        </Link>

        {/* Core Detail Grid Framework */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-16 items-start">

          {/* Left Canvas Element (Sticky Gallery Layout) */}
          <div className="lg:col-span-6 space-y-4 lg:sticky lg:top-24">
              
              {/* DESKTOP GALLERY (Hidden on Mobile) */}
              <div className="hidden sm:block space-y-4">
                <div 
                  className="aspect-[4/3] md:aspect-square max-h-[640px] w-full rounded-2xl overflow-hidden bg-white border border-[#E7DDD6]/60 shadow-sm relative cursor-zoom-in group"
                  onClick={() => setLightboxOpen(true)}
                >
                  <img
                    src={product.images?.[activeImageIndex] || product.images?.[0]}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {product.tokenId != null && (
                    <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-[#E7DDD6] flex items-center gap-2 shadow-sm pointer-events-none">
                      <span className="w-2 h-2 rounded-full bg-[#00897B] animate-pulse" />
                      <span className="text-[11px] font-bold tracking-wider text-[#2C1E21] uppercase">On-Chain Registered</span>
                    </div>
                  )}
                </div>
                
                {/* Thumbnails */}
                {product.images?.length > 1 && (
                  <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
                    {product.images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImageIndex(idx)}
                        className={`relative w-20 h-20 rounded-xl overflow-hidden shrink-0 transition-all duration-200 border-2 ${activeImageIndex === idx ? 'border-[#702935] shadow-md opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`}
                      >
                        <img src={img} alt={`Thumbnail ${idx+1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* MOBILE CAROUSEL (Hidden on Desktop) */}
              <div className="sm:hidden relative w-full rounded-2xl overflow-hidden bg-white border border-[#E7DDD6]/60 shadow-sm">
                 <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar" onScroll={(e) => {
                   const scrollLeft = e.currentTarget.scrollLeft;
                   const width = e.currentTarget.clientWidth;
                   const index = Math.round(scrollLeft / width);
                   setActiveImageIndex(index);
                 }}>
                   {product.images?.map((img, idx) => (
                     <div key={idx} className="w-full shrink-0 snap-center aspect-square relative" onClick={() => setLightboxOpen(true)}>
                       <img src={img} alt={`${product.name} ${idx+1}`} className="w-full h-full object-cover" />
                       
                       {product.tokenId != null && idx === 0 && (
                          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-[#E7DDD6] flex items-center gap-2 shadow-sm pointer-events-none">
                            <span className="w-2 h-2 rounded-full bg-[#00897B] animate-pulse" />
                            <span className="text-[11px] font-bold tracking-wider text-[#2C1E21] uppercase">On-Chain</span>
                          </div>
                        )}
                     </div>
                   ))}
                 </div>
                 
                 {/* Mobile Carousel Indicators */}
                 {product.images?.length > 1 && (
                   <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full pointer-events-none">
                     {product.images.map((_, idx) => (
                       <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all ${activeImageIndex === idx ? 'bg-white w-3' : 'bg-white/60'}`} />
                     ))}
                   </div>
                 )}
              </div>
          </div>

          {/* Right Information Framework */}
          <div className="lg:col-span-6 space-y-8">
            <div>
              <span className="inline-block text-[11px] font-bold tracking-wider text-[#702935] uppercase bg-[#702935]/5 px-2.5 py-1 rounded-md mb-3">
                {product.category}
              </span>
              <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-[#2C1E21] leading-tight capitalize">
                {product.name}
              </h1>

              {product.artisan && (
                <div className="mt-3 flex items-center gap-2 text-[14px] text-[#6E5A5E]">
                  <div className="w-7 h-7 rounded-full bg-[#E7DDD6]/40 flex items-center justify-center text-[#702935]">
                    <MapPin size={14} />
                  </div>
                  <span className="capitalize">{product.artisan.name} &middot; <span className="text-[#6E5A5E]/80 normal-case">{product.artisan.village}, {product.artisan.district}</span></span>
                </div>
              )}
            </div>

            {/* Purchase Section */}
            <div className="bg-white border border-[#E7DDD6]/60 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#6E5A5E] font-semibold">
                    Price
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2.5">
                    {/* Dynamic Current Selling Price */}
                    <span className="font-heading text-2xl sm:text-3xl font-bold text-[#2C1E21]">
                      ₹{discountedPrice.toLocaleString('en-IN')}
                    </span>

                    {hasDiscount && (
                      <>
                        {/* Dynamic Original Price with Strike-through */}
                        <span className="text-sm font-medium text-[#9C8A8E] line-through">
                          ₹{originalPrice.toLocaleString('en-IN')}
                        </span>

                        {/* Dynamic Discount Badge */}
                        <span className="rounded bg-[#E3F2FD] px-2 py-0.5 text-[11px] font-bold text-[#00BFA5]">
                          {discountPercentage}% off
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {isOutOfStock ? (
                  <span className="rounded-full bg-[#8B2635]/10 px-3 py-1.5 text-[12px] font-bold uppercase tracking-wide text-[#8B2635]">
                    Out of Stock
                  </span>
                ) : (
                  <div className="flex items-center rounded-xl border border-[#E7DDD6] bg-[#FAF8F6] p-1">
                    <button
                      type="button"
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-[#6E5A5E] transition hover:bg-white hover:text-[#702935]"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={15} />
                    </button>
                    <span className="min-w-9 text-center font-heading text-[15px] font-bold text-[#2C1E21]">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(q => q + 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-[#6E5A5E] transition hover:bg-white hover:text-[#702935]"
                      aria-label="Increase quantity"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                )}
              </div>

              {productVariants.length > 0 && (
                <div className="space-y-4 border-t border-[#E7DDD6]/60 pt-4">
                  {productVariants.map((variant) => {
                    const name = variant.name || variant.label || variant.type
                    const options = variant.options || variant.values || []
                    if (!name || options.length === 0) return null
                    return (
                      <div key={name}>
                        <div className="mb-2 text-[12px] font-bold uppercase tracking-wider text-[#6E5A5E]">{name}</div>
                        <div className="flex flex-wrap gap-2">
                          {options.map(option => {
                            const value = typeof option === 'string' ? option : option.value || option.name
                            const selected = selectedVariants[name] === value
                            return (
                              <button
                                key={value}
                                type="button"
                                onClick={() => setSelectedVariants(prev => ({ ...prev, [name]: value }))}
                                className={`min-h-11 rounded-xl border px-4 text-[13px] font-semibold transition ${selected
                                  ? 'border-[#702935] bg-[#702935] text-white'
                                  : 'border-[#E7DDD6] bg-[#FAF8F6] text-[#2C1E21] hover:border-[#702935]'
                                  }`}
                              >
                                {value}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {!hasRequiredVariants && !isOutOfStock && (
                <div className="rounded-xl border border-[#E7DDD6] bg-[#FAF8F6] px-3 py-2 text-[13px] font-medium text-[#6E5A5E]">
                  Select all available options to continue.
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => addToCart()}
                  disabled={purchaseDisabled}
                  className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-bold transition-all shadow-sm disabled:cursor-not-allowed disabled:opacity-55 ${added ? 'bg-[#00897B] text-white' : 'bg-[#702935] text-white hover:bg-[#59202A] hover:-translate-y-0.5'
                    }`}
                >
                  {added ? <><Check size={18} /> Added to Cart</> : <><ShoppingBag size={18} /> Add to Cart</>}
                </button>
                <button
                  type="button"
                  onClick={buyNow}
                  disabled={purchaseDisabled}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#702935] bg-white px-5 py-3.5 text-[15px] font-bold text-[#702935] transition-all hover:-translate-y-0.5 hover:bg-[#702935]/5 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <Zap size={18} /> Buy Now
                </button>
              </div>
            </div>

            <div className="hidden" aria-hidden="true">
              {/* Price Area */}
              <div className="bg-white border border-[#E7DDD6]/60 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-[#6E5A5E] font-medium">Price Valuation</p>
                  <div className="font-heading text-3xl font-black text-[#2C1E21] mt-0.5">
                    ₹{Number(product.price).toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="flex sm:items-center gap-2.5">
                  <button
                    onClick={addToCart}
                    className={`px-6 py-3.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm ${added
                      ? 'bg-[#00897B] text-white'
                      : 'bg-[#702935] text-white hover:bg-[#59202A]'
                      }`}
                  >
                    {added ? <><Check size={16} /> Added to Bag</> : <><ShoppingBag size={16} /> Secure Artifact</>}
                  </button>
                  <Link href="/cart" className="border border-[#E7DDD6] bg-white text-[#2C1E21] hover:border-[#702935] px-4 py-3.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5">
                    Bag <ArrowRight size={15} />
                  </Link>
                </div>
              </div>

            </div>

            {/* Unified Product Metadata Specifications Panel */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold tracking-tight text-[#702935] uppercase border-b border-[#E7DDD6]/60 pb-2">
                Specifications
              </h3>

              <div className="bg-white border border-[#E7DDD6]/50 rounded-xl divide-y divide-[#E7DDD6]/40 overflow-hidden text-sm shadow-sm">
                <div className="grid grid-cols-3 p-3.5">
                  <span className="text-[#6E5A5E] font-medium">Materials Used</span>
                  <span className="col-span-2 text-[#2C1E21] font-medium capitalize">{product.materials || 'Natural materials'}</span>
                </div>
                {product.artisan?.craftType && (
                  <div className="grid grid-cols-3 p-3.5">
                    <span className="text-[#6E5A5E] font-medium">Craft Lineage</span>
                    <span className="col-span-2 text-[#2C1E21] font-medium capitalize">{product.artisan.craftType}</span>
                  </div>
                )}
                <div className="grid grid-cols-3 p-3.5">
                  <span className="text-[#6E5A5E] font-medium">Registry Status</span>
                  <span className="col-span-2 text-[#00897B] font-semibold flex items-center gap-1">
                    <ShieldCheck size={14} /> Valid ERC-721 Token
                  </span>
                </div>
              </div>
            </div>

            {/* Product Description Section */}
            {product.description && (
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-semibold tracking-tight text-[#702935] uppercase border-b border-[#E7DDD6]/60 pb-2">
                  Product Description
                </h3>
                <p className="whitespace-pre-line text-[15px] text-[#6E5A5E] leading-relaxed font-normal first-letter:uppercase">
                  {product.description}
                </p>
              </div>
            )}

            {/* Premium Immutable Blockchain Ledger Record Component */}
            <div className="rounded-2xl border border-[#00897B]/20 bg-gradient-to-br from-white to-[#FAF8F6] p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#00897B]/5 rounded-bl-full pointer-events-none" />

              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-[#E7DDD6]/60 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#00897B]/10 flex items-center justify-center text-[#00897B]">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-[15px] text-[#2C1E21]">Provenance Record</h4>
                    <p className="text-[11px] text-[#6E5A5E]">Cryptographically Sealed Ledger</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-[#00897B]/10 text-[#00897B] text-[11px] font-bold uppercase tracking-wider">
                  Sepolia Network
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs relative z-10">
                <div>
                  <span className="text-[#6E5A5E] block font-medium mb-0.5">Global Token Index</span>
                  <span className="font-heading font-black text-xl text-[#2C1E21]">#{product.tokenId}</span>
                </div>

                <div>
                  <span className="text-[#6E5A5E] block font-medium mb-1">Contract Architecture</span>
                  <div className="flex items-center gap-2 bg-[#FAF8F6] border border-[#E7DDD6]/60 rounded-lg p-2 font-mono text-[11px] text-[#2C1E21]">
                    <span className="truncate max-w-[140px]">{product.contractAddress}</span>
                    <button
                      onClick={() => copyToClipboard(product.contractAddress, 'contract')}
                      className="ml-auto text-[#6E5A5E] hover:text-[#702935] p-0.5"
                    >
                      {copiedField === 'contract' ? <Check size={12} className="text-[#00897B]" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-[#6E5A5E] block font-medium mb-1">Genesis Mint Transaction ID</span>
                  <div className="flex items-center gap-2 bg-[#FAF8F6] border border-[#E7DDD6]/60 rounded-lg p-2 font-mono text-[11px]">
                    <a
                      href={`${explorer}/tx/${product.mintTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#702935] hover:underline truncate max-w-[280px] sm:max-w-md inline-flex items-center gap-1"
                    >
                      {product.mintTxHash} <ExternalLink size={10} className="shrink-0" />
                    </a>
                    <button
                      onClick={() => copyToClipboard(product.mintTxHash, 'mint')}
                      className="ml-auto text-[#6E5A5E] hover:text-[#702935] p-0.5"
                    >
                      {copiedField === 'mint' ? <Check size={12} className="text-[#00897B]" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>

                {chain && chain.authentic && (
                  <>
                    <div className="sm:col-span-2">
                      <span className="text-[#6E5A5E] block font-medium mb-1">Current Active Custodian Address</span>
                      <div className="flex items-center gap-2 bg-[#FAF8F6] border border-[#E7DDD6]/60 rounded-lg p-2 font-mono text-[11px]">
                        <a
                          href={`${explorer}/address/${chain.currentOwner}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#702935] hover:underline truncate max-w-[280px] sm:max-w-md inline-flex items-center gap-1"
                        >
                          {chain.currentOwner} <ExternalLink size={10} className="shrink-0" />
                        </a>
                      </div>
                    </div>
                    <div>
                      <span className="text-[#6E5A5E] block font-medium">Timestamp Record</span>
                      <span className="text-[#2C1E21] font-semibold mt-0.5 block">{new Date(chain.mintDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-[#E7DDD6]/40 flex justify-end relative z-10">
                <Link
                  href={`/verify?token=${product.tokenId}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00897B] bg-[#00897B]/5 hover:bg-[#00897B]/10 px-3 py-2 rounded-xl transition-colors"
                >
                  Inspect Public Ledger Audit <ArrowRight size={13} />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>

      <Footer />

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 text-white relative z-10">
            <div className="text-sm font-medium opacity-70">
              {activeImageIndex + 1} / {product.images?.length}
            </div>
            <button 
              onClick={() => setLightboxOpen(false)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          
          {/* Main Image View */}
          <div className="flex-1 relative flex items-center justify-center p-2 sm:p-10">
            {product.images?.length > 1 && (
              <button 
                onClick={(e) => { e.stopPropagation(); setActiveImageIndex(prev => prev > 0 ? prev - 1 : product.images.length - 1) }}
                className="absolute left-4 sm:left-10 p-3 sm:p-4 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors z-10"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            <img 
              src={product.images?.[activeImageIndex]} 
              className="max-w-full max-h-full object-contain"
              alt="Fullscreen view"
            />
            
            {product.images?.length > 1 && (
              <button 
                onClick={(e) => { e.stopPropagation(); setActiveImageIndex(prev => prev < product.images.length - 1 ? prev + 1 : 0) }}
                className="absolute right-4 sm:right-10 p-3 sm:p-4 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors z-10"
              >
                <ChevronRight size={24} />
              </button>
            )}
          </div>
          
          {/* Bottom Thumbnails */}
          {product.images?.length > 1 && (
            <div className="p-4 sm:p-6 flex justify-center pb-8">
              <div className="flex items-center gap-2 overflow-x-auto max-w-full no-scrollbar px-4">
                {product.images?.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-lg overflow-hidden transition-all border-2 ${activeImageIndex === idx ? 'border-white opacity-100' : 'border-transparent opacity-40 hover:opacity-100'}`}
                  >
                    <img src={img} alt={`Thumbnail ${idx+1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ProductDetail
