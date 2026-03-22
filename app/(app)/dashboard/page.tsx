import { createClient } from '@/lib/supabase/server'
import { SEGMENTS } from '@/types'
import PrivacyToggle from '@/components/PrivacyToggle'

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, couple_id, share_with_partner')
    .eq('id', user.id)
    .single()

  // Fetch own transactions
  const { data: myTransactions } = await supabase
    .from('transactions')
    .select('type, amount, category:categories(segment)')
    .eq('user_id', user.id)

  // Fetch partner transactions if in couple and sharing enabled
  let partnerTransactions: typeof myTransactions = []
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
          .select('type, amount, category:categories(segment)')
          .eq('user_id', partnerId)
        partnerTransactions = pt ?? []
      }
    }
  }

  function summarize(transactions: typeof myTransactions) {
    const income = transactions?.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0) ?? 0
    const expenses = transactions?.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0) ?? 0
    return { income, expenses, balance: income - expenses }
  }

  const mine = summarize(myTransactions)
  const partner = summarize(partnerTransactions)
  const combined = {
    income: mine.income + partner.income,
    expenses: mine.expenses + partner.expenses,
    balance: mine.balance + partner.balance,
  }

  // By segment (combined)
  const allTransactions = [...(myTransactions ?? []), ...(partnerTransactions ?? [])]
  const bySegment = SEGMENTS.map(segment => {
    const txs = allTransactions.filter((t) => {
      const cat = Array.isArray(t.category) ? t.category[0] : t.category
      return cat?.segment === segment
    })
    const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    return { segment, income, expenses }
  }).filter(s => s.income > 0 || s.expenses > 0)

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Visão geral das finanças</p>
        </div>
        <PrivacyToggle
          userId={user.id}
          initialValue={profile?.share_with_partner ?? false}
        />
      </div>

      {/* Combined summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <SummaryCard label="Entradas do casal" value={combined.income} color="green" />
        <SummaryCard label="Saídas do casal" value={combined.expenses} color="red" />
        <SummaryCard label="Saldo do casal" value={combined.balance} color={combined.balance >= 0 ? 'indigo' : 'red'} />
      </div>

      {/* Individual breakdown */}
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

      {/* By segment */}
      {bySegment.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">Por segmento</p>
          <div className="space-y-3">
            {bySegment.map(({ segment, income, expenses }) => (
              <div key={segment} className="flex items-center gap-4">
                <span className="text-sm text-gray-600 w-28">{segment}</span>
                <div className="flex-1 flex gap-3 text-xs">
                  {income > 0 && <span className="text-green-600">+{formatCurrency(income)}</span>}
                  {expenses > 0 && <span className="text-red-500">-{formatCurrency(expenses)}</span>}
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
  const colorMap: Record<string, string> = {
    green: 'text-green-600',
    red: 'text-red-500',
    indigo: 'text-indigo-600',
  }
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
  const colorMap: Record<string, string> = {
    green: 'text-green-600',
    red: 'text-red-500',
    indigo: 'text-indigo-600',
  }
  return (
    <div className={`flex justify-between ${bold ? 'font-semibold' : ''}`}>
      <span className="text-gray-500">{label}</span>
      <span className={colorMap[color]}>
        {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </span>
    </div>
  )
}
