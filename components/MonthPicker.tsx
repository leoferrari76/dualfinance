'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function MonthPicker({ value }: { value: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function navigate(month: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('month', month)
    router.push(`${pathname}?${params.toString()}`)
  }

  function shift(delta: number) {
    const [year, month] = value.split('-').map(Number)
    const date = new Date(year, month - 1 + delta)
    const next = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    navigate(next)
  }

  const [year, month] = value.split('-').map(Number)
  const label = new Date(year, month - 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => shift(-1)}
        className="p-1.5 rounded-lg transition-colors"
        style={{ color: 'var(--faint)' }}
      >
        <ChevronLeft size={16} />
      </button>

      <input
        type="month"
        value={value}
        onChange={e => navigate(e.target.value)}
        className="sr-only"
        id="month-input"
      />
      <label
        htmlFor="month-input"
        className="px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer capitalize transition-colors min-w-36 text-center"
        style={{ color: 'var(--ink)', background: 'var(--receipt)' }}
      >
        {label}
      </label>

      <button
        onClick={() => shift(1)}
        className="p-1.5 rounded-lg transition-colors"
        style={{ color: 'var(--faint)' }}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
