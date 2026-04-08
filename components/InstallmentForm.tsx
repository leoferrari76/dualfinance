'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { CreditCard, Category } from '@/types'

interface Props {
  userId: string
  cards: CreditCard[]
  categories: Category[]
}

const inputStyle = {
  background: 'var(--receipt)',
  border: '1px solid transparent',
  color: 'var(--ink)',
} as React.CSSProperties

export default function InstallmentForm({ cards, categories }: Props) {
  const router = useRouter()
  const [isInstallment, setIsInstallment] = useState(true)
  const [isRecurring, setIsRecurring] = useState(false)
  const [cardId, setCardId] = useState('')
  const [description, setDescription] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [totalInstallments, setTotalInstallments] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
  const [categoryId, setCategoryId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedCard = cards.find(c => c.id === cardId)

  function calcBillingStartDate(): string {
    if (!purchaseDate) return purchaseDate
    const d = new Date(purchaseDate + 'T00:00:00')
    if (selectedCard && d.getDate() >= selectedCard.closing_day) {
      d.setMonth(d.getMonth() + 1)
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  }

  function calcEndDate(billingStart: string): string {
    if (!isInstallment) return billingStart
    if (!totalInstallments) return billingStart
    const start = new Date(billingStart + 'T00:00:00')
    start.setMonth(start.getMonth() + parseInt(totalInstallments) - 1)
    return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`
  }

  const billingStartDate = calcBillingStartDate()
  const billingMonth = new Date(billingStartDate + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const purchaseDay = purchaseDate ? new Date(purchaseDate + 'T00:00:00').getDate() : null
  const billsNextMonth = selectedCard && purchaseDay !== null && purchaseDay >= selectedCard.closing_day

  const perInstallment = isInstallment && totalAmount && totalInstallments
    ? (parseFloat(totalAmount.replace(',', '.')) / parseInt(totalInstallments)).toFixed(2)
    : null

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const total = parseFloat(totalAmount.replace(',', '.'))
    const installments = isInstallment && !isRecurring ? parseInt(totalInstallments) : 1
    const startDate = billingStartDate
    const endDate = isRecurring ? '2099-12-01' : calcEndDate(startDate)

    const supabase = createClient()
    const { error } = await supabase.from('installments').insert({
      credit_card_id: cardId,
      description,
      total_amount: total,
      per_installment_amount: total / installments,
      total_installments: installments,
      start_date: startDate,
      end_date: endDate,
      is_recurring: isRecurring,
      category_id: categoryId,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setDescription('')
    setTotalAmount('')
    setTotalInstallments('')
    setCategoryId('')
    setCardId('')
    setIsRecurring(false)
    setLoading(false)
    router.refresh()
  }

  const activeStyle = { background: 'var(--chumbo)', color: 'var(--ledger)' }
  const inactiveStyle = { color: 'var(--faint)', background: 'transparent' }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--cream)', boxShadow: 'var(--lift-1)' }}>
      <p className="t-label" style={{ color: 'var(--caption)' }}>Nova compra no cartão</p>

      {error && <p className="text-xs px-3 py-2 rounded-xl" style={{ color: 'var(--gasto)', background: 'rgba(181,89,40,0.08)' }}>{error}</p>}

      {/* Type toggle */}
      <div className="flex rounded-xl overflow-hidden text-sm" style={{ border: '1px solid var(--receipt)' }}>
        <button type="button"
          onClick={() => { setIsInstallment(true); setIsRecurring(false) }}
          className="flex-1 py-1.5 font-medium transition-colors"
          style={isInstallment && !isRecurring ? activeStyle : inactiveStyle}
        >
          Parcelado
        </button>
        <button type="button"
          onClick={() => { setIsInstallment(false); setIsRecurring(false); setTotalInstallments('') }}
          className="flex-1 py-1.5 font-medium transition-colors"
          style={!isInstallment && !isRecurring ? activeStyle : inactiveStyle}
        >
          À vista
        </button>
        <button type="button"
          onClick={() => { setIsRecurring(true); setIsInstallment(false); setTotalInstallments('') }}
          className="flex-1 py-1.5 font-medium transition-colors"
          style={isRecurring ? activeStyle : inactiveStyle}
        >
          Recorrente
        </button>
      </div>

      <div className="space-y-1">
        <label className="t-meta">Cartão</label>
        <select value={cardId} onChange={e => setCardId(e.target.value)} required
          className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none" style={inputStyle}>
          <option value="">Selecione...</option>
          {cards.map(c => (
            <option key={c.id} value={c.id}>{c.name} (fecha dia {c.closing_day})</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="t-meta">Descrição</label>
        <input type="text" value={description} onChange={e => setDescription(e.target.value)} required
          placeholder="Ex: TV Samsung"
          className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none" style={inputStyle} />
      </div>

      <div className={`grid gap-3 ${isInstallment ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <div className="space-y-1">
          <label className="t-meta">{isInstallment ? 'Total (R$)' : 'Valor (R$)'}</label>
          <input type="number" step="0.01" min="0.01" value={totalAmount}
            onChange={e => setTotalAmount(e.target.value)} required placeholder="0,00"
            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none" style={inputStyle} />
        </div>
        {isInstallment && (
          <div className="space-y-1">
            <label className="t-meta">Parcelas</label>
            <input type="number" min={2} max={60} value={totalInstallments}
              onChange={e => setTotalInstallments(e.target.value)} required placeholder="Ex: 12"
              className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none" style={inputStyle} />
          </div>
        )}
      </div>

      {perInstallment && (
        <p className="text-xs font-medium" style={{ color: 'var(--reserva)' }}>
          {totalInstallments}x de R$ {parseFloat(perInstallment).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
      )}

      <div className="space-y-1">
        <label className="t-meta">Data da compra</label>
        <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} required
          className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none" style={inputStyle} />
      </div>

      {cardId && purchaseDate && (
        <p className="text-xs px-3 py-2 rounded-xl font-medium" style={
          billsNextMonth
            ? { background: 'rgba(155,120,69,0.08)', color: 'var(--reserva)', border: '1px solid rgba(155,120,69,0.2)' }
            : { background: 'rgba(56,105,79,0.08)', color: 'var(--ganho)', border: '1px solid rgba(56,105,79,0.2)' }
        }>
          {billsNextMonth
            ? `Compra após o fechamento (dia ${selectedCard!.closing_day}) — primeira cobrança em ${billingMonth}`
            : `Primeira cobrança em ${billingMonth}`}
        </p>
      )}

      <div className="space-y-1">
        <label className="t-meta">Categoria</label>
        <select value={categoryId} onChange={e => setCategoryId(e.target.value)} required
          className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none" style={inputStyle}>
          <option value="">Selecione...</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.custom_name ?? c.segment}</option>
          ))}
        </select>
      </div>

      <button type="submit" disabled={loading}
        className="w-full disabled:opacity-50 font-medium py-2 rounded-xl text-sm transition-colors"
        style={{ background: 'var(--chumbo)', color: 'var(--ledger)' }}>
        {loading ? 'Salvando...' : isRecurring ? 'Adicionar recorrente' : isInstallment ? 'Adicionar parcela' : 'Adicionar compra'}
      </button>
    </form>
  )
}
