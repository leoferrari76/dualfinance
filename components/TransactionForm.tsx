'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CategoryPicker from '@/components/CategoryPicker'
import type { Category } from '@/types'

interface Props {
  userId: string
  categories: Category[]
}

const inputStyle = {
  background: 'var(--receipt)',
  border: '1px solid transparent',
  color: 'var(--ink)',
} as React.CSSProperties

export default function TransactionForm({ userId, categories }: Props) {
  const router = useRouter()
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [nota, setNota] = useState('')
  const [isFixed, setIsFixed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!categoryId) { setError('Selecione uma categoria.'); return }
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.from('transactions').insert({
      user_id: userId,
      type,
      amount: parseFloat(amount.replace(',', '.')),
      category_id: categoryId,
      date,
      description: nota,
      is_fixed: isFixed,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setAmount('')
    setNota('')
    setCategoryId('')
    setIsFixed(false)
    setLoading(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 2500)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--cream)', boxShadow: 'var(--lift-1)' }}>
      <p className="t-label" style={{ color: 'var(--caption)' }}>Novo lançamento</p>

      {error && <p className="text-xs px-3 py-2 rounded-xl" style={{ color: 'var(--gasto)', background: 'rgba(181,89,40,0.08)' }}>{error}</p>}
      {success && <p className="text-xs px-3 py-2 rounded-xl" style={{ color: 'var(--ganho)', background: 'rgba(56,105,79,0.08)' }}>Lançamento salvo!</p>}

      {/* Type toggle */}
      <div className="flex rounded-xl overflow-hidden text-sm" style={{ border: '1px solid var(--receipt)' }}>
        <button
          type="button"
          onClick={() => setType('expense')}
          className="flex-1 py-1.5 font-medium transition-colors"
          style={type === 'expense'
            ? { background: 'var(--gasto)', color: 'var(--cream)' }
            : { color: 'var(--faint)', background: 'transparent' }}
        >
          Gasto
        </button>
        <button
          type="button"
          onClick={() => setType('income')}
          className="flex-1 py-1.5 font-medium transition-colors"
          style={type === 'income'
            ? { background: 'var(--ganho)', color: 'var(--cream)' }
            : { color: 'var(--faint)', background: 'transparent' }}
        >
          Ganho
        </button>
      </div>

      <div className="space-y-1">
        <label className="t-meta">Valor (R$)</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          required
          placeholder="0,00"
          className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
          style={inputStyle}
        />
      </div>

      <div className="space-y-2">
        <label className="t-meta">Categoria</label>
        <CategoryPicker
          categories={categories}
          value={categoryId}
          onChange={setCategoryId}
          userId={userId}
        />
      </div>

      <div className="space-y-1">
        <label className="t-meta">Data</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          required
          className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
          style={inputStyle}
        />
      </div>

      <div className="space-y-1">
        <label className="t-meta">Nota <span style={{ color: 'var(--faint)' }}>(opcional)</span></label>
        <input
          type="text"
          value={nota}
          onChange={e => setNota(e.target.value)}
          placeholder="Ex: Aluguel de março"
          className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
          style={inputStyle}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="isFixed"
          type="checkbox"
          checked={isFixed}
          onChange={e => setIsFixed(e.target.checked)}
          className="rounded"
          style={{ accentColor: 'var(--reserva)' }}
        />
        <label htmlFor="isFixed" className="t-meta">
          Fixo (recorrente todo mês)
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full disabled:opacity-50 font-medium py-2 rounded-xl text-sm transition-colors"
        style={{ background: 'var(--chumbo)', color: 'var(--ledger)' }}
      >
        {loading ? 'Salvando...' : 'Adicionar'}
      </button>
    </form>
  )
}
