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
  const [cardId, setCardId] = useState('')
  const [description, setDescription] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [totalInstallments, setTotalInstallments] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [categoryId, setCategoryId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const perInstallment = totalAmount && totalInstallments
    ? (parseFloat(totalAmount.replace(',', '.')) / parseInt(totalInstallments)).toFixed(2)
    : null

  function calcEndDate() {
    if (!startDate || !totalInstallments) return ''
    const start = new Date(startDate + 'T00:00:00')
    start.setMonth(start.getMonth() + parseInt(totalInstallments) - 1)
    return start.toISOString().split('T')[0]
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const total = parseFloat(totalAmount.replace(',', '.'))
    const installments = parseInt(totalInstallments)
    const endDate = calcEndDate()

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
      <p className="text-sm font-semibold text-gray-800">Nova parcela</p>

      {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

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
            <option key={c.id} value={c.id}>{c.name}</option>
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

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Total (R$)</label>
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
      </div>

      {perInstallment && (
        <p className="text-xs text-indigo-600 font-medium">
          {totalInstallments}x de R$ {parseFloat(perInstallment).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
      )}

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600">Início</label>
        <input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          required
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

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
        {loading ? 'Salvando...' : 'Adicionar parcela'}
      </button>
    </form>
  )
}
