import { createClient } from '@/lib/supabase/server'
import TransactionList from '@/components/TransactionList'
import TransactionForm from '@/components/TransactionForm'
import MonthPicker from '@/components/MonthPicker'

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default async function TransactionsPage({
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

  // Regular transactions in the selected month + fixed transactions active from any past month
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*, category:categories(id, segment, custom_name)')
    .eq('user_id', user.id)
    .or(`and(is_fixed.eq.false,date.gte.${startDate},date.lte.${endDate}),and(is_fixed.eq.true,date.lte.${endDate})`)
    .order('date', { ascending: false })

  const { data: categories } = await supabase
    .from('categories')
    .select('id, segment, custom_name, user_id, created_at')
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .order('segment')

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="t-label" style={{ color: 'var(--caption)' }}>Lançamentos</p>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--ink)' }}>Ganhos e gastos fixos e avulsos</h1>
        </div>
        <MonthPicker value={month} />
      </div>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-2">
          <TransactionForm userId={user.id} categories={categories ?? []} />
        </div>
        <div className="col-span-3">
          <TransactionList transactions={transactions ?? []} categories={categories ?? []} month={month} />
        </div>
      </div>
    </div>
  )
}
