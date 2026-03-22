import { createClient } from '@/lib/supabase/server'
import TransactionList from '@/components/TransactionList'
import TransactionForm from '@/components/TransactionForm'

export default async function TransactionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*, category:categories(id, segment, custom_name)')
    .eq('user_id', user.id)
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
          <h1 className="text-2xl font-bold text-gray-900">Lançamentos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ganhos e gastos fixos e avulsos</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-2">
          <TransactionForm userId={user.id} categories={categories ?? []} />
        </div>
        <div className="col-span-3">
          <TransactionList transactions={transactions ?? []} />
        </div>
      </div>
    </div>
  )
}
