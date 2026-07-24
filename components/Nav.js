'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { ShoppingBag, ShieldCheck, Compass, LayoutDashboard, LogOut, User, Menu, X } from 'lucide-react'

export default function Nav() {
  const [user, setUser] = useState(null)
  const [cartCount, setCartCount] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const u = typeof window !== 'undefined' ? localStorage.getItem('cc_user') : null
    if (u) setUser(JSON.parse(u))
    const cart = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('cc_cart') || '[]') : []
    setCartCount(cart.reduce((sum, item) => sum + Number(item.quantity || 1), 0))
    const onStorage = () => {
      const u2 = localStorage.getItem('cc_user')
      setUser(u2 ? JSON.parse(u2) : null)
      const c = JSON.parse(localStorage.getItem('cc_cart') || '[]')
      setCartCount(c.reduce((sum, item) => sum + Number(item.quantity || 1), 0))
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('cc_cart_updated', onStorage)
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('cc_cart_updated', onStorage) }
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  useEffect(() => {
    setMobileOpen(false)
  }, [router])

  const logout = () => {
    localStorage.removeItem('cc_user')
    localStorage.removeItem('cc_token')
    setUser(null)
    setMobileOpen(false)
    router.push('/')
  }
  const navLinks = [
    { href: '/products', label: 'Shop', icon: ShoppingBag },
    { href: '/verify', label: 'Verify', icon: ShieldCheck },
    { href: '/explorer', label: 'Explorer', icon: Compass },
  ];

  if (user?.role === 'ngo') navLinks.push({ href: '/dashboard/ngo', label: 'NGO Dashboard', icon: LayoutDashboard })
  if (user?.role === 'admin') navLinks.push({ href: '/dashboard/admin', label: 'Admin Dashboard', icon: LayoutDashboard })
  if (user?.role === 'customer') navLinks.push({ href: '/dashboard/customer', label: 'My Account', icon: LayoutDashboard })

  return (
    <nav className="sticky top-0 z-40 backdrop-blur bg-[#F9F6F0]/85 border-b border-[#E7DDD6]">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group" onClick={() => setMobileOpen(false)}>
          <div className="w-8 h-8 rounded-lg bg-[#702935] flex items-center justify-center text-white font-bold font-heading">C</div>
          <span className="font-heading font-bold text-[17px] text-[#2C1E21] tracking-tight">CraftChain</span>
        </Link>

        <div className="hidden md:flex items-center gap-7 text-[14px]">
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} className="text-[#2C1E21] hover:text-[#702935] font-medium flex items-center gap-1.5">
              {link.icon && <link.icon size={15} />}{link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/cart" className="relative p-2 rounded-lg hover:bg-white transition">
            <ShoppingBag size={20} className="text-[#2C1E21]" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#8B2635] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">{cartCount}</span>
            )}
          </Link>

          {user ? (
            <div className="hidden sm:flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#E7DDD6]">
                <User size={14} className="text-[#702935]" />
                <span className="text-[13px] font-medium text-[#2C1E21]">{user.name}</span>
                <span className="text-[10px] uppercase tracking-wide text-[#702935] font-bold">{user.role}</span>
              </div>
              <button onClick={logout} className="p-2 rounded-lg hover:bg-white transition" title="Sign out"><LogOut size={18} className="text-[#6E5A5E]" /></button>
            </div>
          ) : (
            <Link href="/auth" className="hidden sm:inline-flex btn-cta text-[14px] py-2 px-4">Sign in</Link>
          )}

          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 rounded-lg hover:bg-white transition"
            aria-label="Open menu"
          >
            <Menu size={24} className="text-[#2C1E21]" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(44, 30, 33, 0.55)',
                zIndex: 9998,
              }}
              className="md:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                height: '100dvh',
                width: '82%',
                maxWidth: '384px',
                backgroundColor: '#F9F6F0',
                zIndex: 9999,
                boxShadow: '-8px 0 40px rgba(44,30,33,0.25)',
                display: 'flex',
                flexDirection: 'column',
              }}
              className="md:hidden"
            >
              <div className="flex items-center justify-between h-16 px-6 border-b border-[#E7DDD6] shrink-0">
                <span className="font-heading font-bold text-[17px] text-[#2C1E21]">Menu</span>
                <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-white transition" aria-label="Close menu">
                  <X size={22} className="text-[#2C1E21]" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-1" style={{ backgroundColor: '#F9F6F0' }}>
                {user && (
                  <div className="flex items-center gap-2 px-3 py-2.5 mb-4 rounded-xl bg-white border border-[#E7DDD6] shrink-0">
                    <User size={16} className="text-[#702935]" />
                    <span className="text-[14px] font-medium text-[#2C1E21] flex-1">{user.name}</span>
                    <span className="text-[10px] uppercase tracking-wide text-[#702935] font-bold">{user.role}</span>
                  </div>
                )}

                {navLinks.map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.05 + i * 0.05 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3 py-3.5 rounded-xl text-[15px] font-medium text-[#2C1E21] hover:bg-white hover:text-[#702935] transition"
                    >
                      {link.icon && <link.icon size={18} />}{link.label}
                    </Link>
                  </motion.div>
                ))}

                {user && (
                  <motion.div
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.05 + navLinks.length * 0.05 }}
                    className="mt-4 pt-4 border-t border-[#E7DDD6]"
                  >
                    <button
                      onClick={logout}
                      className="flex w-full items-center gap-3 px-3 py-3.5 rounded-xl text-[15px] font-medium text-[#8B2635] hover:bg-[#8B2635]/10 transition"
                    >
                      <LogOut size={18} /> Sign out
                    </button>
                  </motion.div>
                )}
              </div>

              {!user && (
                <div className="px-6 py-6 border-t border-[#E7DDD6] shrink-0" style={{ backgroundColor: '#F9F6F0' }}>
                  <Link href="/auth" onClick={() => setMobileOpen(false)} className="btn-cta w-full justify-center">
                    Sign in
                  </Link>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  )
}
