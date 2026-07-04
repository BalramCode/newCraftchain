'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { Loader2, ShieldCheck, ExternalLink, Sparkles, Plus, Check } from 'lucide-react'

function NgoDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [form, setForm] = useState({
    name: '', price: '', category: 'Textiles', materials: '', description: '',
    images: '',
    artisan: { name: '', village: '', district: '', craftType: '' }
  })
  const [status, setStatus] = useState('idle') // idle, minting, success
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [mine, setMine] = useState([])

  useEffect(() => {
    const u = localStorage.getItem('cc_user')
    if (!u) { router.push('/auth'); return }
    const parsed = JSON.parse(u)
    if (parsed.role !== 'ngo' && parsed.role !== 'admin') { router.push('/'); return }
    setUser(parsed)
    fetch('/api/products').then(r=>r.json()).then(d => setMine(Array.isArray(d) ? d : []))
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setStatus('minting'); setError(''); setResult(null)
    try {
      const token = localStorage.getItem('cc_token')
      const images = form.images.split(',').map(s=>s.trim()).filter(Boolean)
      const body = { ...form, price: Number(form.price), images }
      const r = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Mint failed')
      setResult(d); setStatus('success')
      fetch('/api/products').then(r=>r.json()).then(x => setMine(Array.isArray(x) ? x : []))
    } catch(e) { setError(e.message); setStatus('idle') }
  }

  const reset = () => { setStatus('idle'); setResult(null); setForm({ name:'',price:'',category:'Textiles',materials:'',description:'',images:'',artisan:{name:'',village:'',district:'',craftType:''}}) }

  return (
    <div className="min-h-screen">
      <Nav/>
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="chip-verified mb-3"><ShieldCheck size={14}/> NGO Console</div>
        <h1 className="font-heading text-[38px] font-bold text-[#2C1E21] leading-tight">Register a new product</h1>
        <p className="text-[15px] text-[#6E5A5E] mt-2">Adding a product mints a new ERC-721 certificate on Ethereum Sepolia. Each mint takes 10-20 seconds.</p>

        <div className="grid md:grid-cols-3 gap-8 mt-8">
          <div className="md:col-span-2">
            {status === 'success' && result ? (
              <div className="bg-white rounded-2xl border border-[#00897B]/30 p-8 card-warm-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-full bg-[#00897B] flex items-center justify-center"><Check size={20} className="text-white"/></div>
                  <div>
                    <div className="font-heading text-[22px] font-bold text-[#2C1E21]">Minted on Sepolia</div>
                    <div className="text-[13px] text-[#6E5A5E]">{result.name} is now a verifiable on-chain certificate.</div>
                  </div>
                </div>
                <div className="space-y-3 text-[13px]">
                  <div><span className="text-[#6E5A5E] uppercase text-[11px] tracking-wider">Token ID</span><div className="font-heading font-bold text-[24px] text-[#2C1E21]">#{result.tokenId}</div></div>
                  <div>
                    <span className="text-[#6E5A5E] uppercase text-[11px] tracking-wider">Transaction hash</span>
                    <a href={`https://sepolia.etherscan.io/tx/${result.mintTxHash}`} target="_blank" rel="noopener noreferrer" className="hash-mono block text-[#702935] hover:underline mt-1 break-all">
                      {result.mintTxHash} <ExternalLink size={11} className="inline"/>
                    </a>
                  </div>
                  <div>
                    <span className="text-[#6E5A5E] uppercase text-[11px] tracking-wider">Contract</span>
                    <div className="hash-mono mt-1">{result.contractAddress}</div>
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button onClick={reset} className="btn-cta"><Plus size={16}/> Add another</button>
                  <Link href={`/products/${result.id}`} className="btn-outline">View product page</Link>
                  <Link href={`/verify?token=${result.tokenId}`} className="btn-outline">Verify page</Link>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="bg-white rounded-2xl border border-[#E7DDD6] p-6 card-warm space-y-3">
                <div className="grid md:grid-cols-2 gap-3">
                  <div><Label>Product name</Label><input required className="input-heritage" value={form.name} onChange={e=>setForm({...form, name: e.target.value})}/></div>
                  <div><Label>Price (INR)</Label><input required type="number" className="input-heritage" value={form.price} onChange={e=>setForm({...form, price: e.target.value})}/></div>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div><Label>Category</Label>
                    <select className="input-heritage" value={form.category} onChange={e=>setForm({...form, category: e.target.value})}>
                      <option>Textiles</option><option>Pottery</option><option>Woodcraft</option><option>Metalcraft</option><option>Painting</option>
                    </select>
                  </div>
                  <div><Label>Materials</Label><input className="input-heritage" value={form.materials} onChange={e=>setForm({...form, materials: e.target.value})}/></div>
                </div>
                <div><Label>Description</Label><textarea rows={3} className="input-heritage" value={form.description} onChange={e=>setForm({...form, description: e.target.value})}/></div>
                <div><Label>Image URLs (comma separated)</Label><input required className="input-heritage" placeholder="https://..." value={form.images} onChange={e=>setForm({...form, images: e.target.value})}/></div>
                <div className="pt-4 border-t border-[#E7DDD6]">
                  <div className="text-[12px] uppercase tracking-wider text-[#6E5A5E] mb-2">Artisan</div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <input required className="input-heritage" placeholder="Artisan name" value={form.artisan.name} onChange={e=>setForm({...form, artisan: {...form.artisan, name: e.target.value}})}/>
                    <input className="input-heritage" placeholder="Craft type" value={form.artisan.craftType} onChange={e=>setForm({...form, artisan: {...form.artisan, craftType: e.target.value}})}/>
                    <input className="input-heritage" placeholder="Village" value={form.artisan.village} onChange={e=>setForm({...form, artisan: {...form.artisan, village: e.target.value}})}/>
                    <input className="input-heritage" placeholder="District, State" value={form.artisan.district} onChange={e=>setForm({...form, artisan: {...form.artisan, district: e.target.value}})}/>
                  </div>
                </div>
                {error && <div className="text-[13px] text-[#8B2635] bg-[#8B2635]/10 rounded-lg px-3 py-2">{error}</div>}
                <button disabled={status==='minting'} className="btn-cta w-full justify-center mt-4">
                  {status === 'minting' ? <><Loader2 className="animate-spin" size={18}/> Minting on Sepolia… (10-20s)</> : <><Sparkles size={16}/> Register & Mint NFT</>}
                </button>
              </form>
            )}
          </div>

          <div>
            <div className="bg-white rounded-2xl border border-[#E7DDD6] p-5 card-warm">
              <div className="font-heading font-bold text-[15px] text-[#2C1E21] mb-3">Marketplace inventory</div>
              <div className="space-y-2 max-h-[500px] overflow-auto">
                {mine.slice(0, 20).map(p => (
                  <Link href={`/products/${p.id}`} key={p.id} className="flex gap-3 items-center p-2 rounded-lg hover:bg-[#F9F6F0]">
                    <img src={p.images?.[0]} className="w-12 h-12 rounded-lg object-cover" alt=""/>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-[#2C1E21] truncate">{p.name}</div>
                      <div className="text-[11px] text-[#6E5A5E]">#{p.tokenId} · ₹{Number(p.price).toLocaleString('en-IN')}</div>
                    </div>
                  </Link>
                ))}
                {mine.length === 0 && <div className="text-[13px] text-[#6E5A5E] py-4 text-center">No products yet.</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer/>
    </div>
  )
}
function Label({ children }) { return <label className="block text-[12px] uppercase tracking-wider text-[#6E5A5E] mb-1">{children}</label> }
export default NgoDashboard
