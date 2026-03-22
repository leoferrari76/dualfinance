'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, ArrowLeftRight, CreditCard, Tag, Users, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Lançamentos', icon: ArrowLeftRight },
  { href: '/cards', label: 'Cartões', icon: CreditCard },
  { href: '/categories', label: 'Categorias', icon: Tag },
  { href: '/invite', label: 'Conectar casal', icon: Users },
]

export default function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-56 bg-white border-r border-gray-100 flex flex-col">
      <div className="px-6 py-5 border-b border-gray-100">
        <p className="text-lg font-bold text-indigo-600">DuoFinance</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{userName}</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </aside>
  )
}
