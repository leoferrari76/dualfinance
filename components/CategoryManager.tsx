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
          <div key={segment} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50">
              <p className="text-sm font-semibold text-gray-800">{segment}</p>
              <button
                onClick={() => {
                  setAddingTo(isAdding ? null : segment)
                  setCustomName('')
                }}
                className="text-gray-400 hover:text-indigo-600 transition-colors"
              >
                <Plus size={15} />
              </button>
            </div>

            {isAdding && (
              <div className="flex gap-2 px-5 py-3 border-b border-gray-50 bg-indigo-50/30">
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
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={() => handleAdd(segment)}
                  disabled={loading || !customName.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
                >
                  Adicionar
                </button>
              </div>
            )}

            {customCats.length > 0 ? (
              <ul className="divide-y divide-gray-50">
                {customCats.map(cat => (
                  <li key={cat.id} className="flex items-center justify-between px-5 py-2.5 group hover:bg-gray-50/50">
                    <span className="text-sm text-gray-700">{cat.custom_name}</span>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              !isAdding && (
                <p className="px-5 py-2.5 text-xs text-gray-400">
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
