'use client'

import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { CreditCard, Installment } from '@/types'

interface Props {
  cards: CreditCard[]
  installments: Installment[]
}

export default function CreditCardList({ cards, installments }: Props) {
  const router = useRouter()

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
                  const fmt = (d: Date) =>
                    d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })

                  return (
                    <li key={inst.id} className="flex items-center px-5 py-3 gap-3 group hover:bg-gray-50/50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{inst.description}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {cat?.custom_name ?? cat?.segment} · {inst.total_installments}x ·{' '}
                          {fmt(start)} – {fmt(end)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-red-500">
                          {Number(inst.per_installment_amount).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                          <span className="text-xs font-normal text-gray-400">/parc.</span>
                        </p>
                        <p className="text-xs text-gray-400">
                          total{' '}
                          {Number(inst.total_amount).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </p>
                      </div>
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
              <p className="px-5 py-3 text-xs text-gray-400">Sem parcelas.</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
