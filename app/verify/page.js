'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { Search, ShieldCheck, ShieldAlert, ExternalLink, Loader2 } from 'lucide-react'

function VerifyInner() {
  const params = useSearchParams()
  const [tokenId, setTokenId] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const t = params.get('token')
    if (t) { setTokenId(t); doVerify(t) }
  }, [])

  const doVerify = async (id) => {
    setLoading(true); setResult(null)
    try {
      const r = await fetch(`/api/verify/${id}`)
      const d = await r.json()
      setResult(d)
    } catch(e) { setResult({ authentic: false, reason: e.message }) } finally { setLoading(false) }
  }

  const submit = (e) => { e.preventDefault(); if (tokenId) doVerify(tokenId) }

  const explorer = 'https://sepolia.etherscan.io'

  return (
    <div className="min-h-screen">
      <Nav/>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="chip-verified mb-3"><ShieldCheck size={14}/> Live from Ethereum Sepolia</div>
        <h1 className="font-heading text-[42px] font-bold text-[#2C1E21] leading-tight">Verify a product</h1>
        <p className="text-[15px] text-[#6E5A5E] mt-2">Enter the token ID printed on the certificate to see the true owner, artisan, and origin — read live from the smart contract.</p>

        <form onSubmit={submit} className="mt-8 flex flex-col sm:flex-row gap-2">
          <input value={tokenId} onChange={e=>setTokenId(e.target.value)} placeholder="Token ID (e.g. 1)" className="input-heritage flex-1"/>
          <button className="btn-cta justify-center sm:justify-start" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={18}/> : <><Search size={16}/> Verify</>}
          </button>
        </form>

        {result && (
          <div className="mt-8">
            {result.authentic ? (
              <div className="rounded-2xl border border-[#00897B]/30 bg-gradient-to-br from-[#00897B]/5 to-transparent p-8 card-warm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-11 h-11 rounded-full bg-[#00897B] flex items-center justify-center"><ShieldCheck size={20} className="text-white"/></div>
                  <div>
                    <div className="font-heading text-[22px] font-bold text-[#2C1E21]">Authentic</div>
                    <div className="text-[13px] text-[#6E5A5E]">Token #{result.tokenId} exists and is minted on CraftChain contract.</div>
                  </div>
                </div>
                {result.metadata && (
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 mb-5 pb-5 border-b border-[#E7DDD6]">
                    {result.metadata.image && <div className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0"><Image src={result.metadata.image} fill sizes="96px" className="object-cover" alt=""/></div>}
                    <div>
                      <div className="font-heading font-bold text-[18px] text-[#2C1E21]">{result.metadata.name}</div>
                      <div className="text-[13px] text-[#6E5A5E] mt-1">{result.metadata.description}</div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {result.metadata.attributes?.map((a,i)=> a.value && <span key={i} className="chip-muted text-[10px]">{a.trait_type}: {a.value}</span>)}
                      </div>
                    </div>
                  </div>
                )}
                <div className="space-y-3 text-[13px]">
                  <Row label="Current owner" value={result.currentOwner} link={`${explorer}/address/${result.currentOwner}`}/>
                  <Row label="Artisan address" value={result.artisanAddress} link={`${explorer}/address/${result.artisanAddress}`}/>
                  <Row label="Contract" value={result.contractAddress} link={`${explorer}/address/${result.contractAddress}`}/>
                  <Row label="Minted at" value={new Date(result.mintDate).toLocaleString()}/>
                  <Row label="Token page" value="View on Etherscan" link={result.explorerUrl}/>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-[#8B2635]/30 bg-[#8B2635]/5 p-8">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-[#8B2635] flex items-center justify-center"><ShieldAlert size={20} className="text-white"/></div>
                  <div>
                    <div className="font-heading text-[22px] font-bold text-[#2C1E21]">Not found</div>
                    <div className="text-[13px] text-[#6E5A5E]">Token #{result.tokenId} does not exist on the CraftChain contract.</div>
                  </div>
                </div>
                {result.error && <div className="mt-3 text-[12px] hash-mono">{result.error}</div>}
              </div>
            )}
          </div>
        )}
      </div>
      <Footer/>
    </div>
  )
}

function Row({ label, value, link }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-[#6E5A5E]">{label}</div>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className="hash-mono text-[#702935] hover:underline inline-flex items-center gap-1 break-all mt-1">{value} <ExternalLink size={12}/></a>
      ) : <div className="text-[#2C1E21] mt-1">{value}</div>}
    </div>
  )
}

function VerifyPage() {
  return <Suspense fallback={<div className="p-10">Loading…</div>}><VerifyInner/></Suspense>
}
export default VerifyPage
