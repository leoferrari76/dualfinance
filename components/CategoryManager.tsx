'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Category, Segment } from '@/types'

interface Props {
  userId: string
  categories: Category[]
  segments: Segment[]
}

export default function CategoryManager({ userId, categories, segments }: Props) {
  const router = useRouter()
  const [addingTo, setAddingTo] = useState<Segment | null>(null)
  const [customName, setCustomName] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleAdd(segment: Segment) {
    if (!customName.trim()) return
    setLoading(true)
    const supabase = createClient()
    await supabase.from('categories').insert({
      segment,
      custom_name: customName.trim(),
      user_id: userId,
    })
    setCustomName('')
    setAddingTo(null)
    setLoading(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('categories').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {segments.map(segment => {
        const segmentCats = categories.filter(c => c.segment === segment)
        const customCats = segmentCats.filter(c => c.user_id !== null)
        const isAdding = addingTo === segment

        return (
          <div key={segment} className="rounded-2xl overflow-hidden" style={{ background: 'var(--cream)', boxShadow: 'var(--lift-1)' }}>
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--receipt)' }}>
              <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{segment}</p>
              <button
                onClick={() => { setAddingTo(isAdding ? null : segment); setCustomName('') }}
                className="transition-colors"
                style={{ color: 'var(--faint)' }}
              >
                <Plus size={15} />
              </button>
            </div>

            {isAdding && (
              <div className="flex gap-2 px-5 py-3" style={{ borderBottom: '1px solid var(--receipt)', background: 'var(--receipt)' }}>
                <input
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder={`Nome em ${segment}...`}
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); handleAdd(segment) }
                    if (e.key === 'Escape') { setAddingTo(null) }
                  }}
                  className="flex-1 rounded-xl px-3 py-1.5 text-sm focus:outline-none"
                  style={{ background: 'var(--cream)', color: 'var(--ink)', border: '1px solid transparent' }}
                />
                <button
                  onClick={() => handleAdd(segment)}
                  disabled={loading || !customName.trim()}
                  className="disabled:opacity-50 px-3 py-1.5 rounded-xl text-sm transition-colors"
                  style={{ background: 'var(--chumbo)', color: 'var(--ledger)' }}
                >
                  Adicionar
                </button>
              </div>
            )}

            {customCats.length > 0 ? (
              <ul>
                {customCats.map(cat => (
                  <li key={cat.id} className="flex items-center justify-between px-5 py-2.5 group"
                    style={{ borderTop: '1px solid var(--receipt)' }}>
                    <span className="text-sm" style={{ color: 'var(--ink)' }}>{cat.custom_name}</span>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="opacity-0 group-hover:opacity-100 transition-all"
                      style={{ color: 'var(--faint)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              !isAdding && (
                <p className="px-5 py-2.5 t-meta">
                  Nenhum nome personalizado. Clique em + para adicionar.
                </p>
              )
            )}
          </div>
        )
      })}
    </div>
  )
}
