'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Pencil, X, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { CreditCard, Installment, Category } from '@/types'

interface Props {
  cards: CreditCard[]
  installments: Installment[]
  categories: Category[]
  month: string
}

function installmentProgress(inst: Installment, month: string) {
  const [year, mon] = month.split('-').map(Number)
  const [sy, sm] = inst.start_date.split('-').map(Number)
  const elapsed = (year - sy) * 12 + (mon - sm) + 1
  const current = Math.min(Math.max(elapsed, 1), inst.total_installments)
  const remaining = inst.total_installments - current
  return { current, remaining }
}

export default function CreditCardList({ cards, installments, categories, month }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState<string | null>(null)
  const [editDescription, setEditDescription] = useState('')
  const [editTotalAmount, setEditTotalAmount] = useState('')
  const [editTotalInstallments, setEditTotalInstallments] = useState('')
  const [editStartDate, setEditStartDate] = useState('')
  const [editCategoryId, setEditCategoryId] = useState('')
  const [saving, setSaving] = useState(false)

  function startEdit(inst: Installment) {
    setEditing(inst.id)
    setEditDescription(inst.description)
    setEditTotalAmount(String(Number(inst.total_amount)))
    setEditTotalInstallments(String(inst.total_installments))
    setEditStartDate(inst.start_date)
    const cat = Array.isArray(inst.category) ? inst.category[0] : inst.category
    setEditCategoryId(inst.category_id ?? cat?.id ?? '')
  }

  function cancelEdit() {
    setEditing(null)
  }

  function calcEndDate(startDate: string, installments: string) {
    if (!startDate || !installments) return startDate
    const n = parseInt(installments)
    if (n <= 1) return startDate
    const start = new Date(startDate + 'T00:00:00')
    start.setMonth(start.getMonth() + n - 1)
    return start.toISOString().split('T')[0]
  }

  async function handleSave(id: string) {
    setSaving(true)
    const total = parseFloat(editTotalAmount.replace(',', '.'))
    const installments = parseInt(editTotalInstallments) || 1
    const endDate = calcEndDate(editStartDate, editTotalInstallments)

    const supabase = createClient()
    await supabase.from('installments').update({
      description: editDescription,
      total_amount: total,
      per_installment_amount: total / installments,
      total_installments: installments,
      start_date: editStartDate,
      end_date: endDate,
      category_id: editCategoryId,
    }).eq('id', id)

    setSaving(false)
    setEditing(null)
    router.refresh()
  }

  async function deleteCard(id: string) {
    const supabase = createClient()
    await supabase.from('credit_cards').delete().eq('id', id)
    router.refresh()
  }

  async function deleteInstallment(id: string) {
    const supabase = createClient()
    await supabase.from('installments').delete().eq('id', id)
    router.refresh()
  }

  if (cards.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
        <p className="text-sm text-gray-400">Nenhum cartão cadastrado.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {cards.map(card => {
        const cardInstallments = installments.filter(i => i.credit_card_id === card.id)
        const totalMonthly = cardInstallments.reduce(
          (s, i) => s + Number(i.per_installment_amount),
          0
        )

        return (
          <div key={card.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50">
              <div>
                <p className="text-sm font-semibold text-gray-800">{card.name}</p>
                <p className="text-xs text-gray-400">Fecha dia {card.closing_day}</p>
              </div>
              <div className="flex items-center gap-3">
                {totalMonthly > 0 && (
                  <span className="text-xs font-medium text-red-500">
                    {totalMonthly.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês
                  </span>
                )}
                <button
                  onClick={() => deleteCard(card.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {cardInstallments.length > 0 ? (
              <ul className="divide-y divide-gray-50">
                {cardInstallments.map(inst => {
                  const cat = Array.isArray(inst.category) ? inst.category[0] : inst.category
                  const start = new Date(inst.start_date + 'T00:00:00')
                  const end = new Date(inst.end_date + 'T00:00:00')
                  const fmtDate = (d: Date) =>
                    d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
                  const isAvista = inst.total_installments === 1
                  const { current, remaining } = isAvista ? { current: 1, remaining: 0 } : installmentProgress(inst, month)

                  if (editing === inst.id) {
                    return (
                      <li key={inst.id} className="px-5 py-3 space-y-2 bg-gray-50/60">
                        <input
                          type="text"
                          value={editDescription}
                          onChange={e => setEditDescription(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Descrição"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-xs text-gray-500">Total (R$)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={editTotalAmount}
                              onChange={e => setEditTotalAmount(e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-gray-500">Parcelas</label>
                            <input
                              type="number"
                              min={1}
                              max={60}
                              value={editTotalInstallments}
                              onChange={e => setEditTotalInstallments(e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-xs text-gray-500">Início</label>
                            <input
                              type="date"
                              value={editStartDate}
                              onChange={e => setEditStartDate(e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-gray-500">Categoria</label>
                            <select
                              value={editCategoryId}
                              onChange={e => setEditCategoryId(e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                            >
                              <option value="">Selecione...</option>
                              {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.custom_name ?? c.segment}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {editTotalAmount && editTotalInstallments && parseInt(editTotalInstallments) > 1 && (
                          <p className="text-xs text-indigo-600 font-medium">
                            {editTotalInstallments}x de{' '}
                            {(parseFloat(editTotalAmount) / parseInt(editTotalInstallments)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        )}
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={cancelEdit}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded"
                          >
                            <X size={12} /> Cancelar
                          </button>
                          <button
                            onClick={() => handleSave(inst.id)}
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
                    <li key={inst.id} className="flex items-center px-5 py-3 gap-3 group hover:bg-gray-50/50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{inst.description}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {cat?.custom_name ?? cat?.segment} ·{' '}
                          {isAvista ? 'à vista' : `${current}/${inst.total_installments} · ${remaining} restante${remaining !== 1 ? 's' : ''} · ${fmtDate(start)} – ${fmtDate(end)}`}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-red-500">
                          {Number(inst.per_installment_amount).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                          {!isAvista && <span className="text-xs font-normal text-gray-400">/parc.</span>}
                        </p>
                        {!isAvista && (
                          <p className="text-xs text-gray-400">
                            total{' '}
                            {Number(inst.total_amount).toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => startEdit(inst)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-indigo-400 transition-all"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => deleteInstallment(inst.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="px-5 py-3 text-xs text-gray-400">Sem compras.</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
