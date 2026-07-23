'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { Reveal } from '@/components/Motion'
import { Loader2, ShieldCheck, ExternalLink, Sparkles, Plus, Check, Upload, X, Image as ImageIcon } from 'lucide-react'

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

  const submit = async (e) => {
    e.preventDefault()
    const validUrls = uploads.filter(u => u.url).map(u => u.url)
    if (validUrls.length === 0) { setError('Upload at least one product image'); return }
    setStatus('minting'); setError(''); setResult(null)
    try {
      const token = localStorage.getItem('cc_token')
      const body = { ...form, price: Number(form.price), images: validUrls }
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
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="max-w-6xl mx-auto px-6 py-10">
        <Reveal>
          <div className="chip-verified mb-3"><ShieldCheck size={14} /> NGO Console</div>
          <h1 className="font-heading text-[38px] font-bold text-[#2C1E21] leading-tight">Register a new product</h1>
          <p className="text-[15px] text-[#6E5A5E] mt-2">Adding a product mints a new ERC-721 certificate on Ethereum Sepolia. Each mint takes 10-20 seconds.</p>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-8 mt-8">
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
                    <Link href={`/verify?token=${result.tokenId}`} className="btn-outline">Verify page</Link>
                  </div>
                </div>
              </Reveal>
            ) : (
              <Reveal>
                <form
                  onSubmit={submit}
                  className="bg-white rounded-2xl border border-[#E7DDD6] p-6 card-warm space-y-5"
                >

                  {/* PRODUCT INFORMATION */}
                  <div>


                    <div className="grid md:grid-cols-2 gap-3">

                      <div>
                        <Label>Product name</Label>
                        <input
                          required
                          className="input-heritage"
                          value={form.name}
                          onChange={e =>
                            setForm({ ...form, name: e.target.value })
                          }
                          placeholder="e.g. Sambalpuri Handloom Saree"
                        />
                      </div>

                      <div>
                        <Label>Price (INR)</Label>
                        <input
                          required
                          type="number"
                          className="input-heritage"
                          value={form.price}
                          onChange={e =>
                            setForm({ ...form, price: e.target.value })
                          }
                          placeholder="Enter price"
                        />
                      </div>

                      <div>
                        <Label>Category</Label>
                        <select
                          className="input-heritage"
                          value={form.category}
                          onChange={e =>
                            setForm({ ...form, category: e.target.value })
                          }
                        >
                          <option>Textiles</option>
                          <option>Pottery</option>
                          <option>Woodcraft</option>
                          <option>Metalcraft</option>
                          <option>Painting</option>
                        </select>
                      </div>

                      <div>
                        <Label>Material</Label>
                        <input
                          className="input-heritage"
                          value={form.materials}
                          onChange={e =>
                            setForm({ ...form, materials: e.target.value })
                          }
                          placeholder="e.g. Cotton, Silk, Clay"
                        />
                      </div>

                    </div>

                    <div className="mt-3">
                      <Label>Description</Label>
                      <textarea
                        rows={3}
                        className="input-heritage"
                        value={form.description}
                        onChange={e =>
                          setForm({ ...form, description: e.target.value })
                        }
                        placeholder="Describe the product, its story, or traditional technique..."
                      />
                    </div>
                  </div>


                  {/* IMAGE UPLOAD */}
                  <div>
                    <Label>Product photos</Label>
                    <label className="block cursor-pointer">
                      <input type="file" accept="image/*" multiple hidden onChange={e => handleFiles(e.target.files)} />
                      <div className="border-2 border-dashed border-[#E7DDD6] rounded-xl p-6 text-center hover:border-[#702935] hover:bg-[#F9F6F0] transition">
                        <Upload size={22} className="text-[#702935] mx-auto mb-2" />
                        <div className="text-[13px] font-medium text-[#2C1E21]">Click to upload or drag & drop</div>
                        <div className="text-[11px] text-[#6E5A5E] mt-1">JPG/PNG · you can pick multiple</div>
                      </div>
                    </label>
                    {uploads.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 mt-3">
                        {uploads.map((u, i) => (
                          <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-[#EFE7DE] border border-[#E7DDD6]">
                            {u.uploading ? (
                              <div className="w-full h-full flex flex-col items-center justify-center text-[#6E5A5E]">
                                <Loader2 size={16} className="animate-spin mb-1" />
                                <span className="text-[10px]">Uploading…</span>
                              </div>
                            ) : u.error ? (
                              <div className="w-full h-full flex items-center justify-center bg-[#8B2635]/10 text-[10px] text-[#8B2635] p-2 text-center">{u.error}</div>
                            ) : (
                              <>
                                <img src={u.url} className="w-full h-full object-cover" />
                                <button type="button" onClick={() => removeUpload(i)} className="absolute top-1 right-1 bg-black/60 rounded-full p-1 hover:bg-black text-white">
                                  <X size={11} />
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>


                  {/* ARTISAN INFORMATION */}
                  <div className="pt-4 border-t border-[#E7DDD6]">

                    <div className="text-[12px] uppercase tracking-wider text-[#6E5A5E] mb-3">
                      Artisan Information
                    </div>

                    <div className="grid md:grid-cols-2 gap-3">

                      <input
                        required
                        className="input-heritage"
                        placeholder="Artisan name"
                        value={form.artisan.name}
                        onChange={e =>
                          setForm({
                            ...form,
                            artisan: {
                              ...form.artisan,
                              name: e.target.value
                            }
                          })
                        }
                      />

                      <input
                        className="input-heritage"
                        placeholder="Craft type (e.g. Handloom)"
                        value={form.artisan.craftType}
                        onChange={e =>
                          setForm({
                            ...form,
                            artisan: {
                              ...form.artisan,
                              craftType: e.target.value
                            }
                          })
                        }
                      />

                      <input
                        className="input-heritage"
                        placeholder="Village"
                        value={form.artisan.village}
                        onChange={e =>
                          setForm({
                            ...form,
                            artisan: {
                              ...form.artisan,
                              village: e.target.value
                            }
                          })
                        }
                      />

                      <input
                        className="input-heritage"
                        placeholder="District, State"
                        value={form.artisan.district}
                        onChange={e =>
                          setForm({
                            ...form,
                            artisan: {
                              ...form.artisan,
                              district: e.target.value
                            }
                          })
                        }
                      />

                    </div>
                  </div>


                  {/* ERROR */}
                  {error && (
                    <div className="text-[13px] text-[#8B2635]
                      bg-[#8B2635]/10 rounded-lg px-3 py-2">
                      {error}
                    </div>
                  )}


                  {/* SUBMIT */}
                  <button
                    disabled={status === 'minting'}
                    className="btn-cta w-full justify-center mt-2"
                  >
                    {status === 'minting' ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Minting on Sepolia… (10–20s)
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        Register & Mint NFT
                      </>
                    )}
                  </button>

                </form>
              </Reveal>
            )}
          </div>

          <Reveal delay={0.1}>
            <div className="bg-white rounded-2xl border border-[#E7DDD6] p-5 card-warm">
              <div className="font-heading font-bold text-[15px] text-[#2C1E21] mb-3">Marketplace inventory</div>
              <div className="space-y-2 max-h-[520px] overflow-auto">
                {mine.slice(0, 30).map(p => (
                  <Link href={`/products/${p.id}`} key={p.id} className="flex gap-3 items-center p-2 rounded-lg hover:bg-[#F9F6F0]">
                    <img src={p.images?.[0]} className="w-12 h-12 rounded-lg object-cover" alt="" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-[#2C1E21] truncate">{p.name}</div>
                      <div className="text-[11px] text-[#6E5A5E]">#{p.tokenId} · ₹{Number(p.price).toLocaleString('en-IN')}</div>
                    </div>
                  </Link>
                ))}
                {mine.length === 0 && <div className="text-[13px] text-[#6E5A5E] py-4 text-center">No products yet.</div>}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
      <Footer />
    </div>
  )
}
function Label({ children }) { return <label className="block text-[12px] uppercase tracking-wider text-[#6E5A5E] mb-1">{children}</label> }
export default NgoDashboard
