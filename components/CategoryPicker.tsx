'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Category, Segment } from '@/types'
import { SEGMENTS } from '@/types'

interface Props {
  categories: Category[]
  value: string
  onChange: (categoryId: string) => void
  userId: string
}

export default function CategoryPicker({ categories, value, onChange, userId }: Props) {
  const router = useRouter()

  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(() => {
    return categories.find(c => c.id === value)?.segment ?? null
  })
  const [localCats, setLocalCats] = useState<Category[]>([])
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(false)

  const allCats = [...categories, ...localCats]

  const segmentCats = selectedSegment
    ? allCats.filter(c => c.segment === selectedSegment)
    : []

  // Separate base (no custom_name) from subcategories
  const baseCat = segmentCats.find(c => c.custom_name === null)
  const subCats = segmentCats.filter(c => c.custom_name !== null)

  async function handleCreate() {
    if (!newName.trim() || !selectedSegment) return
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('categories')
      .insert({ segment: selectedSegment, custom_name: newName.trim(), user_id: userId })
      .select('id, segment, custom_name, user_id')
      .single()

    if (data) {
      const newCat: Category = data as Category
      setLocalCats(prev => [...prev, newCat])
      onChange(newCat.id)
    }

    setNewName('')
    setAdding(false)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {/* Segment chips */}
      <div className="flex flex-wrap gap-1.5">
        {SEGMENTS.map(seg => {
          const isActive = selectedSegment === seg
          return (
            <button
              key={seg}
              type="button"
              onClick={() => {
                setSelectedSegment(seg)
                setAdding(false)
                setNewName('')
                // Only clear value if changing segment
                const currentCat = allCats.find(c => c.id === value)
                if (currentCat && currentCat.segment !== seg) onChange('')
              }}
              className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
              style={
                isActive
                  ? { background: 'var(--chumbo)', color: 'var(--ledger)' }
                  : { background: 'var(--receipt)', color: 'var(--ink)' }
              }
            >
              {seg}
            </button>
          )
        })}
      </div>

      {/* Subcategory list */}
      {selectedSegment && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--receipt)' }}
        >
          {/* Base segment option */}
          {baseCat && (
            <SubcatRow
              label={baseCat.segment}
              selected={value === baseCat.id}
              onClick={() => onChange(baseCat.id)}
              isLast={subCats.length === 0 && !adding}
            />
          )}

          {/* Custom subcategories */}
          {subCats.map((cat, i) => (
            <SubcatRow
              key={cat.id}
              label={cat.custom_name!}
              selected={value === cat.id}
              onClick={() => onChange(cat.id)}
              isLast={i === subCats.length - 1 && !adding}
            />
          ))}

          {/* Inline add */}
          {adding ? (
            <div
              className="flex gap-2 px-3 py-2.5"
              style={{ background: 'var(--receipt)' }}
            >
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder={`Nome em ${selectedSegment}...`}
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); handleCreate() }
                  if (e.key === 'Escape') { setAdding(false); setNewName('') }
                }}
                className="flex-1 px-2 py-1 rounded-lg text-sm focus:outline-none"
                style={{ background: 'var(--cream)', color: 'var(--ink)' }}
              />
              <button
                type="button"
                onClick={handleCreate}
                disabled={loading || !newName.trim()}
                className="px-3 py-1 rounded-lg text-xs font-medium disabled:opacity-50"
                style={{ background: 'var(--chumbo)', color: 'var(--ledger)' }}
              >
                Criar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs transition-colors"
              style={{ color: 'var(--faint)' }}
            >
              <Plus size={12} />
              Nova subcategoria em {selectedSegment}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function SubcatRow({
  label,
  selected,
  onClick,
  isLast,
}: {
  label: string
  selected: boolean
  onClick: () => void
  isLast: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors"
      style={{
        background: selected ? 'rgba(27,25,22,0.04)' : 'transparent',
        color: 'var(--ink)',
        borderBottom: isLast ? 'none' : '1px solid var(--receipt)',
      }}
    >
      <span
        className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
        style={{
          border: `2px solid ${selected ? 'var(--chumbo)' : 'var(--faint)'}`,
          background: selected ? 'var(--chumbo)' : 'transparent',
        }}
      >
        {selected && <Check size={9} strokeWidth={3} color="var(--ledger)" />}
      </span>
      {label}
    </button>
  )
}
