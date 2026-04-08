'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Pencil, X, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Transaction, Category } from '@/types'

interface Props {
  transactions: Transaction[]
  categories: Category[]
  month: string
}

export default function TransactionList({ transactions, categories, month }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editCategoryId, setEditCategoryId] = useState('')
  const [saving, setSaving] = useState(false)

  function startEdit(t: Transaction) {
    setEditing(t.id)
    setEditAmount(String(Number(t.amount)))
    setEditDescription(t.description ?? '')
    setEditDate(t.date)
    const cat = Array.isArray(t.category) ? t.category[0] : t.category
    setEditCategoryId(t.category_id ?? cat?.id ?? '')
  }

  function cancelEdit() {
    setEditing(null)
  }

  async function handleSave(id: string) {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('transactions').update({
      amount: parseFloat(editAmount.replace(',', '.')),
      description: editDescription,
      date: editDate,
      category_id: editCategoryId,
    }).eq('id', id)
    setSaving(false)
    setEditing(null)
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
          editing={editing}
          editAmount={editAmount}
          editDescription={editDescription}
          editDate={editDate}
          editCategoryId={editCategoryId}
          saving={saving}
          deleting={deleting}
          onStartEdit={startEdit}
          onCancelEdit={cancelEdit}
          onSave={handleSave}
          onDelete={handleDelete}
          setEditAmount={setEditAmount}
          setEditDescription={setEditDescription}
          setEditDate={setEditDate}
          setEditCategoryId={setEditCategoryId}
        />
      )}
      {oneOff.length > 0 && (
        <Section
          title="Avulsos"
          transactions={oneOff}
          categories={categories}
          month={month}
          editing={editing}
          editAmount={editAmount}
          editDescription={editDescription}
          editDate={editDate}
          editCategoryId={editCategoryId}
          saving={saving}
          deleting={deleting}
          onStartEdit={startEdit}
          onCancelEdit={cancelEdit}
          onSave={handleSave}
          onDelete={handleDelete}
          setEditAmount={setEditAmount}
          setEditDescription={setEditDescription}
          setEditDate={setEditDate}
          setEditCategoryId={setEditCategoryId}
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
  editing,
  editAmount,
  editDescription,
  editDate,
  editCategoryId,
  saving,
  deleting,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  setEditAmount,
  setEditDescription,
  setEditDate,
  setEditCategoryId,
}: {
  title: string
  transactions: Transaction[]
  categories: Category[]
  month: string
  editing: string | null
  editAmount: string
  editDescription: string
  editDate: string
  editCategoryId: string
  saving: boolean
  deleting: string | null
  onStartEdit: (t: Transaction) => void
  onCancelEdit: () => void
  onSave: (id: string) => void
  onDelete: (id: string) => void
  setEditAmount: (v: string) => void
  setEditDescription: (v: string) => void
  setEditDate: (v: string) => void
  setEditCategoryId: (v: string) => void
}) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--cream)', boxShadow: 'var(--lift-1)' }}>
      <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--receipt)' }}>
        <p className="t-label" style={{ color: 'var(--caption)' }}>{title}</p>
      </div>
      <ul>
        {transactions.map(t => {
          const cat = Array.isArray(t.category) ? t.category[0] : t.category
          const isEditing = editing === t.id

          if (isEditing) {
            return (
              <li key={t.id} className="px-5 py-3 space-y-2" style={{ background: 'var(--receipt)' }}>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editAmount}
                    onChange={e => setEditAmount(e.target.value)}
                    className="rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                    style={{ background: 'var(--cream)', border: '1px solid var(--receipt)', color: 'var(--ink)' }}
                    placeholder="Valor"
                  />
                  <input
                    type="date"
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                    style={{ background: 'var(--cream)', border: '1px solid var(--receipt)', color: 'var(--ink)' }}
                  />
                </div>
                <input
                  type="text"
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  className="w-full rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                  style={{ background: 'var(--cream)', border: '1px solid var(--receipt)', color: 'var(--ink)' }}
                  placeholder="Descrição"
                />
                <select
                  value={editCategoryId}
                  onChange={e => setEditCategoryId(e.target.value)}
                  className="w-full rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                  style={{ background: 'var(--cream)', border: '1px solid var(--receipt)', color: 'var(--ink)' }}
                >
                  <option value="">Categoria...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.custom_name ?? c.segment}</option>
                  ))}
                </select>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={onCancelEdit}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded"
                    style={{ color: 'var(--faint)' }}
                  >
                    <X size={12} /> Cancelar
                  </button>
                  <button
                    onClick={() => onSave(t.id)}
                    disabled={saving}
                    className="flex items-center gap-1 text-xs px-3 py-1 rounded-lg disabled:opacity-50"
                    style={{ background: 'var(--ganho)', color: 'var(--cream)' }}
                  >
                    <Check size={12} /> Salvar
                  </button>
                </div>
              </li>
            )
          }

          return (
            <li
              key={t.id}
              className="flex items-center px-5 py-3 gap-3 group"
              style={{ borderTop: '1px solid var(--receipt)' }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>
                  {t.description || (cat?.custom_name ?? cat?.segment ?? '—')}
                </p>
                <p className="t-meta mt-0.5">
                  {cat?.custom_name ?? cat?.segment} ·{' '}
                  {new Date(
                    (t.is_fixed ? `${month}-${t.date.split('-')[2]}` : t.date) + 'T00:00:00'
                  ).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <span className="t-value text-sm" style={{ color: t.type === 'income' ? 'var(--ganho)' : 'var(--gasto)' }}>
                {t.type === 'income' ? '+' : '-'}
                {Number(t.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
              <button
                onClick={() => onStartEdit(t)}
                className="opacity-0 group-hover:opacity-100 transition-all"
                style={{ color: 'var(--faint)' }}
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => onDelete(t.id)}
                disabled={deleting === t.id}
                className="opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                style={{ color: 'var(--faint)' }}
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
