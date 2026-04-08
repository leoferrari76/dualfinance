'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Pencil, X, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import CategoryPicker from '@/components/CategoryPicker'
import type { Transaction, Category } from '@/types'

interface Props {
  transactions: Transaction[]
  categories: Category[]
  month: string
  userId: string
}

type EditState = {
  id: string
  type: 'income' | 'expense'
  amount: string
  categoryId: string
  date: string
  nota: string
  isFixed: boolean
}

const inputStyle = {
  background: 'var(--cream)',
  border: '1px solid var(--receipt)',
  color: 'var(--ink)',
} as React.CSSProperties

export default function TransactionList({ transactions, categories, month, userId }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)

  function startEdit(t: Transaction) {
    const cat = Array.isArray(t.category) ? t.category[0] : t.category
    setEdit({
      id: t.id,
      type: t.type,
      amount: String(Number(t.amount)),
      categoryId: t.category_id ?? cat?.id ?? '',
      date: t.date,
      nota: t.description ?? '',
      isFixed: t.is_fixed,
    })
  }

  async function handleSave() {
    if (!edit) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('transactions').update({
      type: edit.type,
      amount: parseFloat(edit.amount.replace(',', '.')),
      description: edit.nota,
      date: edit.date,
      category_id: edit.categoryId,
      is_fixed: edit.isFixed,
    }).eq('id', edit.id)
    setSaving(false)
    setEdit(null)
    router.refresh()
  }

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
    <div className="space-y-3">
      {fixed.length > 0 && (
        <Section
          title="Fixos"
          transactions={fixed}
          categories={categories}
          month={month}
          userId={userId}
          edit={edit}
          saving={saving}
          deleting={deleting}
          onStartEdit={startEdit}
          onCancelEdit={() => setEdit(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          onEditChange={patch => setEdit(prev => prev ? { ...prev, ...patch } : prev)}
        />
      )}
      {oneOff.length > 0 && (
        <Section
          title="Avulsos"
          transactions={oneOff}
          categories={categories}
          month={month}
          userId={userId}
          edit={edit}
          saving={saving}
          deleting={deleting}
          onStartEdit={startEdit}
          onCancelEdit={() => setEdit(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          onEditChange={patch => setEdit(prev => prev ? { ...prev, ...patch } : prev)}
        />
      )}
      {transactions.length === 0 && (
        <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--cream)', boxShadow: 'var(--lift-1)' }}>
          <p className="t-meta">Nenhum lançamento ainda.</p>
        </div>
      )}
    </div>
  )
}

function Section({
  title,
  transactions,
  categories,
  month,
  userId,
  edit,
  saving,
  deleting,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onEditChange,
}: {
  title: string
  transactions: Transaction[]
  categories: Category[]
  month: string
  userId: string
  edit: EditState | null
  saving: boolean
  deleting: string | null
  onStartEdit: (t: Transaction) => void
  onCancelEdit: () => void
  onSave: () => void
  onDelete: (id: string) => void
  onEditChange: (patch: Partial<EditState>) => void
}) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--cream)', boxShadow: 'var(--lift-1)' }}>
      <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--receipt)' }}>
        <p className="t-label" style={{ color: 'var(--caption)' }}>{title}</p>
      </div>
      <ul>
        {transactions.map((t, i) => {
          const cat = Array.isArray(t.category) ? t.category[0] : t.category
          const isEditing = edit?.id === t.id

          if (isEditing && edit) {
            return (
              <li key={t.id} className="px-5 py-4 space-y-3" style={{ background: 'rgba(27,25,22,0.03)', borderTop: i > 0 ? '1px solid var(--receipt)' : 'none' }}>

                {/* Type toggle */}
                <div className="flex rounded-xl overflow-hidden text-sm" style={{ border: '1px solid var(--receipt)' }}>
                  <button type="button" onClick={() => onEditChange({ type: 'expense' })}
                    className="flex-1 py-1.5 font-medium transition-colors"
                    style={edit.type === 'expense' ? { background: 'var(--gasto)', color: 'var(--cream)' } : { color: 'var(--faint)' }}>
                    Gasto
                  </button>
                  <button type="button" onClick={() => onEditChange({ type: 'income' })}
                    className="flex-1 py-1.5 font-medium transition-colors"
                    style={edit.type === 'income' ? { background: 'var(--ganho)', color: 'var(--cream)' } : { color: 'var(--faint)' }}>
                    Ganho
                  </button>
                </div>

                {/* Amount + Date */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <p className="t-meta">Valor (R$)</p>
                    <input type="number" step="0.01" min="0.01"
                      value={edit.amount}
                      onChange={e => onEditChange({ amount: e.target.value })}
                      className="w-full rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                      style={inputStyle} />
                  </div>
                  <div className="space-y-1">
                    <p className="t-meta">Data</p>
                    <input type="date"
                      value={edit.date}
                      onChange={e => onEditChange({ date: e.target.value })}
                      className="w-full rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                      style={inputStyle} />
                  </div>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <p className="t-meta">Categoria</p>
                  <CategoryPicker
                    categories={categories}
                    value={edit.categoryId}
                    onChange={v => onEditChange({ categoryId: v })}
                    userId={userId}
                  />
                </div>

                {/* Nota */}
                <div className="space-y-1">
                  <p className="t-meta">Nota <span style={{ color: 'var(--faint)' }}>(opcional)</span></p>
                  <input type="text"
                    value={edit.nota}
                    onChange={e => onEditChange({ nota: e.target.value })}
                    placeholder="Ex: Aluguel de março"
                    className="w-full rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                    style={inputStyle} />
                </div>

                {/* Fixed toggle */}
                <div className="flex items-center gap-2">
                  <input id={`fixed-${t.id}`} type="checkbox"
                    checked={edit.isFixed}
                    onChange={e => onEditChange({ isFixed: e.target.checked })}
                    style={{ accentColor: 'var(--reserva)' }} />
                  <label htmlFor={`fixed-${t.id}`} className="t-meta">Fixo (recorrente todo mês)</label>
                </div>

                {/* Actions */}
                <div className="flex gap-2 justify-end pt-1">
                  <button onClick={onCancelEdit}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg"
                    style={{ color: 'var(--faint)', background: 'var(--receipt)' }}>
                    <X size={12} /> Cancelar
                  </button>
                  <button onClick={onSave} disabled={saving}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg disabled:opacity-50 font-medium"
                    style={{ background: 'var(--chumbo)', color: 'var(--ledger)' }}>
                    <Check size={12} /> {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </li>
            )
          }

          return (
            <li
              key={t.id}
              className="flex items-center px-5 py-3 gap-3 group"
              style={{ borderTop: i === 0 ? 'none' : '1px solid var(--receipt)' }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>
                  {t.description || (cat?.custom_name ?? cat?.segment ?? '—')}
                </p>
                <p className="t-meta mt-0.5">
                  {cat?.custom_name
                    ? `${cat.segment} · ${cat.custom_name}`
                    : cat?.segment} ·{' '}
                  {new Date(
                    (t.is_fixed ? `${month}-${t.date.split('-')[2]}` : t.date) + 'T00:00:00'
                  ).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <span className="t-value text-sm" style={{ color: t.type === 'income' ? 'var(--ganho)' : 'var(--gasto)' }}>
                {t.type === 'income' ? '+' : '-'}
                {Number(t.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
              <button onClick={() => onStartEdit(t)}
                className="opacity-0 group-hover:opacity-100 transition-all"
                style={{ color: 'var(--faint)' }}>
                <Pencil size={14} />
              </button>
              <button onClick={() => onDelete(t.id)} disabled={deleting === t.id}
                className="opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                style={{ color: 'var(--faint)' }}>
                <Trash2 size={14} />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
