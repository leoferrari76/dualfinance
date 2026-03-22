import { createClient } from '@/lib/supabase/server'
import CreditCardList from '@/components/CreditCardList'
import CreditCardForm from '@/components/CreditCardForm'
import InstallmentForm from '@/components/InstallmentForm'

export default async function CardsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: cards } = await supabase
    .from('credit_cards')
    .select('*')
    .eq('user_id', user.id)
    .order('name')

  const { data: installments } = await supabase
    .from('installments')
    .select('*, credit_card:credit_cards(name), category:categories(segment, custom_name)')
    .in('credit_card_id', (cards ?? []).map(c => c.id))
    .order('start_date', { ascending: false })

  const { data: categories } = await supabase
    .from('categories')
    .select('id, segment, custom_name, user_id, created_at')
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .order('segment')

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cartões de crédito</h1>
        <p className="text-sm text-gray-500 mt-0.5">Cartões e compras parceladas</p>
      </div>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-2 space-y-4">
          <CreditCardForm userId={user.id} />
          {(cards ?? []).length > 0 && (
            <InstallmentForm
              userId={user.id}
              cards={cards ?? []}
              categories={categories ?? []}
            />
          )}
        </div>
        <div className="col-span-3">
          <CreditCardList
            cards={cards ?? []}
            installments={installments ?? []}
          />
        </div>
      </div>
    </div>
  )
}
