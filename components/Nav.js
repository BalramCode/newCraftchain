'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingBag, Search, Shield, LayoutDashboard, LogOut, User } from 'lucide-react'

export default function Nav() {
  const [user, setUser] = useState(null)
  const [cartCount, setCartCount] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const u = typeof window !== 'undefined' ? localStorage.getItem('cc_user') : null
    if (u) setUser(JSON.parse(u))
    const cart = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('cc_cart') || '[]') : []
    setCartCount(cart.length)
    const onStorage = () => {
      const u2 = localStorage.getItem('cc_user')
      setUser(u2 ? JSON.parse(u2) : null)
      const c = JSON.parse(localStorage.getItem('cc_cart') || '[]')
      setCartCount(c.length)
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('cc_cart_updated', onStorage)
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('cc_cart_updated', onStorage) }
  }, [])

  const logout = () => {
    localStorage.removeItem('cc_user')
    localStorage.removeItem('cc_token')
    setUser(null)
    router.push('/')
  }

  return (
    <nav className="sticky top-0 z-40 backdrop-blur bg-[#F9F6F0]/85 border-b border-[#E7DDD6]">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-[#702935] flex items-center justify-center text-white font-bold font-heading">C</div>
          <span className="font-heading font-bold text-[17px] text-[#2C1E21] tracking-tight">CraftChain</span>
        </Link>
        <div className="hidden md:flex items-center gap-7 text-[14px]">
          <Link href="/products" className="text-[#2C1E21] hover:text-[#702935] font-medium">Marketplace</Link>
          <Link href="/verify" className="text-[#2C1E21] hover:text-[#702935] font-medium flex items-center gap-1.5"><Shield size={15}/>Verify</Link>
          <Link href="/explorer" className="text-[#2C1E21] hover:text-[#702935] font-medium">Explorer</Link>
          {user?.role === 'ngo' && (
            <Link href="/dashboard/ngo" className="text-[#2C1E21] hover:text-[#702935] font-medium flex items-center gap-1.5"><LayoutDashboard size={15}/>NGO</Link>
          )}
          {user?.role === 'admin' && (
            <Link href="/dashboard/admin" className="text-[#2C1E21] hover:text-[#702935] font-medium flex items-center gap-1.5"><LayoutDashboard size={15}/>Admin</Link>
          )}
          {user?.role === 'customer' && (
            <Link href="/dashboard/customer" className="text-[#2C1E21] hover:text-[#702935] font-medium flex items-center gap-1.5"><LayoutDashboard size={15}/>My account</Link>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/cart" className="relative p-2 rounded-lg hover:bg-white transition">
            <ShoppingBag size={20} className="text-[#2C1E21]"/>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#8B2635] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">{cartCount}</span>
            )}
          </Link>
          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#E7DDD6]">
                <User size={14} className="text-[#702935]"/>
                <span className="text-[13px] font-medium text-[#2C1E21]">{user.name}</span>
                <span className="text-[10px] uppercase tracking-wide text-[#702935] font-bold">{user.role}</span>
              </div>
              <button onClick={logout} className="p-2 rounded-lg hover:bg-white transition" title="Sign out"><LogOut size={18} className="text-[#6E5A5E]"/></button>
            </div>
          ) : (
            <Link href="/auth" className="btn-cta text-[14px] py-2 px-4">Sign in</Link>
          )}
        </div>
      </div>
    </nav>
  )
}
