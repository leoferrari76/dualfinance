import { createClient } from '@/lib/supabase/server'
import { SEGMENTS } from '@/types'
import PrivacyToggle from '@/components/PrivacyToggle'
import MonthPicker from '@/components/MonthPicker'
import FinancialInsights from '@/components/FinancialInsights'

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function prevMonth(month: string) {
  const [year, mon] = month.split('-').map(Number)
  const d = new Date(year, mon - 2) // mon-1 is current, mon-2 is previous
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month = currentMonth() } = await searchParams
  const [year, mon] = month.split('-').map(Number)
  const startDate = `${year}-${String(mon).padStart(2, '0')}-01`
  const endDate = new Date(year, mon, 0).toISOString().split('T')[0]

  const prev = prevMonth(month)
  const [pyear, pmon] = prev.split('-').map(Number)
  const prevStart = `${pyear}-${String(pmon).padStart(2, '0')}-01`
  const prevEnd = new Date(pyear, pmon, 0).toISOString().split('T')[0]

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, couple_id, share_with_partner')
    .eq('id', user.id)
    .single()

  // Current month
  const { data: myTransactions } = await supabase
    .from('transactions')
    .select('type, amount, is_fixed, category:categories(segment)')
    .eq('user_id', user.id)
    .or(`and(is_fixed.eq.false,date.gte.${startDate},date.lte.${endDate}),and(is_fixed.eq.true,date.lte.${endDate})`)

  // Previous month
  const { data: myLastMonth } = await supabase
    .from('transactions')
    .select('type, amount, is_fixed')
    .eq('user_id', user.id)
    .or(`and(is_fixed.eq.false,date.gte.${prevStart},date.lte.${prevEnd}),and(is_fixed.eq.true,date.lte.${prevEnd})`)

  let partnerTransactions: typeof myTransactions = []
  let partnerLastMonth: typeof myLastMonth = []
  let partnerName = ''

  if (profile?.couple_id) {
    const { data: couple } = await supabase
      .from('couples')
      .select('user_1_id, user_2_id')
      .eq('id', profile.couple_id)
      .single()

    const partnerId = couple?.user_1_id === user.id ? couple?.user_2_id : couple?.user_1_id

    if (partnerId) {
      const { data: partnerProfile } = await supabase
        .from('profiles')
        .select('name, share_with_partner')
        .eq('id', partnerId)
        .single()

      partnerName = partnerProfile?.name ?? 'Parceiro(a)'

      if (partnerProfile?.share_with_partner) {
        const { data: pt } = await supabase
          .from('transactions')
          .select('type, amount, is_fixed, category:categories(segment)')
          .eq('user_id', partnerId)
          .or(`and(is_fixed.eq.false,date.gte.${startDate},date.lte.${endDate}),and(is_fixed.eq.true,date.lte.${endDate})`)
        partnerTransactions = pt ?? []

        const { data: ptl } = await supabase
          .from('transactions')
          .select('type, amount, is_fixed')
          .eq('user_id', partnerId)
          .or(`and(is_fixed.eq.false,date.gte.${prevStart},date.lte.${prevEnd}),and(is_fixed.eq.true,date.lte.${prevEnd})`)
        partnerLastMonth = ptl ?? []
      }
    }
  }

  function summarize(txs: { type: string; amount: number }[] | null) {
    const income = txs?.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0) ?? 0
    const expenses = txs?.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0) ?? 0
    return { income, expenses, balance: income - expenses }
  }

  const mine = summarize(myTransactions)
  const partner = summarize(partnerTransactions)
  const combined = {
    income: mine.income + partner.income,
    expenses: mine.expenses + partner.expenses,
    balance: mine.balance + partner.balance,
  }

  const allLast = [...(myLastMonth ?? []), ...(partnerLastMonth ?? [])]
  const lastMonth = summarize(allLast)

  const allTransactions = [...(myTransactions ?? []), ...(partnerTransactions ?? [])]

  const fixedExpenses = allTransactions
    .filter(t => t.type === 'expense' && t.is_fixed)
    .reduce((s, t) => s + Number(t.amount), 0)

  const bySegment = SEGMENTS.map(segment => {
    const txs = allTransactions.filter((t) => {
      const cat = Array.isArray(t.category) ? t.category[0] : t.category
      return cat?.segment === segment
    })
    const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    return { segment, income, expenses }
  }).filter(s => s.income > 0 || s.expenses > 0)

  const isCurrentMonth = month === currentMonth()

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Visão geral das finanças</p>
        </div>
        <div className="flex items-center gap-3">
          <MonthPicker value={month} />
          <PrivacyToggle userId={user.id} initialValue={profile?.share_with_partner ?? false} />
        </div>
      </div>

      {partnerName && partnerTransactions?.length === 0 && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4">
          Os totais abaixo incluem apenas seus dados — {partnerName} está com dados privados.
        </p>
      )}

      <div className="grid grid-cols-3 gap-4 mb-8">
        <SummaryCard label={partnerTransactions && partnerTransactions.length > 0 ? 'Entradas do casal' : 'Minhas entradas'} value={combined.income} color="green" />
        <SummaryCard label={partnerTransactions && partnerTransactions.length > 0 ? 'Saídas do casal' : 'Minhas saídas'} value={combined.expenses} color="red" />
        <SummaryCard label={partnerTransactions && partnerTransactions.length > 0 ? 'Saldo do casal' : 'Meu saldo'} value={combined.balance} color={combined.balance >= 0 ? 'indigo' : 'red'} />
      </div>

      {/* Financial Insights */}
      <FinancialInsights
        current={combined}
        lastMonth={lastMonth}
        bySegment={bySegment}
        month={month}
        fixedExpenses={fixedExpenses}
        isCurrentMonth={isCurrentMonth}
      />

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">Meu resumo</p>
          <div className="space-y-2 text-sm">
            <Row label="Entradas" value={mine.income} color="green" />
            <Row label="Saídas" value={mine.expenses} color="red" />
            <div className="border-t border-gray-100 pt-2">
              <Row label="Saldo" value={mine.balance} color={mine.balance >= 0 ? 'indigo' : 'red'} bold />
            </div>
          </div>
        </div>

        {partnerName && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-700 mb-3">{partnerName}</p>
            {partnerTransactions && partnerTransactions.length > 0 ? (
              <div className="space-y-2 text-sm">
                <Row label="Entradas" value={partner.income} color="green" />
                <Row label="Saídas" value={partner.expenses} color="red" />
                <div className="border-t border-gray-100 pt-2">
                  <Row label="Saldo" value={partner.balance} color={partner.balance >= 0 ? 'indigo' : 'red'} bold />
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Dados privados</p>
            )}
          </div>
        )}
      </div>

      {bySegment.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">Por segmento</p>
          <div className="space-y-3">
            {bySegment.map(({ segment, income, expenses }) => (
              <div key={segment} className="flex items-center gap-4">
                <span className="text-sm text-gray-600 w-28">{segment}</span>
                <div className="flex-1 flex gap-3 text-xs">
                  {income > 0 && <span className="text-green-600">+{income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>}
                  {expenses > 0 && <span className="text-red-500">-{expenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = { green: 'text-green-600', red: 'text-red-500', indigo: 'text-indigo-600' }
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${colorMap[color]}`}>
        {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </p>
    </div>
  )
}

function Row({ label, value, color, bold }: { label: string; value: number; color: string; bold?: boolean }) {
  const colorMap: Record<string, string> = { green: 'text-green-600', red: 'text-red-500', indigo: 'text-indigo-600' }
  return (
    <div className={`flex justify-between ${bold ? 'font-semibold' : ''}`}>
      <span className="text-gray-500">{label}</span>
      <span className={colorMap[color]}>{value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
    </div>
  )
}
