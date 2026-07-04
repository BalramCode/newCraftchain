'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/Nav'
import { Loader2, ArrowRight } from 'lucide-react'

function AuthPage() {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'customer' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const url = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const body = mode === 'login' ? { email: form.email, password: form.password } : form
      const r = await fetch(url, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed')
      localStorage.setItem('cc_token', d.token)
      localStorage.setItem('cc_user', JSON.stringify(d.user))
      window.dispatchEvent(new Event('cc_cart_updated'))
      const dest = d.user.role === 'admin' ? '/dashboard/admin'
        : d.user.role === 'ngo' ? '/dashboard/ngo'
        : d.user.role === 'customer' ? '/dashboard/customer'
        : '/products'
      window.location.href = dest
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen">
      <Nav/>
      <div className="max-w-md mx-auto px-6 py-16">
        <div className="bg-white rounded-2xl p-8 border border-[#E7DDD6] card-warm-lg">
          <h1 className="font-heading text-[28px] font-bold text-[#2C1E21]">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
          <p className="text-[14px] text-[#6E5A5E] mt-1">{mode === 'login' ? 'Sign in to CraftChain to buy or verify products.' : 'Join as a customer, artisan, or NGO.'}</p>

          <form onSubmit={submit} className="mt-6 space-y-3">
            {mode === 'register' && (
              <input required placeholder="Full name" className="input-heritage" value={form.name} onChange={e=>setForm({...form, name: e.target.value})}/>
            )}
            <input required type="email" placeholder="Email" className="input-heritage" value={form.email} onChange={e=>setForm({...form, email: e.target.value})}/>
            <input required type="password" placeholder="Password" className="input-heritage" value={form.password} onChange={e=>setForm({...form, password: e.target.value})}/>
            {mode === 'register' && (
              <select className="input-heritage" value={form.role} onChange={e=>setForm({...form, role: e.target.value})}>
                <option value="customer">Customer</option>
                <option value="ngo">NGO / Cooperative</option>
                <option value="artisan">Artisan</option>
              </select>
            )}
            {error && <div className="text-[13px] text-[#8B2635] bg-[#8B2635]/10 rounded-lg px-3 py-2">{error}</div>}
            <button type="submit" disabled={loading} className="btn-cta w-full justify-center">
              {loading ? <Loader2 className="animate-spin" size={18}/> : <>{mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={16}/></>}
            </button>
          </form>

          <div className="mt-6 text-center text-[13px] text-[#6E5A5E]">
            {mode === 'login' ? (
              <>Don’t have an account? <button className="text-[#702935] font-medium hover:underline" onClick={()=>setMode('register')}>Sign up</button></>
            ) : (
              <>Already registered? <button className="text-[#702935] font-medium hover:underline" onClick={()=>setMode('login')}>Sign in</button></>
            )}
          </div>

          <div className="mt-6 pt-5 border-t border-[#E7DDD6] text-[12px] text-[#6E5A5E]">
            <div className="font-medium text-[#2C1E21] mb-1.5">Demo accounts</div>
            <div>NGO: <span className="hash-mono">ngo@craftchain.in / craftchain123</span></div>
            <div>Buyer: <span className="hash-mono">buyer@craftchain.in / buyer123</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
export default AuthPage
