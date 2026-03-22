'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Transaction } from '@/types'

export default function TransactionList({ transactions }: { transactions: Transaction[] }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeleting(id)
    const supabase = createClient()
    await supabase.from('transactions').delete().eq('id', id)
    setDeleting(null)
    router.refresh()
  }

  const fixed = transactions.filter(t => t.is_fixed)
  const oneOff = transactions.filter(t => !t.is_fixed)

  return (
    <div className="space-y-4">
      {fixed.length > 0 && (
        <Section
          title="Fixos"
          transactions={fixed}
          onDelete={handleDelete}
          deleting={deleting}
        />
      )}
      {oneOff.length > 0 && (
        <Section
          title="Avulsos"
          transactions={oneOff}
          onDelete={handleDelete}
          deleting={deleting}
        />
      )}
      {transactions.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <p className="text-sm text-gray-400">Nenhum lançamento ainda.</p>
        </div>
      )}
    </div>
  )
}

function Section({
  title,
  transactions,
  onDelete,
  deleting,
}: {
  title: string
  transactions: Transaction[]
  onDelete: (id: string) => void
  deleting: string | null
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-50">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
      </div>
      <ul className="divide-y divide-gray-50">
        {transactions.map(t => {
          const cat = Array.isArray(t.category) ? t.category[0] : t.category
          return (
            <li key={t.id} className="flex items-center px-5 py-3 gap-3 hover:bg-gray-50/50 group">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {t.description || (cat?.custom_name ?? cat?.segment ?? '—')}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {cat?.custom_name ?? cat?.segment} ·{' '}
                  {new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                </p>
              </div>
              <span
                className={`text-sm font-semibold tabular-nums ${
                  t.type === 'income' ? 'text-green-600' : 'text-red-500'
                }`}
              >
                {t.type === 'income' ? '+' : '-'}
                {Number(t.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
              <button
                onClick={() => onDelete(t.id)}
                disabled={deleting === t.id}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all disabled:opacity-50"
              >
                <Trash2 size={14} />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
