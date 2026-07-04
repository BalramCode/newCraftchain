'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { Reveal } from '@/components/Motion'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, ShieldCheck, Send, Package, ExternalLink, ChevronDown, Loader2, Radio, ArrowRight } from 'lucide-react'

function Inner() {
  const params = useSearchParams()
  const router = useRouter()
  const [feed, setFeed] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [txDetail, setTxDetail] = useState({})
  const [query, setQuery] = useState(params.get('q') || '')
  const [searchResult, setSearchResult] = useState(null)

  useEffect(() => {
    fetch('/api/explorer/feed?limit=100').then(r=>r.json()).then(d=>{ setFeed(d); setLoading(false) })
  }, [])

  const toggle = async (ev) => {
    const key = ev.txHash + ':' + ev.logIndex
    if (expanded === key) { setExpanded(null); return }
    setExpanded(key)
    if (!txDetail[ev.txHash]) {
      const d = await fetch(`/api/explorer/tx/${ev.txHash}`).then(r=>r.json())
      setTxDetail(prev => ({ ...prev, [ev.txHash]: d }))
    }
  }

  const doSearch = async (e) => {
    e?.preventDefault()
    if (!query.trim()) { setSearchResult(null); return }
    const r = await fetch(`/api/explorer/search?q=${encodeURIComponent(query.trim())}`).then(r=>r.json())
    setSearchResult(r)
    if (r.type === 'tx') {
      const d = await fetch(`/api/explorer/tx/${r.hash}`).then(r=>r.json())
      setTxDetail(prev => ({ ...prev, [r.hash]: d }))
      setExpanded(r.hash + ':search')
    }
  }

  return (
    <div className="min-h-screen">
      <Nav/>
      <div className="max-w-6xl mx-auto px-6 py-10">
        <Reveal>
          <div className="flex items-center gap-2 mb-3">
            <span className="chip-verified"><Radio size={12}/> Live Sepolia feed</span>
            <span className="chip-muted">Contract 0x3435…9e76</span>
          </div>
          <h1 className="font-heading text-[38px] font-bold text-[#2C1E21] leading-tight">Blockchain Explorer</h1>
          <p className="text-[15px] text-[#6E5A5E] mt-2">Every mint and ownership transfer recorded by the CraftChain contract — read directly from Ethereum.</p>
        </Reveal>

        <Reveal delay={0.06}>
          <form onSubmit={doSearch} className="mt-8 flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6E5A5E]"/>
              <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search tx hash (0x…) or token id" className="input-heritage pl-9"/>
            </div>
            <button className="btn-cta">Search</button>
          </form>

          {searchResult && (
            <div className="mt-4 bg-white rounded-2xl border border-[#E7DDD6] p-4 text-[13px]">
              {searchResult.type === 'tx' && txDetail[searchResult.hash] && <TxCard tx={txDetail[searchResult.hash]}/>}
              {searchResult.type === 'token' && (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-heading font-bold text-[16px] text-[#2C1E21]">Token #{searchResult.tokenId}</div>
                    <div className="text-[12px] text-[#6E5A5E]">Owner: <span className="hash-mono">{searchResult.currentOwner}</span> · Minted {new Date(searchResult.mintTimestamp*1000).toLocaleString()}</div>
                  </div>
                  <Link href={`/verify?token=${searchResult.tokenId}`} className="text-[#702935] font-medium hover:underline inline-flex items-center gap-1">Full report <ArrowRight size={13}/></Link>
                </div>
              )}
              {searchResult.type === 'not_found' && <div className="text-[#8B2635]">{searchResult.reason}</div>}
              {searchResult.type === 'unknown' && <div className="text-[#6E5A5E]">{searchResult.reason}</div>}
            </div>
          )}
        </Reveal>

        {/* Feed */}
        <div className="mt-8">
          {feed && (
            <Reveal>
              <div className="grid md:grid-cols-3 gap-3 mb-5 text-[13px]">
                <StatBox label="Latest block" value={feed.latestBlock}/>
                <StatBox label="Deployed at block" value={feed.deploymentBlock}/>
                <StatBox label="Events shown" value={feed.events.length}/>
              </div>
            </Reveal>
          )}
          {loading ? (
            <div className="space-y-2">{[...Array(6)].map((_,i)=><div key={i} className="h-16 rounded-xl bg-white/60 border border-[#E7DDD6] animate-pulse"/>) }</div>
          ) : (
            <div className="space-y-2">
              {feed.events.map((ev, i) => {
                const key = ev.txHash + ':' + ev.logIndex
                const open = expanded === key
                const Icon = ev.type === 'ProductMinted' ? Package : Send
                const color = ev.type === 'ProductMinted' ? '#702935' : '#00897B'
                return (
                  <Reveal key={key} delay={Math.min(i*0.02, 0.3)}>
                    <div className="bg-white rounded-xl border border-[#E7DDD6] overflow-hidden card-warm">
                      <button onClick={()=>toggle(ev)} className="w-full flex items-center gap-4 p-4 hover:bg-[#F9F6F0] transition text-left">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{background: color+'15'}}>
                          <Icon size={16} style={{color}}/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-heading font-bold text-[14px] text-[#2C1E21]">{ev.type === 'ProductMinted' ? 'Mint' : 'Transfer'}</span>
                            <span className="chip-muted text-[10px]">Token #{ev.tokenId}</span>
                          </div>
                          <div className="hash-mono text-[11px] mt-0.5 truncate">{ev.txHash}</div>
                        </div>
                        <div className="text-right hidden sm:block">
                          <div className="text-[11px] uppercase tracking-wider text-[#6E5A5E]">Block</div>
                          <div className="font-heading font-bold text-[13px] text-[#2C1E21]">{ev.blockNumber}</div>
                        </div>
                        <ChevronDown size={16} className={`text-[#6E5A5E] transition-transform ${open?'rotate-180':''}`}/>
                      </button>
                      <AnimatePresence>
                        {open && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
                            <div className="px-5 pb-5 pt-2 border-t border-[#E7DDD6]">
                              {txDetail[ev.txHash] ? <TxCard tx={txDetail[ev.txHash]} event={ev}/> : <div className="flex items-center gap-2 text-[13px] text-[#6E5A5E] py-3"><Loader2 size={14} className="animate-spin"/> Fetching transaction…</div>}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </Reveal>
                )
              })}
              {feed?.events.length === 0 && <div className="text-center py-16 text-[#6E5A5E]">No events yet.</div>}
            </div>
          )}
        </div>
      </div>
      <Footer/>
    </div>
  )
}

function StatBox({ label, value }) {
  return (
    <div className="bg-white rounded-xl border border-[#E7DDD6] p-4">
      <div className="text-[11px] uppercase tracking-wider text-[#6E5A5E]">{label}</div>
      <div className="font-heading font-bold text-[18px] text-[#2C1E21] mt-1">{value}</div>
    </div>
  )
}

function TxCard({ tx, event }) {
  if (!tx) return null
  return (
    <div className="grid md:grid-cols-2 gap-4 text-[12px]">
      <Row label="From" value={tx.from} link={`https://sepolia.etherscan.io/address/${tx.from}`}/>
      <Row label="To (contract)" value={tx.to} link={`https://sepolia.etherscan.io/address/${tx.to}`}/>
      <Row label="Block" value={tx.blockNumber}/>
      <Row label="Gas used" value={tx.gasUsed}/>
      <Row label="Timestamp" value={tx.date ? new Date(tx.date).toLocaleString() : '—'}/>
      <Row label="Status" value={tx.status === 1 ? 'Success' : 'Failed'}/>
      <div className="md:col-span-2">
        <div className="uppercase tracking-wider text-[10px] text-[#6E5A5E] mb-1">Events emitted</div>
        <div className="flex flex-wrap gap-2">
          {tx.events?.map((e, i) => (
            <div key={i} className="chip-muted">
              <span className="font-medium text-[#2C1E21]">{e.name}</span>
              {e.args?.tokenId && <span className="text-[#6E5A5E]">· token #{e.args.tokenId}</span>}
            </div>
          ))}
        </div>
      </div>
      <div className="md:col-span-2">
        <a href={tx.explorerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#702935] font-medium hover:underline">Open on Etherscan <ExternalLink size={12}/></a>
      </div>
    </div>
  )
}
function Row({ label, value, link }) {
  return (
    <div>
      <div className="uppercase tracking-wider text-[10px] text-[#6E5A5E] mb-1">{label}</div>
      {link ? <a href={link} target="_blank" rel="noopener noreferrer" className="hash-mono text-[#702935] hover:underline break-all">{value}</a> : <div className="text-[#2C1E21]">{value}</div>}
    </div>
  )
}

function ExplorerPage() { return <Suspense fallback={<div className="p-10">Loading…</div>}><Inner/></Suspense> }
export default ExplorerPage
