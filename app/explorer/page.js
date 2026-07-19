'use client'
import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { Reveal } from '@/components/Motion'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, Send, Package, ExternalLink, ChevronDown, Loader2, Radio, RefreshCw, ShieldCheck, FileText } from 'lucide-react'

const PAGE_SIZE = 10
const FILTERS = [
  { value: 'All Events', label: 'All Events' },
  { value: 'Mint', label: 'Mint' },
  { value: 'Verification', label: 'Verification' },
  { value: 'Ownership Transfer', label: 'Ownership Transfer' },
  { value: 'Metadata Update', label: 'Metadata Update' },
]

function Inner() {
  const params = useSearchParams()
  const [feed, setFeed] = useState({ events: [], totalEvents: 0, totalTransactions: 0, currentPage: 1, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [txDetail, setTxDetail] = useState({})
  const [error, setError] = useState('')
  const [query, setQuery] = useState(params.get('q') || '')
  const [eventFilter, setEventFilter] = useState('All Events')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')
  const [blockFilter, setBlockFilter] = useState('')
  const [page, setPage] = useState(1)
  const requestRef = useRef(null)

  const loadFeed = async ({ quiet = false, nextPage = 1, append = false } = {}) => {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    if (quiet) setRefreshing(true)
    else setLoading(true)
    try {
      const qs = new URLSearchParams({
        page: String(nextPage),
        limit: String(PAGE_SIZE),
        q: query.trim(),
        eventType: eventFilter,
        status: statusFilter,
        date: dateFilter,
        block: blockFilter.trim(),
      })
      const d = await fetch(`/api/explorer/feed?${qs.toString()}`, { cache: 'no-store', signal: controller.signal }).then(r => r.json())
      if (d.error) {
        setError(d.error)
        setFeed(prev => append ? prev : ({ ...prev, events: [], totalEvents: 0, totalTransactions: 0 }))
        return
      }
      setError('')
      const events = Array.isArray(d.transactions) ? d.transactions : Array.isArray(d.events) ? d.events : []
      setFeed(prev => ({
        ...d,
        events: append ? [...prev.events, ...events] : events,
        totalEvents: d.totalEvents ?? d.totalTransactions ?? 0,
        totalTransactions: d.totalTransactions ?? d.totalEvents ?? 0,
      }))
      setPage(d.currentPage || nextPage)
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message || 'Unable to load explorer feed')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    const id = setInterval(() => loadFeed({ quiet: true, nextPage: 1 }), feed.isIndexing ? 5000 : 30000)
    return () => clearInterval(id)
  }, [query, eventFilter, statusFilter, dateFilter, blockFilter, feed.isIndexing])

  useEffect(() => () => requestRef.current?.abort(), [])

  useEffect(() => {
    const id = setTimeout(() => loadFeed({ nextPage: 1 }), 250)
    return () => clearTimeout(id)
  }, [query, eventFilter, statusFilter, dateFilter, blockFilter])

  const visibleEvents = feed.events
  const hasMore = Boolean(feed.hasNextPage)

  const toggle = async (ev) => {
    const key = ev.id || `${ev.txHash}:${ev.logIndex}`
    if (expanded === key) { setExpanded(null); return }
    setExpanded(key)
    if (!txDetail[ev.txHash]) {
      const d = await fetch(`/api/explorer/tx/${ev.txHash}`).then(r => r.json())
      setTxDetail(prev => ({ ...prev, [ev.txHash]: d }))
    }
  }

  return (
    <div className="min-h-screen">
      <Nav/>
      <main className="max-w-6xl mx-auto px-6 py-10">
        <Reveal>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="chip-verified"><Radio size={12}/> Live Sepolia feed</span>
            <span className="chip-muted">Contract {short(feed.contractAddress || '0x3435...9e76')}</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="font-heading text-[38px] font-bold text-[#2C1E21] leading-tight">Blockchain Explorer</h1>
              <p className="text-[15px] text-[#6E5A5E] mt-2">Every CraftChain contract event recorded from deployment through the latest block.</p>
            </div>
            <button onClick={() => loadFeed({ quiet: true, nextPage: 1 })} className="btn-outline inline-flex items-center gap-2 w-fit">
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''}/> Refresh
            </button>
          </div>
        </Reveal>

        <Reveal delay={0.06}>
          <div className="mt-8 space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6E5A5E]"/>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tx hash, product ID/name, artist, token ID, or wallet" className="input-heritage pl-9"/>
            </div>
            <div className="grid md:grid-cols-4 gap-3">
              <select value={eventFilter} onChange={e => setEventFilter(e.target.value)} className="input-heritage">
                {FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="input-heritage"/>
              <input value={blockFilter} onChange={e => setBlockFilter(e.target.value)} placeholder="Block number" className="input-heritage"/>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-heritage">
                <option value="all">All statuses</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </Reveal>

        <section className="mt-8">
          <Reveal>
            <div className="grid md:grid-cols-4 gap-3 mb-5 text-[13px]">
              <StatBox label="Latest block" value={feed.latestBlock || '-'} />
              <StatBox label="Deployed at block" value={feed.deploymentBlock || '-'} />
              <StatBox label="Events shown" value={`${feed.totalIndexedEvents || feed.totalEvents || 0} events`} />
              <StatBox label="Total retrieved" value={`${feed.totalTransactions || 0} matching`} />
            </div>
            {error && <div className="mb-5 rounded-xl border border-[#E7DDD6] bg-white p-4 text-[13px] text-[#8B2635]">Explorer feed unavailable: {error}</div>}
          </Reveal>

          {loading ? (
            <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-white/60 border border-[#E7DDD6] animate-pulse"/>)}</div>
          ) : (
            <div className="space-y-3">
              {visibleEvents.map((ev, i) => {
                const key = ev.id || `${ev.txHash}:${ev.logIndex}`
                const open = expanded === key
                const Icon = iconFor(ev)
                const color = colorFor(ev)
                return (
                  <Reveal key={key} delay={Math.min(i * 0.01, 0.18)}>
                    <div className="bg-white rounded-xl border border-[#E7DDD6] overflow-hidden card-warm">
                      <button onClick={() => toggle(ev)} className="w-full grid md:grid-cols-[auto_1fr_auto_auto] gap-4 p-4 hover:bg-[#F9F6F0] transition text-left items-center">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: color + '15' }}>
                          <Icon size={16} style={{ color }}/>
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-heading font-bold text-[14px] text-[#2C1E21]">{displayType(ev)}</span>
                            {ev.tokenId != null && <span className="chip-muted text-[10px]">Token #{ev.tokenId}</span>}
                            <span className="chip-muted text-[10px]">{ev.status === 1 ? 'Success' : 'Pending/Failed'}</span>
                          </div>
                          <div className="hash-mono text-[11px] mt-1 truncate">{ev.txHash}</div>
                          <div className="text-[12px] text-[#6E5A5E] mt-1 truncate">{ev.productName || 'Contract event'} {ev.artistName ? `by ${ev.artistName}` : ''}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-right">
                          <Mini label="Block" value={ev.blockNumber}/>
                          <Mini label="Time" value={formatTime(ev.blockTimestamp)}/>
                        </div>
                        <ChevronDown size={16} className={`text-[#6E5A5E] transition-transform ${open ? 'rotate-180' : ''}`}/>
                      </button>
                      <AnimatePresence>
                        {open && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
                            <div className="px-5 pb-5 pt-2 border-t border-[#E7DDD6]">
                              <EventDetail event={ev} tx={txDetail[ev.txHash]}/>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </Reveal>
                )
              })}
              {visibleEvents.length === 0 && <div className="text-center py-16 text-[#6E5A5E]">No matching blockchain events.</div>}
              {hasMore && (
                <div className="flex justify-center pt-3">
                  <button onClick={() => loadFeed({ quiet: true, nextPage: page + 1, append: true })} className="btn-outline">Load more events</button>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
      <Footer/>
    </div>
  )
}

function EventDetail({ event, tx }) {
  const product = event.product || {}
  const metadata = product.metadata || {}
  return (
    <div className="space-y-5 text-[12px]">
      <div className="grid md:grid-cols-3 gap-4">
        <Row label="Transaction Hash" value={event.txHash} link={event.explorerUrl}/>
        <Row label="Block Hash" value={event.blockHash || tx?.blockHash || '-'}/>
        <Row label="Block Number" value={event.blockNumber}/>
        <Row label="Timestamp" value={formatDate(event.blockTimestamp)}/>
        <Row label="Event Type" value={displayType(event)}/>
        <Row label="Network" value={event.network || tx?.network || 'Sepolia'}/>
        <Row label="From Address" value={event.from || tx?.from || '-'} link={addressLink(event.from || tx?.from)}/>
        <Row label="To Address" value={event.to || tx?.to || '-'} link={addressLink(event.to || tx?.to)}/>
        <Row label="Current Owner" value={event.currentOwner || '-'} link={addressLink(event.currentOwner)}/>
        <Row label="Gas Used" value={event.gasUsed || tx?.gasUsed || '-'}/>
        <Row label="Gas Price" value={event.gasPrice || tx?.gasPrice || '-'}/>
        <Row label="Status" value={event.status === 1 || tx?.status === 1 ? 'Success' : 'Failed or pending'}/>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3 text-[#2C1E21] font-heading font-bold"><Package size={15}/> Product</div>
        <div className="grid md:grid-cols-3 gap-4">
          <Row label="Product Name" value={event.productName || metadata.name || '-'}/>
          <Row label="Product ID" value={event.productId || product.id || '-'}/>
          <Row label="Token ID" value={event.tokenId != null ? `#${event.tokenId}` : '-'}/>
          <Row label="Category" value={product.category || attr(metadata, 'Category') || '-'}/>
          <Row label="Artist" value={event.artistName || attr(metadata, 'Artisan') || '-'}/>
          <Row label="NGO" value={event.ngoName || '-'}/>
          <Row label="Registration Date" value={product.createdAt ? new Date(product.createdAt).toLocaleString() : '-'}/>
          <Row label="Verification Status" value={event.verificationStatus || '-'}/>
          <Row label="IPFS CID" value={event.ipfsCid || product.ipfsCid || '-'}/>
          <Row label="Certificate Hash" value={event.certificateHash || '-'}/>
          <Row label="Metadata URI" value={event.metadataURI || '-'} link={event.metadataURI?.startsWith('http') ? event.metadataURI : null}/>
          <Row label="Current Owner Wallet" value={event.currentOwner || '-'} link={addressLink(event.currentOwner)}/>
        </div>
        <div className="mt-4">
          <Row label="Description" value={product.description || metadata.description || '-'}/>
        </div>
      </div>

      {tx ? (
        <div>
          <div className="flex items-center gap-2 mb-2 text-[#2C1E21] font-heading font-bold"><FileText size={15}/> Logs in Transaction</div>
          <div className="flex flex-wrap gap-2">
            {tx.events?.map((e, i) => (
              <span key={i} className="chip-muted"><span className="font-medium text-[#2C1E21]">{e.name}</span>{e.args?.tokenId && <span className="text-[#6E5A5E]"> · token #{e.args.tokenId}</span>}</span>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-[#6E5A5E]"><Loader2 size={14} className="animate-spin"/> Fetching transaction receipt...</div>
      )}

      <a href={event.explorerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#702935] font-medium hover:underline">Open on Etherscan <ExternalLink size={12}/></a>
    </div>
  )
}

function StatBox({ label, value }) {
  return <div className="bg-white rounded-xl border border-[#E7DDD6] p-4"><div className="text-[11px] uppercase tracking-wider text-[#6E5A5E]">{label}</div><div className="font-heading font-bold text-[18px] text-[#2C1E21] mt-1">{value}</div></div>
}

function Row({ label, value, link }) {
  return <div className="min-w-0"><div className="uppercase tracking-wider text-[10px] text-[#6E5A5E] mb-1">{label}</div>{link ? <a href={link} target="_blank" rel="noopener noreferrer" className="hash-mono text-[#702935] hover:underline break-all">{value}</a> : <div className="text-[#2C1E21] break-words">{value ?? '-'}</div>}</div>
}

function Mini({ label, value }) {
  return <div><div className="text-[10px] uppercase tracking-wider text-[#6E5A5E]">{label}</div><div className="font-heading font-bold text-[13px] text-[#2C1E21]">{value || '-'}</div></div>
}

function classifyEvent(ev) {
  const name = ev.eventType || ev.type
  if (name === 'ProductMinted' || name === 'NFT Mint') return 'Mint'
  if (name === 'ProductVerified') return 'Verification'
  if (name === 'MetadataUpdated' || name === 'MetadataUpdate' || name === 'MetadataUpdateBatch') return 'Metadata Update'
  if (name === 'OwnershipTransferred' || name === 'Transfer') return 'Ownership Transfer'
  return 'All Events'
}

function displayType(ev) {
  const type = classifyEvent(ev)
  if (type !== 'All Events') return type
  return ev.eventType || ev.type || 'Contract Event'
}

function iconFor(ev) {
  const type = classifyEvent(ev)
  if (type === 'Mint') return Package
  if (type === 'Verification') return ShieldCheck
  return Send
}

function colorFor(ev) {
  const type = classifyEvent(ev)
  if (type === 'Mint') return '#702935'
  if (type === 'Verification') return '#00897B'
  if (type === 'Metadata Update') return '#8B5E34'
  return '#00897B'
}

function attr(metadata, name) {
  return metadata?.attributes?.find?.(a => a.trait_type === name)?.value || null
}

function short(value) {
  if (!value) return '-'
  return value.length > 14 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value
}

function eventDate(ev) {
  return ev.blockTimestamp ? new Date(ev.blockTimestamp * 1000).toISOString().slice(0, 10) : ''
}

function formatTime(ts) {
  return ts ? new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'
}

function formatDate(ts) {
  return ts ? new Date(ts * 1000).toLocaleString() : '-'
}

function addressLink(value) {
  return value && /^0x[a-fA-F0-9]{40}$/.test(value) ? `https://sepolia.etherscan.io/address/${value}` : null
}

function ExplorerPage() { return <Suspense fallback={<div className="p-10">Loading...</div>}><Inner/></Suspense> }
export default ExplorerPage
