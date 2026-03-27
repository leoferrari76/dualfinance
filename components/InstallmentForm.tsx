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

export default function InstallmentForm({ cards, categories }: Props) {
  const router = useRouter()
  const [isInstallment, setIsInstallment] = useState(true)
  const [cardId, setCardId] = useState('')
  const [description, setDescription] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [totalInstallments, setTotalInstallments] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
  const [categoryId, setCategoryId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedCard = cards.find(c => c.id === cardId)

  // Computes the first billing month based on closing day rule
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

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const total = parseFloat(totalAmount.replace(',', '.'))
    const installments = isInstallment ? parseInt(totalInstallments) : 1
    const startDate = billingStartDate
    const endDate = calcEndDate(startDate)

    const supabase = createClient()
    const { error } = await supabase.from('installments').insert({
      credit_card_id: cardId,
      description,
      total_amount: total,
      per_installment_amount: total / installments,
      total_installments: installments,
      start_date: startDate,
      end_date: endDate,
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
    setLoading(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <p className="text-sm font-semibold text-gray-800">Nova compra no cartão</p>

      {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      {/* Installment toggle */}
      <div className="flex rounded-lg overflow-hidden border border-gray-200 text-sm">
        <button
          type="button"
          onClick={() => setIsInstallment(true)}
          className={`flex-1 py-1.5 font-medium transition-colors ${
            isInstallment ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          Parcelado
        </button>
        <button
          type="button"
          onClick={() => { setIsInstallment(false); setTotalInstallments('') }}
          className={`flex-1 py-1.5 font-medium transition-colors ${
            !isInstallment ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          À vista
        </button>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600">Cartão</label>
        <select
          value={cardId}
          onChange={e => setCardId(e.target.value)}
          required
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="">Selecione...</option>
          {cards.map(c => (
            <option key={c.id} value={c.id}>{c.name} (fecha dia {c.closing_day})</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600">Descrição</label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          required
          placeholder="Ex: TV Samsung"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className={`grid gap-3 ${isInstallment ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">
            {isInstallment ? 'Total (R$)' : 'Valor (R$)'}
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={totalAmount}
            onChange={e => setTotalAmount(e.target.value)}
            required
            placeholder="0,00"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        {isInstallment && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Parcelas</label>
            <input
              type="number"
              min={2}
              max={60}
              value={totalInstallments}
              onChange={e => setTotalInstallments(e.target.value)}
              required
              placeholder="Ex: 12"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}
      </div>

      {perInstallment && (
        <p className="text-xs text-indigo-600 font-medium">
          {totalInstallments}x de R$ {parseFloat(perInstallment).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
      )}

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600">Data da compra</label>
        <input
          type="date"
          value={purchaseDate}
          onChange={e => setPurchaseDate(e.target.value)}
          required
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {cardId && purchaseDate && (
        <p className={`text-xs px-3 py-2 rounded-lg font-medium ${
          billsNextMonth
            ? 'bg-amber-50 text-amber-700 border border-amber-100'
            : 'bg-green-50 text-green-700 border border-green-100'
        }`}>
          {billsNextMonth
            ? `Compra após o fechamento (dia ${selectedCard!.closing_day}) — primeira cobrança em ${billingMonth}`
            : `Primeira cobrança em ${billingMonth}`
          }
        </p>
      )}

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600">Categoria</label>
        <select
          value={categoryId}
          onChange={e => setCategoryId(e.target.value)}
          required
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="">Selecione...</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>
              {c.custom_name ?? c.segment}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors"
      >
        {loading ? 'Salvando...' : isInstallment ? 'Adicionar parcela' : 'Adicionar compra'}
      </button>
    </form>
  )
}
