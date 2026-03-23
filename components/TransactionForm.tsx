'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Category } from '@/types'

interface Props {
  userId: string
  categories: Category[]
}

export default function TransactionForm({ userId, categories }: Props) {
  const router = useRouter()
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [isFixed, setIsFixed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.from('transactions').insert({
      user_id: userId,
      type,
      amount: parseFloat(amount.replace(',', '.')),
      category_id: categoryId,
      date,
      description,
      is_fixed: isFixed,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setAmount('')
    setDescription('')
    setCategoryId('')
    setIsFixed(false)
    setLoading(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 2500)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <p className="text-sm font-semibold text-gray-800">Novo lançamento</p>

      {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      {success && <p className="text-xs text-green-600 bg-green-50 px-3 py-2 rounded-lg">Lançamento salvo!</p>}

      {/* Type toggle */}
      <div className="flex rounded-lg overflow-hidden border border-gray-200 text-sm">
        <button
          type="button"
          onClick={() => setType('expense')}
          className={`flex-1 py-1.5 font-medium transition-colors ${
            type === 'expense' ? 'bg-red-500 text-white' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          Gasto
        </button>
        <button
          type="button"
          onClick={() => setType('income')}
          className={`flex-1 py-1.5 font-medium transition-colors ${
            type === 'income' ? 'bg-green-500 text-white' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          Ganho
        </button>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600">Valor (R$)</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          required
          placeholder="0,00"
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

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600">Data</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          required
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600">Descrição</label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Ex: Aluguel de março"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="isFixed"
          type="checkbox"
          checked={isFixed}
          onChange={e => setIsFixed(e.target.checked)}
          className="rounded border-gray-300 text-indigo-600"
        />
        <label htmlFor="isFixed" className="text-xs text-gray-600">
          Fixo (recorrente todo mês)
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors"
      >
        {loading ? 'Salvando...' : 'Adicionar'}
      </button>
    </form>
  )
}
