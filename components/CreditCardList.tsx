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

function totalCommitted(cardInsts: Installment[], month: string) {
  const [year, mon] = month.split('-').map(Number)
  return cardInsts
    .filter(inst => !inst.is_recurring)
    .reduce((sum, inst) => {
      const [ey, em] = inst.end_date.split('-').map(Number)
      const remaining = Math.max(0, (ey - year) * 12 + (em - mon) + 1)
      return sum + remaining * Number(inst.per_installment_amount)
    }, 0)
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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
      <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--cream)', boxShadow: 'var(--lift-1)' }}>
        <p className="t-meta">Nenhum cartão cadastrado.</p>
      </div>
    )
  }

  const grandMonthly = installments.reduce((s, i) => s + Number(i.per_installment_amount), 0)
  const grandCommitted = totalCommitted(installments, month)
  const hasRecurring = installments.some(i => i.is_recurring)

  return (
    <div className="space-y-3">
      {/* Totals summary */}
      {grandMonthly > 0 && (
        <div className="rounded-2xl px-5 py-4 flex items-center justify-between gap-4" style={{ background: 'var(--cream)', boxShadow: 'var(--lift-1)' }}>
          <p className="t-label" style={{ color: 'var(--caption)' }}>Total dos cartões</p>
          <div className="flex gap-6 text-right">
            <div>
              <p className="t-meta mb-0.5">Fatura do mês</p>
              <p className="t-value" style={{ color: 'var(--gasto)', fontSize: '15px' }}>{fmtBRL(grandMonthly)}</p>
            </div>
            {grandCommitted > 0 && (
              <div>
                <p className="t-meta mb-0.5">
                  Comprometido{hasRecurring ? ' (excl. recorrentes)' : ''}
                </p>
                <p className="t-value" style={{ color: 'var(--ink)', fontSize: '15px' }}>{fmtBRL(grandCommitted)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {cards.map(card => {
        const cardInstallments = installments.filter(i => i.credit_card_id === card.id)
        const totalMonthly = cardInstallments.reduce((s, i) => s + Number(i.per_installment_amount), 0)
        const committed = totalCommitted(cardInstallments, month)
        const cardHasRecurring = cardInstallments.some(i => i.is_recurring)

        return (
          <div key={card.id} className="rounded-2xl overflow-hidden" style={{ background: 'var(--cream)', boxShadow: 'var(--lift-1)' }}>
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--receipt)' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{card.name}</p>
                <p className="t-meta">Fecha dia {card.closing_day}</p>
              </div>
              <div className="flex items-center gap-4">
                {totalMonthly > 0 && (
                  <div className="text-right">
                    <p className="t-meta">Fatura do mês</p>
                    <p className="t-value" style={{ color: 'var(--gasto)', fontSize: '13px' }}>{fmtBRL(totalMonthly)}</p>
                  </div>
                )}
                {committed > 0 && (
                  <div className="text-right">
                    <p className="t-meta">Comprometido{cardHasRecurring ? '*' : ''}</p>
                    <p className="t-value" style={{ color: 'var(--caption)', fontSize: '13px' }}>{fmtBRL(committed)}</p>
                  </div>
                )}
                <button
                  onClick={() => deleteCard(card.id)}
                  className="transition-colors"
                  style={{ color: 'var(--faint)' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {cardInstallments.length > 0 ? (
              <ul>
                {cardInstallments.map(inst => {
                  const cat = Array.isArray(inst.category) ? inst.category[0] : inst.category
                  const start = new Date(inst.start_date + 'T00:00:00')
                  const end = new Date(inst.end_date + 'T00:00:00')
                  const fmtDate = (d: Date) =>
                    d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
                  const isAvista = inst.total_installments === 1 && !inst.is_recurring
                  const { current, remaining } = (!isAvista && !inst.is_recurring) ? installmentProgress(inst, month) : { current: 1, remaining: 0 }

                  if (editing === inst.id) {
                    return (
                      <li key={inst.id} className="px-5 py-3 space-y-2" style={{ background: 'var(--receipt)' }}>
                        <input
                          type="text"
                          value={editDescription}
                          onChange={e => setEditDescription(e.target.value)}
                          className="w-full rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                          style={{ background: 'var(--cream)', border: '1px solid var(--receipt)', color: 'var(--ink)' }}
                          placeholder="Descrição"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="t-meta">Total (R$)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={editTotalAmount}
                              onChange={e => setEditTotalAmount(e.target.value)}
                              className="w-full rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                              style={{ background: 'var(--cream)', border: '1px solid var(--receipt)', color: 'var(--ink)' }}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="t-meta">Parcelas</label>
                            <input
                              type="number"
                              min={1}
                              max={60}
                              value={editTotalInstallments}
                              onChange={e => setEditTotalInstallments(e.target.value)}
                              className="w-full rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                              style={{ background: 'var(--cream)', border: '1px solid var(--receipt)', color: 'var(--ink)' }}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="t-meta">Início</label>
                            <input
                              type="date"
                              value={editStartDate}
                              onChange={e => setEditStartDate(e.target.value)}
                              className="w-full rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                              style={{ background: 'var(--cream)', border: '1px solid var(--receipt)', color: 'var(--ink)' }}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="t-meta">Categoria</label>
                            <select
                              value={editCategoryId}
                              onChange={e => setEditCategoryId(e.target.value)}
                              className="w-full rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                              style={{ background: 'var(--cream)', border: '1px solid var(--receipt)', color: 'var(--ink)' }}
                            >
                              <option value="">Selecione...</option>
                              {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.custom_name ?? c.segment}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {editTotalAmount && editTotalInstallments && parseInt(editTotalInstallments) > 1 && (
                          <p className="text-xs font-medium" style={{ color: 'var(--reserva)' }}>
                            {editTotalInstallments}x de{' '}
                            {(parseFloat(editTotalAmount) / parseInt(editTotalInstallments)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        )}
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={cancelEdit}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded"
                            style={{ color: 'var(--faint)' }}
                          >
                            <X size={12} /> Cancelar
                          </button>
                          <button
                            onClick={() => handleSave(inst.id)}
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
                      key={inst.id}
                      className="flex items-center px-5 py-3 gap-3 group"
                      style={{ borderTop: '1px solid var(--receipt)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{inst.description}</p>
                        <p className="t-meta mt-0.5">
                          {cat?.custom_name ?? cat?.segment} ·{' '}
                          {inst.is_recurring
                            ? 'recorrente'
                            : isAvista
                            ? 'à vista'
                            : `${current}/${inst.total_installments} · ${remaining} restante${remaining !== 1 ? 's' : ''} · ${fmtDate(start)} – ${fmtDate(end)}`}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="t-value" style={{ color: 'var(--gasto)', fontSize: '13px' }}>
                          {Number(inst.per_installment_amount).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                          {!isAvista && !inst.is_recurring && <span className="text-xs font-normal" style={{ color: 'var(--faint)' }}>/parc.</span>}
                        </p>
                        {!isAvista && !inst.is_recurring && (
                          <p className="t-meta">
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
                        className="opacity-0 group-hover:opacity-100 transition-all"
                        style={{ color: 'var(--faint)' }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => deleteInstallment(inst.id)}
                        className="opacity-0 group-hover:opacity-100 transition-all"
                        style={{ color: 'var(--faint)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="px-5 py-3 t-meta">Sem compras.</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
