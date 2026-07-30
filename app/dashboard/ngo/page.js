'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import Image from 'next/image'
import { Reveal } from '@/components/Motion'
import { Loader2, ShieldCheck, ExternalLink, Sparkles, Plus, Check, Upload, X, ScanLine, CircleAlert } from 'lucide-react'

function NgoDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [form, setForm] = useState({
    name: '', price: '', category: 'Textiles', materials: '', description: '',
    artisan: { name: '', village: '', district: '', craftType: '' }
  })
  const [uploads, setUploads] = useState([]) // array of {url, publicId, uploading}
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [mine, setMine] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [nfc, setNfc] = useState({ status: 'idle', message: 'Ready to attach NFC tag.', reservationId: null, publicProductId: null, verificationUrl: null })

  useEffect(() => {
    const u = localStorage.getItem('cc_user')
    if (!u) { router.push('/auth'); return }
    const parsed = JSON.parse(u)
    if (parsed.role !== 'ngo' && parsed.role !== 'admin') { router.push('/'); return }
    setUser(parsed)
    fetch('/api/products').then(r => r.json()).then(d => setMine(Array.isArray(d) ? d : []))
  }, [])

  const handleFiles = async (files) => {
    const token = localStorage.getItem('cc_token')
    const filesArr = Array.from(files || [])
    for (const file of filesArr) {
      const placeholder = { name: file.name, url: null, uploading: true, error: null }
      setUploads(prev => [...prev, placeholder])
      const idx = uploads.length + (filesArr.indexOf(file))
      const fd = new FormData()
      fd.append('file', file)
      try {
        const r = await fetch('/api/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Upload failed')
        setUploads(prev => prev.map(x => x.name === file.name && x.uploading ? { name: file.name, url: d.url, publicId: d.publicId, uploading: false } : x))
      } catch (e) {
        setUploads(prev => prev.map(x => x.name === file.name && x.uploading ? { ...x, uploading: false, error: e.message } : x))
      }
    }
  }

  const removeUpload = (i) => setUploads(prev => prev.filter((_, idx) => idx !== i))

  const describeNfcError = (e) => {
    if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError') return 'NFC permission was denied. Enable NFC and allow Chrome to use it, then try again.'
    if (e?.name === 'NotSupportedError') return 'This tag or browser does not support NFC writing. Use an NFC-enabled Android phone with Chrome.'
    if (e?.name === 'NetworkError') return 'The tag could not be written. It may be read-only, out of range, or have insufficient space.'
    if (e?.name === 'AbortError') return 'NFC writing was cancelled. Keep the tag close to the phone and try again.'
    return e?.message || 'Could not write to NFC tag. Please try again.'
  }

  const attachNfc = async () => {
    setError('')
    if (typeof window === 'undefined' || !('NDEFReader' in window)) {
      setNfc(prev => ({ ...prev, status: 'error', message: 'Web NFC is not available here. Use an NFC-enabled Android phone with Chrome.' }))
      return
    }

    let reservation = nfc
    try {
      if (!reservation.reservationId) {
        setNfc(prev => ({ ...prev, status: 'preparing', message: 'Creating your secure CraftChain verification link...' }))
        const token = localStorage.getItem('cc_token')
        const r = await fetch('/api/products/prepare-nfc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({}),
        })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Could not prepare NFC registration')
        reservation = { ...reservation, ...d }
      }

      setNfc({ ...reservation, status: 'waiting', message: 'Hold your NFC tag near the back of your phone to register this product.' })
      const writer = new window.NDEFReader()
      setNfc({ ...reservation, status: 'writing', message: 'Scanning NFC tag...' })
      await writer.write({ records: [{ recordType: 'url', data: reservation.verificationUrl }] })
      setNfc({ ...reservation, status: 'success', message: '✓ NFC Tag Successfully Attached' })
    } catch (e) {
      setNfc(prev => ({ ...prev, status: 'error', message: describeNfcError(e) }))
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    const validUrls = uploads.filter(u => u.url).map(u => u.url)
    if (validUrls.length === 0) { setError('Upload at least one product image'); return }
    if (nfc.status !== 'success' || !nfc.reservationId) { setError('Attach the NFC tag before registering this product.'); return }
    setStatus('registering'); setError(''); setResult(null)
    try {
      const token = localStorage.getItem('cc_token')
      const body = { ...form, price: Number(form.price), images: validUrls, nfcReservationId: nfc.reservationId }
      const r = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Mint failed')
      setResult(d); setStatus('success')
      fetch('/api/products').then(r => r.json()).then(x => setMine(Array.isArray(x) ? x : []))
    } catch (e) { setError(e.message); setStatus('idle') }
  }

  const reset = () => {
    setStatus('idle'); setResult(null); setUploads([])
    setForm({ name: '', price: '', category: 'Textiles', materials: '', description: '', artisan: { name: '', village: '', district: '', craftType: '' } })
    setNfc({ status: 'idle', message: 'Tap NFC Tag to Attach', reservationId: null, publicProductId: null, verificationUrl: null })
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Reveal>
            <div className="chip-verified mb-3"><ShieldCheck size={14} /> NGO Console</div>
            <h1 className="font-heading text-[38px] font-bold text-[#2C1E21] leading-tight">NGO Dashboard</h1>
            <p className="text-[15px] text-[#6E5A5E] mt-2">Manage your products and register new authentic certificates on Ethereum Sepolia.</p>
          </Reveal>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="btn-cta shrink-0"><Plus size={16} /> Add New Product</button>
          )}
        </div>

        {!showForm ? (
          <Reveal delay={0.1}>
            <div className="mt-8 bg-white rounded-2xl border border-[#E7DDD6] p-6 card-warm">
              <div className="font-heading font-bold text-[18px] text-[#2C1E21] mb-5">Your Registered Products</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[600px] overflow-auto pr-2">
                {mine.map(p => (
                  <Link href={`/products/${p.id}`} key={p.id} className="flex gap-3 items-center p-3 rounded-xl border border-[#E7DDD6]/60 hover:border-[#702935]/40 hover:bg-[#F9F6F0] transition-all group">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 group-hover:scale-105 transition-transform"><Image src={p.images?.[0] || 'https://new-craftchain.vercel.app/logo.png'} fill sizes="64px" className="object-cover" alt="" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold text-[#2C1E21] truncate group-hover:text-[#702935] transition-colors">{p.name}</div>
                      <div className="text-[12px] text-[#6E5A5E] mt-0.5">#{p.tokenId}</div>
                      <div className="text-[13px] font-bold text-[#2C1E21] mt-1">₹{Number(p.price).toLocaleString('en-IN')}</div>
                    </div>
                  </Link>
                ))}
                {mine.length === 0 && <div className="text-[14px] text-[#6E5A5E] py-10 text-center col-span-full">No products registered yet. Click "Add New Product" to begin.</div>}
              </div>
            </div>
          </Reveal>
        ) : (
          <div className="mt-8">
            <button onClick={() => setShowForm(false)} className="mb-6 flex items-center gap-2 text-[14px] font-medium text-[#6E5A5E] hover:text-[#2C1E21] transition-colors"><X size={16}/> Cancel Registration</button>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="md:col-span-2">
                {status === 'success' && result ? (
                  <Reveal>
                    <div className="bg-white rounded-2xl border border-[#00897B]/30 p-8 card-warm-lg">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-11 h-11 rounded-full bg-[#00897B] flex items-center justify-center"><Check size={20} className="text-white" /></div>
                        <div>
                          <div className="font-heading text-[22px] font-bold text-[#2C1E21]">Minted on Sepolia</div>
                          <div className="text-[13px] text-[#6E5A5E]">{result.name} is now a verifiable on-chain certificate.</div>
                        </div>
                      </div>
                      <div className="space-y-3 text-[13px]">
                        <div><span className="text-[#6E5A5E] uppercase text-[11px] tracking-wider">CraftChain Product ID</span><div className="font-heading font-bold text-[18px] text-[#2C1E21]">{result.publicProductId}</div></div>
                        <div><span className="text-[#6E5A5E] uppercase text-[11px] tracking-wider">Token ID</span><div className="font-heading font-bold text-[24px] text-[#2C1E21]">#{result.tokenId}</div></div>
                        <div>
                          <span className="text-[#6E5A5E] uppercase text-[11px] tracking-wider">Transaction hash</span>
                          <a href={`https://sepolia.etherscan.io/tx/${result.mintTxHash}`} target="_blank" rel="noopener noreferrer" className="hash-mono block text-[#702935] hover:underline mt-1 break-all">
                            {result.mintTxHash} <ExternalLink size={11} className="inline" />
                          </a>
                        </div>
                        <div>
                          <span className="text-[#6E5A5E] uppercase text-[11px] tracking-wider">Contract</span>
                          <div className="hash-mono mt-1">{result.contractAddress}</div>
                        </div>
                      </div>
                      <div className="mt-6 flex gap-3 flex-wrap">
                        <button onClick={reset} className="btn-cta"><Plus size={16} /> Add another</button>
                        <Link href={`/products/${result.id}`} className="btn-outline">View product page</Link>
                      </div>
                    </div>
                  </Reveal>
                ) : (
                  <Reveal>
                    <form onSubmit={submit} className="bg-white rounded-2xl border border-[#E7DDD6] p-6 card-warm space-y-5">
                      <div>
                        <div className="grid md:grid-cols-2 gap-3">
                          <div>
                            <Label>Product name</Label>
                            <input required className="input-heritage" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sambalpuri Handloom Saree" />
                          </div>
                          <div>
                            <Label>Price (INR)</Label>
                            <input required type="number" className="input-heritage" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="Enter price" />
                          </div>
                          <div>
                            <Label>Category</Label>
                            <select className="input-heritage" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                              <option>Textiles</option><option>Pottery</option><option>Woodcraft</option><option>Metalcraft</option><option>Painting</option>
                            </select>
                          </div>
                          <div>
                            <Label>Material</Label>
                            <input className="input-heritage" value={form.materials} onChange={e => setForm({ ...form, materials: e.target.value })} placeholder="e.g. Cotton, Silk, Clay" />
                          </div>
                        </div>
                        <div className="mt-3">
                          <Label>Description</Label>
                          <textarea rows={3} className="input-heritage" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the product..." />
                        </div>
                      </div>
                      <div>
                        <Label>Product photos</Label>
                        <label className="block cursor-pointer">
                          <input type="file" accept="image/*" multiple hidden onChange={e => handleFiles(e.target.files)} />
                          <div className="border-2 border-dashed border-[#E7DDD6] rounded-xl p-6 text-center hover:border-[#702935] hover:bg-[#F9F6F0] transition">
                            <Upload size={22} className="text-[#702935] mx-auto mb-2" />
                            <div className="text-[13px] font-medium text-[#2C1E21]">Click to upload or drag & drop</div>
                          </div>
                        </label>
                        {uploads.length > 0 && (
                          <div className="grid grid-cols-4 gap-2 mt-3">
                            {uploads.map((u, i) => (
                              <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-[#EFE7DE] border border-[#E7DDD6]">
                                {u.uploading ? <div className="w-full h-full flex flex-col items-center justify-center text-[#6E5A5E]"><Loader2 size={16} className="animate-spin mb-1" /></div> : u.error ? <div className="w-full h-full flex items-center justify-center bg-[#8B2635]/10 text-[10px] text-[#8B2635] p-2 text-center">{u.error}</div> : <><Image src={u.url} fill sizes="100px" className="object-cover" alt="upload preview" /><button type="button" onClick={() => removeUpload(i)} className="absolute top-1 right-1 bg-black/60 rounded-full p-1 hover:bg-black text-white"><X size={11} /></button></>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="pt-4 border-t border-[#E7DDD6]">
                        <div className="text-[12px] uppercase tracking-wider text-[#6E5A5E] mb-3">Artisan Information</div>
                        <div className="grid md:grid-cols-2 gap-3">
                          <input required className="input-heritage" placeholder="Artisan name" value={form.artisan.name} onChange={e => setForm({ ...form, artisan: { ...form.artisan, name: e.target.value } })} />
                          <input className="input-heritage" placeholder="Craft type" value={form.artisan.craftType} onChange={e => setForm({ ...form, artisan: { ...form.artisan, craftType: e.target.value } })} />
                          <input className="input-heritage" placeholder="Village" value={form.artisan.village} onChange={e => setForm({ ...form, artisan: { ...form.artisan, village: e.target.value } })} />
                          <input className="input-heritage" placeholder="District, State" value={form.artisan.district} onChange={e => setForm({ ...form, artisan: { ...form.artisan, district: e.target.value } })} />
                        </div>
                      </div>
                      <div className="pt-5 border-t border-[#E7DDD6]">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#702935]/10 text-[#702935] flex items-center justify-center shrink-0"><ScanLine size={19} /></div>
                          <div>
                            <div className="font-heading font-bold text-[16px] text-[#2C1E21]">Secure NFC Authentication</div>
                            <p className="text-[13px] text-[#6E5A5E] mt-1">Tap your phone against the NFC tag to write security credentials.</p>
                          </div>
                        </div>
                        <div className={`mt-5 rounded-xl border p-4 flex items-center gap-4 transition-all ${nfc.status === 'success' ? 'border-[#00897B]/30 bg-[#00897B]/5' : 'border-[#E7DDD6] bg-[#F9F6F0]'}`}>
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${nfc.status === 'success' ? 'bg-[#00897B] text-white' : 'bg-white border border-[#E7DDD6] text-[#702935]'}`}>
                            {nfc.status === 'success' ? <Check size={20} /> : <ScanLine size={20} className={['preparing', 'waiting', 'writing'].includes(nfc.status) ? 'animate-pulse' : ''} />}
                          </div>
                          <div className="flex-1 text-[14px] text-[#2C1E21] font-medium">{nfc.message}</div>
                          {nfc.status !== 'success' && (
                            <button type="button" onClick={attachNfc} disabled={['preparing', 'waiting', 'writing'].includes(nfc.status)} className="text-[13px] font-semibold text-[#702935] hover:underline">Scan</button>
                          )}
                        </div>
                      </div>
                      {error && <div className="text-[13px] text-[#8B2635] bg-[#8B2635]/10 rounded-lg px-3 py-2">{error}</div>}
                      <button disabled={status === 'registering' || ['preparing', 'waiting', 'writing'].includes(nfc.status)} className="btn-cta w-full justify-center mt-2">
                        {status === 'registering' ? <><Loader2 className="animate-spin" size={18} /> Registering...</> : <><Sparkles size={16} /> Register Product</>}
                      </button>
                    </form>
                  </Reveal>
                )}
              </div>
              <div className="hidden md:block">
                <Reveal delay={0.1}>
                  <div className="bg-white rounded-2xl border border-[#E7DDD6] p-5 card-warm">
                    <div className="font-heading font-bold text-[15px] text-[#2C1E21] mb-3">Recent Registration</div>
                    <p className="text-[13px] text-[#6E5A5E]">Adding a product mints a new ERC-721 certificate on Ethereum Sepolia. Each mint takes 10-20 seconds to be verified on the blockchain.</p>
                    <div className="mt-4 pt-4 border-t border-[#E7DDD6]">
                      <div className="flex items-center gap-2 text-[12px] text-[#00897B] font-medium"><ShieldCheck size={14} /> 100% on-chain authenticity</div>
                    </div>
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}

function Label({ children }) { return <label className="block text-[12px] uppercase tracking-wider text-[#6E5A5E] mb-1">{children}</label> }
export default NgoDashboard
