import { createClient } from '@/lib/supabase/server'
import CreditCardList from '@/components/CreditCardList'
import CreditCardForm from '@/components/CreditCardForm'
import InstallmentForm from '@/components/InstallmentForm'
import MonthPicker from '@/components/MonthPicker'

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month = currentMonth() } = await searchParams
  const [year, mon] = month.split('-').map(Number)
  const startDate = `${year}-${String(mon).padStart(2, '0')}-01`
  const endDate = new Date(year, mon, 0).toISOString().split('T')[0]

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: cards } = await supabase
    .from('credit_cards')
    .select('*')
    .eq('user_id', user.id)
    .order('name')

  // Only installments active in the selected month: started before end of month, ends after start of month
  const { data: installments } = await supabase
    .from('installments')
    .select('*, credit_card:credit_cards(name), category:categories(segment, custom_name)')
    .in('credit_card_id', (cards ?? []).map(c => c.id))
    .lte('start_date', endDate)
    .gte('end_date', startDate)
    .order('start_date', { ascending: false })

  const { data: categories } = await supabase
    .from('categories')
    .select('id, segment, custom_name, user_id, created_at')
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .order('segment')

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cartões de crédito</h1>
          <p className="text-sm text-gray-500 mt-0.5">Parcelas ativas no mês</p>
        </div>
        <MonthPicker value={month} />
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
            categories={categories ?? []}
          />
        </div>
      </div>
    </div>
  )
}
