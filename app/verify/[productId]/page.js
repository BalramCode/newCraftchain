'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { ShieldAlert, ShieldCheck, ExternalLink, Loader2, MapPin } from 'lucide-react'

function StatusCard({ result, productId }) {
  const product = result.product
  const blockchain = result.blockchain
  const authentic = result.authentic
  const title = authentic ? 'Authentic CraftChain Product' : result.authenticityStatus === 'not_found' ? 'Product Not Found / Invalid NFC Tag' : result.authenticityStatus === 'revoked' || result.authenticityStatus === 'suspended' ? 'Product Unavailable' : 'Verification Failed'

  return (
    <div className={`rounded-2xl border p-6 sm:p-8 ${authentic ? 'border-[#00897B]/30 bg-gradient-to-br from-[#00897B]/5 to-transparent' : 'border-[#8B2635]/30 bg-[#8B2635]/5'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${authentic ? 'bg-[#00897B]' : 'bg-[#8B2635]'}`}>
          {authentic ? <ShieldCheck size={21} className="text-white" /> : <ShieldAlert size={21} className="text-white" />}
        </div>
        <div>
          <h1 className="font-heading text-[25px] sm:text-[30px] font-bold text-[#2C1E21] leading-tight">{title}</h1>
          <p className="text-[14px] text-[#6E5A5E] mt-1">{authentic ? 'This NFC link resolves to a database product whose certificate is verified live on the CraftChain blockchain.' : result.reason || 'This tag could not be verified.'}</p>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-[#E7DDD6] text-[13px]">
        <span className="text-[#6E5A5E] uppercase tracking-wider text-[11px]">CraftChain Product ID</span>
        <div className="font-mono font-bold text-[#2C1E21] mt-1">{product?.publicProductId || productId}</div>
      </div>

      {product && (
        <div className="mt-6 grid md:grid-cols-[180px_1fr] gap-6">
          {product.images?.[0] && <img src={product.images[0]} alt={product.name} className="w-full aspect-square object-cover rounded-xl border border-[#E7DDD6]" />}
          <div>
            <div className="text-[11px] uppercase tracking-wider font-bold text-[#702935]">{product.category}</div>
            <h2 className="font-heading text-[24px] font-bold text-[#2C1E21] mt-1">{product.name}</h2>
            {product.description && <p className="text-[14px] leading-relaxed text-[#6E5A5E] mt-2">{product.description}</p>}
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 mt-5 text-[13px]">
              <Info label="Artisan" value={product.artisan?.name} />
              <Info label="Craft type" value={product.artisan?.craftType} />
              <Info label="Materials" value={product.materials} />
              <Info label="Village" value={product.artisan?.village} />
              <Info label="District" value={product.artisan?.district} />
              <Info label="Cooperative / NGO" value={product.cooperativeName} />
              <Info label="Registration date" value={product.registrationDate ? new Date(product.registrationDate).toLocaleDateString('en-IN', { dateStyle: 'long' }) : null} />
            </div>
          </div>
        </div>
      )}

      {blockchain && (
        <div className="mt-6 pt-5 border-t border-[#E7DDD6] grid sm:grid-cols-2 gap-4 text-[13px]">
          <Info label="Blockchain status" value={blockchain.verified ? 'Verified on Ethereum Sepolia' : 'Could not verify on-chain'} />
          <Info label="Token ID" value={blockchain.tokenId != null ? `#${blockchain.tokenId}` : null} />
          {blockchain.mintDate && <Info label="Blockchain registration" value={new Date(blockchain.mintDate).toLocaleString('en-IN')} />}
          {blockchain.explorerUrl && <div><div className="text-[11px] uppercase tracking-wider text-[#6E5A5E]">Transaction</div><a href={blockchain.explorerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#702935] hover:underline font-mono text-[11px] mt-1">View on explorer <ExternalLink size={12} /></a></div>}
        </div>
      )}
    </div>
  )
}

function Info({ label, value }) {
  if (!value) return null
  return <div><div className="text-[11px] uppercase tracking-wider text-[#6E5A5E]">{label}</div><div className="text-[#2C1E21] font-medium mt-1">{value}</div></div>
}

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

  return (
    <div className="min-h-screen bg-[#FAF8F6]">
      <Nav />
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="chip-verified mb-3"><ShieldCheck size={14} /> NFC authenticity check</div>
        <p className="text-[15px] text-[#6E5A5E] mb-8">CraftChain verifies the physical product&apos;s public NFC link against its database record and on-chain certificate.</p>
        {loading ? <div className="py-16 flex flex-col items-center gap-3 text-[#6E5A5E]"><Loader2 size={28} className="animate-spin text-[#702935]" /><span className="text-sm">Checking the CraftChain registry…</span></div> : <StatusCard result={result} productId={productId} />}
      </main>
      <Footer />
    </div>
  )
}
