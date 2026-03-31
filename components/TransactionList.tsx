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
    <div className="space-y-4">
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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-50">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
      </div>
      <ul className="divide-y divide-gray-50">
        {transactions.map(t => {
          const cat = Array.isArray(t.category) ? t.category[0] : t.category
          const isEditing = editing === t.id

          if (isEditing) {
            return (
              <li key={t.id} className="px-5 py-3 space-y-2 bg-gray-50/60">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editAmount}
                    onChange={e => setEditAmount(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Valor"
                  />
                  <input
                    type="date"
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <input
                  type="text"
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Descrição"
                />
                <select
                  value={editCategoryId}
                  onChange={e => setEditCategoryId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Categoria...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.custom_name ?? c.segment}</option>
                  ))}
                </select>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={onCancelEdit}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded"
                  >
                    <X size={12} /> Cancelar
                  </button>
                  <button
                    onClick={() => onSave(t.id)}
                    disabled={saving}
                    className="flex items-center gap-1 text-xs text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-3 py-1 rounded-lg"
                  >
                    <Check size={12} /> Salvar
                  </button>
                </div>
              </li>
            )
          }

          return (
            <li key={t.id} className="flex items-center px-5 py-3 gap-3 hover:bg-gray-50/50 group">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {t.description || (cat?.custom_name ?? cat?.segment ?? '—')}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {cat?.custom_name ?? cat?.segment} ·{' '}
                  {new Date(
                    (t.is_fixed ? `${month}-${t.date.split('-')[2]}` : t.date) + 'T00:00:00'
                  ).toLocaleDateString('pt-BR')}
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
                onClick={() => onStartEdit(t)}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-indigo-400 transition-all"
              >
                <Pencil size={14} />
              </button>
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
