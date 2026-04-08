'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const inputStyle = {
  background: 'var(--receipt)',
  border: '1px solid transparent',
  color: 'var(--ink)',
} as React.CSSProperties

export default function CreditCardForm({ userId }: { userId: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [closingDay, setClosingDay] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.from('credit_cards').insert({
      user_id: userId,
      name,
      closing_day: parseInt(closingDay),
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setName('')
    setClosingDay('')
    setLoading(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--cream)', boxShadow: 'var(--lift-1)' }}>
      <p className="t-label" style={{ color: 'var(--caption)' }}>Novo cartão</p>

      {error && <p className="text-xs px-3 py-2 rounded-xl" style={{ color: 'var(--gasto)', background: 'rgba(181,89,40,0.08)' }}>{error}</p>}

      <div className="space-y-1">
        <label className="t-meta">Nome do cartão</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          placeholder="Ex: Nubank"
          className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
          style={inputStyle}
        />
      </div>

      <div className="space-y-1">
        <label className="t-meta">Dia de fechamento</label>
        <input
          type="number"
          min={1}
          max={31}
          value={closingDay}
          onChange={e => setClosingDay(e.target.value)}
          required
          placeholder="Ex: 10"
          className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
          style={inputStyle}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full disabled:opacity-50 font-medium py-2 rounded-xl text-sm transition-colors"
        style={{ background: 'var(--chumbo)', color: 'var(--ledger)' }}
      >
        {loading ? 'Salvando...' : 'Adicionar cartão'}
      </button>
    </form>
  )
}
