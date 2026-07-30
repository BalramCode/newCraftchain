'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { ShieldAlert, ShieldCheck, ExternalLink, MapPin, Copy, ChevronDown, CheckCircle2, Factory, ScrollText, Network, Check, Link2, Info as InfoIcon, Package } from 'lucide-react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from '@/hooks/use-toast'

// --- Reusable Components ---

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast({
      title: "Copied to clipboard",
      description: `${label} has been copied.`,
    })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button 
      onClick={handleCopy}
      className="p-2 -mr-2 text-[#9C8A8E] hover:text-[#702935] hover:bg-[#702935]/5 rounded-full transition-colors active:scale-95"
      aria-label={`Copy ${label}`}
    >
      {copied ? <Check size={16} className="text-[#00897B]" /> : <Copy size={16} />}
    </button>
  )
}

function ExpandableSection({ title, icon: Icon, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border border-[#E7DDD6] rounded-2xl bg-white overflow-hidden shadow-sm">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between bg-white hover:bg-[#FAF8F6] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#F9F6F0] flex items-center justify-center text-[#702935]">
            <Icon size={16} />
          </div>
          <span className="font-heading font-bold text-[16px] text-[#2C1E21]">{title}</span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="text-[#9C8A8E]"
        >
          <ChevronDown size={20} />
        </motion.div>
      </button>
      
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="px-5 pb-5 border-t border-[#E7DDD6]/50">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ImageCarousel({ images, productName }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  // Basic swipe handling
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)

  const minSwipeDistance = 50

  const onTouchStart = (e) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX)

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      setCurrentIndex((prev) => (prev + 1 < images.length ? prev + 1 : prev))
    }
    if (isRightSwipe) {
      setCurrentIndex((prev) => (prev - 1 >= 0 ? prev - 1 : prev))
    }
  }

  if (!images || images.length === 0) return null

  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-[#EFE7DE] shadow-sm mb-6 aspect-square max-h-[500px]">
      <motion.div 
        className="flex h-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {images.map((img, idx) => (
          <div key={idx} className="w-full h-full shrink-0 relative">
             <Image src={img} alt={`${productName} - Image ${idx + 1}`} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" priority={idx === 0} />
          </div>
        ))}
      </motion.div>
      
      {/* Pagination Dots */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
          {images.map((_, idx) => (
            <div 
              key={idx} 
              className={`h-2 rounded-full transition-all duration-300 ${currentIndex === idx ? 'w-6 bg-white' : 'w-2 bg-white/50'}`} 
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DataRow({ label, value, copyable = false, copyText, href }) {
  if (!value) return null
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 py-3 border-b border-[#E7DDD6]/50 last:border-0 last:pb-0 pt-3 first:pt-4">
      <div className="text-[12px] uppercase tracking-wider font-semibold text-[#9C8A8E] sm:w-1/3 shrink-0">
        {label}
      </div>
      <div className="flex items-center justify-between w-full">
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="font-mono text-[13px] text-[#702935] hover:underline flex items-center gap-1.5 break-all">
            {value} <ExternalLink size={12} className="shrink-0" />
          </a>
        ) : (
          <div className={`text-[14px] text-[#2C1E21] font-medium ${copyable ? 'font-mono text-[13px] break-all pr-2' : ''}`}>
            {value}
          </div>
        )}
        {copyable && <CopyButton text={copyText || value} label={label} />}
      </div>
    </div>
  )
}

function SkeletonLoader() {
  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8 animate-pulse">
      <div className="h-40 bg-[#E7DDD6]/50 rounded-3xl mb-6 w-full"></div>
      <div className="aspect-square bg-[#E7DDD6]/50 rounded-3xl mb-6 w-full"></div>
      <div className="h-10 bg-[#E7DDD6]/50 rounded-lg w-3/4 mb-4"></div>
      <div className="h-6 bg-[#E7DDD6]/50 rounded-lg w-1/2 mb-8"></div>
      
      <div className="space-y-4">
        <div className="h-16 bg-[#E7DDD6]/50 rounded-2xl w-full"></div>
        <div className="h-16 bg-[#E7DDD6]/50 rounded-2xl w-full"></div>
      </div>
    </div>
  )
}

// --- Main Page Component ---

export default function ProductVerificationPage() {
  const params = useParams()
  const productId = Array.isArray(params.productId) ? params.productId[0] : params.productId
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!productId) return
    const verify = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/products/verify/${encodeURIComponent(productId)}`)
        const data = await response.json()
        setResult(response.ok ? data : { authentic: false, authenticityStatus: 'verification_failed', reason: data.error || 'Verification Failed' })
      } catch (_) {
        setResult({ authentic: false, authenticityStatus: 'verification_failed', reason: 'Verification Failed. Please check your connection and try again.' })
      } finally {
        setLoading(false)
      }
    }
    verify()
  }, [productId])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F6]">
        <Nav />
        <SkeletonLoader />
        <Footer />
      </div>
    )
  }

  const { product, blockchain, authentic, authenticityStatus, reason } = result
  
  const isAuthentic = authentic
  const statusColor = isAuthentic ? '#00897B' : '#8B2635'
  const statusBg = isAuthentic ? 'bg-[#00897B]' : 'bg-[#8B2635]'
  const statusLightBg = isAuthentic ? 'bg-[#00897B]/10' : 'bg-[#8B2635]/10'
  const title = isAuthentic ? 'Authentic Product' : authenticityStatus === 'not_found' ? 'Product Not Found' : authenticityStatus === 'revoked' ? 'Product Revoked' : 'Verification Failed'
  const subtitle = isAuthentic ? 'Verified by CraftChain on Ethereum Sepolia.' : reason || 'This NFC tag does not resolve to a valid authentic product.'

  return (
    <div className="min-h-screen bg-[#FAF8F6]">
      <Nav />
      
      <main className="w-full max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-24">
        
        {/* 1. Verification Status (Hero Banner) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`w-full rounded-3xl p-6 sm:p-8 mb-6 relative overflow-hidden text-white shadow-lg ${statusBg}`}
        >
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-xl translate-y-1/3 -translate-x-1/4 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-white shadow-md ${isAuthentic ? 'text-[#00897B]' : 'text-[#8B2635]'}`}>
              {isAuthentic ? (
                <ShieldCheck size={32} className="drop-shadow-sm" />
              ) : (
                <ShieldAlert size={32} className="drop-shadow-sm" />
              )}
            </div>
            
            <h1 className="font-heading text-[28px] sm:text-[32px] font-bold leading-tight mb-2 tracking-tight">
              {title}
            </h1>
            <p className="text-white/90 text-[15px] max-w-[280px] mx-auto leading-relaxed">
              {subtitle}
            </p>

            {isAuthentic && (
              <div className="mt-5 flex items-center gap-2 bg-black/15 backdrop-blur-sm px-4 py-2 rounded-full">
                <CheckCircle2 size={14} className="text-white/90" />
                <span className="text-[12px] font-bold uppercase tracking-wider text-white/90">Blockchain Verified</span>
              </div>
            )}
          </div>
        </motion.div>

        {isAuthentic && product && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            className="space-y-6"
          >
            {/* 2. Product Images */}
            <ImageCarousel images={product.images} productName={product.name} />

            {/* 3, 4, 5. Product Name, Artisan, Description */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#E7DDD6]">
              <div className="inline-block px-3 py-1 bg-[#F9F6F0] text-[#702935] text-[11px] font-bold uppercase tracking-wider rounded-lg mb-3">
                {product.category}
              </div>
              <h2 className="font-heading text-[28px] sm:text-[32px] font-bold text-[#2C1E21] leading-tight mb-4">
                {product.name}
              </h2>

              <div className="flex items-center gap-3 text-[14px] text-[#6E5A5E] mb-6 p-4 rounded-2xl bg-[#FAF8F6] border border-[#E7DDD6]/50">
                <div className="w-10 h-10 rounded-full bg-[#EFE7DE] flex items-center justify-center shrink-0 text-[#702935]">
                  <Factory size={18} />
                </div>
                <div>
                  <div className="font-semibold text-[#2C1E21]">{product.artisan?.name || product.cooperativeName}</div>
                  <div className="text-[13px] flex items-center gap-1 mt-0.5">
                    <MapPin size={12} /> {product.artisan?.village || 'India'}
                    {product.artisan?.district ? `, ${product.artisan.district}` : ''}
                  </div>
                </div>
              </div>

              {product.description && (
                <div className="text-[15px] text-[#6E5A5E] leading-relaxed mb-6">
                  {product.description}
                </div>
              )}
            </div>

            {/* 6, 7. NFT Certificate & Blockchain Details */}
            {blockchain && (
              <ExpandableSection title="NFT Certificate" icon={ScrollText} defaultOpen={true}>
                <DataRow 
                  label="Status" 
                  value={blockchain.verified ? 'Verified on Ethereum' : 'Unverified'} 
                />
                <DataRow 
                  label="Network" 
                  value="Ethereum Sepolia" 
                />
                <DataRow 
                  label="Token ID" 
                  value={blockchain.tokenId != null ? `#${blockchain.tokenId}` : null} 
                  copyable={true}
                  copyText={blockchain.tokenId?.toString()}
                />
                <DataRow 
                  label="Contract" 
                  value={blockchain.contractAddress ? `${blockchain.contractAddress.slice(0,6)}...${blockchain.contractAddress.slice(-4)}` : null} 
                  copyable={true}
                  copyText={blockchain.contractAddress}
                  href={blockchain.explorerUrl ? blockchain.explorerUrl.replace(/\/tx\/.*/, `/address/${blockchain.contractAddress}`) : null}
                />
                <DataRow 
                  label="Tx Hash" 
                  value={blockchain.explorerUrl ? 'View Transaction' : null} 
                  href={blockchain.explorerUrl}
                />
              </ExpandableSection>
            )}

            {/* 8. Ownership Information */}
            {blockchain?.currentOwner && (
              <ExpandableSection title="Ownership Record" icon={Link2}>
                <DataRow 
                  label="Current Owner" 
                  value={`${blockchain.currentOwner.slice(0,8)}...${blockchain.currentOwner.slice(-6)}`} 
                  copyable={true}
                  copyText={blockchain.currentOwner}
                  href={`https://sepolia.etherscan.io/address/${blockchain.currentOwner}`}
                />
                <DataRow 
                  label="Asset Status" 
                  value="Owned (Transferable)" 
                />
              </ExpandableSection>
            )}

            {/* 9. Product Metadata */}
            <ExpandableSection title="Physical Metadata" icon={Package}>
              <DataRow label="Product ID" value={product.publicProductId || productId} copyable={true} />
              <DataRow label="Craft Lineage" value={product.artisan?.craftType} />
              <DataRow label="Materials" value={product.materials} />
              <DataRow label="Cooperative" value={product.cooperativeName} />
            </ExpandableSection>

            {/* 10. Verification Timeline */}
            <ExpandableSection title="Verification Timeline" icon={InfoIcon}>
              <DataRow 
                label="Registered On" 
                value={product.registrationDate ? new Date(product.registrationDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown'} 
              />
              <DataRow 
                label="Minted On" 
                value={blockchain?.mintDate ? new Date(blockchain.mintDate).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown'} 
              />
              <DataRow 
                label="Verified At" 
                value={new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} 
              />
            </ExpandableSection>
          </motion.div>
        )}

        {/* Not Authentic Fallback Details */}
        {!isAuthentic && !loading && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#E7DDD6]"
          >
            <h3 className="font-heading font-bold text-[20px] text-[#2C1E21] mb-3">Troubleshooting</h3>
            <ul className="text-[#6E5A5E] text-[14px] space-y-2 list-disc list-inside">
              <li>Ensure the NFC tag is properly scanned by tapping it firmly against the top back of your device.</li>
              <li>Verify that this is a genuine CraftChain product.</li>
              <li>If you believe this is an error, please contact the artisan cooperative or support.</li>
            </ul>
            <div className="mt-6 pt-6 border-t border-[#E7DDD6]/50">
              <span className="text-[#9C8A8E] text-[11px] uppercase tracking-wider font-semibold block mb-1">Scanned ID</span>
              <div className="font-mono text-[14px] text-[#2C1E21] break-all bg-[#FAF8F6] p-3 rounded-xl border border-[#E7DDD6]/50">
                {productId}
              </div>
            </div>
          </motion.div>
        )}
      </main>

      <Footer />
    </div>
  )
}
