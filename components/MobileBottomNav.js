'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Home, ShoppingBag, ShoppingCart, User } from 'lucide-react'

function getUserDashboard(user) {
  if (!user) return '/auth'
  if (user.role === 'ngo') return '/dashboard/ngo'
  if (user.role === 'admin') return '/dashboard/admin'
  return '/dashboard/customer'
}

export default function MobileBottomNav() {
  const pathname = usePathname()
  const [user, setUser] = useState(null)
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    const syncNavState = () => {
      const storedUser = localStorage.getItem('cc_user')
      const storedCart = JSON.parse(localStorage.getItem('cc_cart') || '[]')
      setUser(storedUser ? JSON.parse(storedUser) : null)
      setCartCount(storedCart.reduce((sum, item) => sum + Number(item.quantity || 1), 0))
    }

    syncNavState()
    window.addEventListener('storage', syncNavState)
    window.addEventListener('cc_cart_updated', syncNavState)
    return () => {
      window.removeEventListener('storage', syncNavState)
      window.removeEventListener('cc_cart_updated', syncNavState)
    }
  }, [])

  const tabs = [
    { href: '/', label: 'Home', icon: Home, active: pathname === '/' },
    { href: '/products', label: 'Shop', icon: ShoppingBag, active: pathname?.startsWith('/products') },
    { href: '/cart', label: 'Cart', icon: ShoppingCart, active: pathname === '/cart', badge: cartCount },
    {
      href: getUserDashboard(user),
      label: 'Me',
      icon: User,
      active: pathname?.startsWith('/dashboard') || pathname === '/auth',
    },
  ]

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[#E7DDD6] bg-[#F9F6F0]/95 shadow-[0_-8px_28px_rgba(44,30,33,0.10)] backdrop-blur md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Mobile primary navigation"
    >
      <div className="grid h-[68px] grid-cols-4 px-2">
        {tabs.map(({ href, label, icon: Icon, active, badge }) => (
          <Link
            key={label}
            href={href}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            className={`relative flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold transition-colors duration-200 ${
              active ? 'text-[#702935]' : 'text-[#6E5A5E] hover:text-[#2C1E21]'
            }`}
          >
            <span
              className={`relative flex h-7 w-9 items-center justify-center rounded-full transition-all duration-200 ${
                active ? 'bg-[#702935]/10' : 'bg-transparent'
              }`}
            >
              <Icon size={21} strokeWidth={active ? 2.4 : 2} />
              {label === 'Cart' && badge > 0 && (
                <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-[#8B2635] px-1.5 text-[10px] font-bold leading-5 text-white">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </span>
            <span className="leading-none">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
