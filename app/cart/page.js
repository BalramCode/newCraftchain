'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { Trash2, Loader2, ShieldCheck, ExternalLink, Check } from 'lucide-react'

function CartPage() {
  const [cart, setCart] = useState([])
  const [buyerAddress, setBuyerAddress] = useState('')
  const [processing, setProcessing] = useState(false)
  const [orders, setOrders] = useState(null)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const c = JSON.parse(localStorage.getItem('cc_cart') || '[]')
    setCart(c)
  }, [])

  const remove = (id) => {
    const c = cart.filter(x => x.id !== id)
    localStorage.setItem('cc_cart', JSON.stringify(c))
    setCart(c)
    window.dispatchEvent(new Event('cc_cart_updated'))
  }

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') { alert('MetaMask not detected. Skipping wallet — NFT will be held in NGO custody.'); return }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      setBuyerAddress(accounts[0])
    } catch(e) { alert('Wallet connect failed') }
  }

  const total = cart.reduce((s,i)=> s + Number(i.price), 0)

  const checkout = async () => {
    const token = localStorage.getItem('cc_token')
    if (!token) { router.push('/auth'); return }
    setProcessing(true); setError('')
    const results = []
    try {
      for (const item of cart) {
        const r = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ productId: item.id, buyerWalletAddress: buyerAddress || null })
        })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Order failed')
        results.push(d)
      }
      setOrders(results)
      localStorage.setItem('cc_cart', '[]')
      window.dispatchEvent(new Event('cc_cart_updated'))
    } catch (e) { setError(e.message) } finally { setProcessing(false) }
  }

  if (orders) {
    return (
      <div className="min-h-screen">
        <Nav/>
        <div className="max-w-3xl mx-auto px-6 py-16">
          <div className="bg-white rounded-2xl border border-[#00897B]/30 p-8 card-warm-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#00897B]/15 flex items-center justify-center"><Check size={20} className="text-[#00897B]"/></div>
              <div>
                <h1 className="font-heading text-[24px] font-bold text-[#2C1E21]">Order confirmed</h1>
                <p className="text-[13px] text-[#6E5A5E]">Ownership has been recorded on-chain.</p>
              </div>
            </div>
            <div className="space-y-4 mt-6">
              {orders.map(o => (
                <div key={o.id} className="rounded-xl border border-[#E7DDD6] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-heading font-bold text-[15px] text-[#2C1E21]">{o.productName}</div>
                      <div className="text-[12px] text-[#6E5A5E]">Token #{o.tokenId} · ₹{Number(o.price).toLocaleString('en-IN')}</div>
                    </div>
                    <span className="chip-verified"><ShieldCheck size={12}/> {o.status}</span>
                  </div>
                  {o.transferTxHash ? (
                    <a href={`https://sepolia.etherscan.io/tx/${o.transferTxHash}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 hash-mono text-[#702935] hover:underline break-all">
                      Transfer tx: {o.transferTxHash} <ExternalLink size={12}/>
                    </a>
                  ) : (
                    <div className="mt-3 text-[12px] text-[#6E5A5E]">Held in NGO custody — no wallet provided. You can claim later.</div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <Link href="/products" className="btn-outline">Keep browsing</Link>
              <Link href="/verify" className="btn-cta">Verify certificate</Link>
            </div>
          </div>
        </div>
        <Footer/>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Nav/>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="font-heading text-[38px] font-bold text-[#2C1E21]">Your Cart</h1>
        {cart.length === 0 ? (
          <div className="mt-10 text-center py-16 text-[#6E5A5E]">
            Your cart is empty. <Link href="/products" className="text-[#702935] underline">Explore products</Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8 mt-8">
            <div className="md:col-span-2 space-y-3">
              {cart.map(item => (
                <div key={item.id} className="bg-white rounded-2xl border border-[#E7DDD6] card-warm p-4 flex items-center gap-4">
                  <img src={item.image} alt={item.name} className="w-20 h-20 rounded-xl object-cover"/>
                  <div className="flex-1">
                    <div className="font-heading font-bold text-[16px] text-[#2C1E21]">{item.name}</div>
                    <div className="text-[12px] text-[#6E5A5E]">Token #{item.tokenId}</div>
                  </div>
                  <div className="font-heading font-bold text-[16px] text-[#2C1E21]">₹{Number(item.price).toLocaleString('en-IN')}</div>
                  <button onClick={()=>remove(item.id)} className="p-2 text-[#6E5A5E] hover:text-[#8B2635]"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
            <div>
              <div className="bg-white rounded-2xl border border-[#E7DDD6] p-6 card-warm sticky top-24">
                <div className="flex items-center justify-between text-[15px]">
                  <span className="text-[#6E5A5E]">Subtotal</span>
                  <span className="font-heading font-bold text-[#2C1E21]">₹{total.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between text-[13px] mt-2 text-[#6E5A5E]">
                  <span>Shipping</span><span>Free</span>
                </div>
                <div className="h-px bg-[#E7DDD6] my-4"/>
                <div className="flex items-center justify-between text-[17px]">
                  <span className="font-heading font-bold text-[#2C1E21]">Total</span>
                  <span className="font-heading font-bold text-[#702935]">₹{total.toLocaleString('en-IN')}</span>
                </div>

                <div className="mt-5">
                  <label className="text-[12px] uppercase tracking-wider text-[#6E5A5E]">Delivery wallet (optional)</label>
                  <div className="flex gap-2 mt-1.5">
                    <input value={buyerAddress} onChange={e=>setBuyerAddress(e.target.value)} placeholder="0x… (leave empty for custody)" className="input-heritage flex-1 text-[12px]"/>
                    <button onClick={connectWallet} className="btn-outline text-[12px] py-2 px-3">Connect</button>
                  </div>
                  <p className="text-[11px] text-[#6E5A5E] mt-1.5">If you provide a wallet, the NFT transfers to you on purchase. Otherwise it stays in NGO custody until you claim.</p>
                </div>

                {error && <div className="mt-3 text-[13px] text-[#8B2635] bg-[#8B2635]/10 rounded-lg px-3 py-2">{error}</div>}

                <button disabled={processing} onClick={checkout} className="btn-cta w-full justify-center mt-5">
                  {processing ? <><Loader2 className="animate-spin" size={18}/> Confirming on-chain…</> : 'Pay now (mock) — finalize on-chain'}
                </button>
                <p className="text-[11px] text-[#6E5A5E] mt-2 text-center">Payment is mocked. Ownership transfer is real, on Sepolia.</p>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer/>
    </div>
  )
}
export default CartPage
