'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CreditCardForm({ userId }: { userId: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [closingDay, setClosingDay] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
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
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <p className="text-sm font-semibold text-gray-800">Novo cartão</p>

      {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600">Nome do cartão</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          placeholder="Ex: Nubank"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600">Dia de fechamento</label>
        <input
          type="number"
          min={1}
          max={31}
          value={closingDay}
          onChange={e => setClosingDay(e.target.value)}
          required
          placeholder="Ex: 10"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors"
      >
        {loading ? 'Salvando...' : 'Adicionar cartão'}
      </button>
    </form>
  )
}
