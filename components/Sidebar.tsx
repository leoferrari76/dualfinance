'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, ArrowLeftRight, CreditCard, Tag, Users, LogOut, BarChart2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Lançamentos', icon: ArrowLeftRight },
  { href: '/cards', label: 'Cartões', icon: CreditCard },
  { href: '/categories', label: 'Categorias', icon: Tag },
  { href: '/analise', label: 'Análise', icon: BarChart2 },
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
    <aside className="w-56 flex flex-col" style={{ background: 'var(--chumbo)' }}>
      <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-base font-medium" style={{ color: 'var(--ledger)', fontFamily: 'var(--font-display)' }}>DuoFinance</p>
        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--faint)' }}>{userName}</p>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors rounded-lg"
              style={active ? {
                color: 'var(--ledger)',
                borderLeft: '2px solid var(--ledger)',
                paddingLeft: '10px',
                background: 'rgba(200,169,110,0.08)',
              } : {
                color: 'var(--faint)',
              }}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-2 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ color: 'var(--faint)' }}
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </aside>
  )
}
