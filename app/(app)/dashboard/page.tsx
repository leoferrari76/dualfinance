import { createClient } from '@/lib/supabase/server'
import { SEGMENTS } from '@/types'
import PrivacyToggle from '@/components/PrivacyToggle'
import MonthPicker from '@/components/MonthPicker'
import FinancialInsights from '@/components/FinancialInsights'
import ForecastChart from '@/components/ForecastChart'

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function prevMonth(month: string) {
  const [year, mon] = month.split('-').map(Number)
  const d = new Date(year, mon - 2)
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

  // Current month transactions
  const { data: myTransactions } = await supabase
    .from('transactions')
    .select('type, amount, is_fixed, category:categories(id, segment, custom_name)')
    .eq('user_id', user.id)
    .or(`and(is_fixed.eq.false,date.gte.${startDate},date.lte.${endDate}),and(is_fixed.eq.true,date.lte.${endDate})`)

  // Previous month transactions
  const { data: myLastMonth } = await supabase
    .from('transactions')
    .select('type, amount, is_fixed')
    .eq('user_id', user.id)
    .or(`and(is_fixed.eq.false,date.gte.${prevStart},date.lte.${prevEnd}),and(is_fixed.eq.true,date.lte.${prevEnd})`)

  let partnerTransactions: typeof myTransactions = []
  let partnerLastMonth: typeof myLastMonth = []
  let partnerName = ''
  let partnerId: string | null = null
  let partnerSharing = false

  if (profile?.couple_id) {
    const { data: couple } = await supabase
      .from('couples')
      .select('user_1_id, user_2_id')
      .eq('id', profile.couple_id)
      .single()

    partnerId = couple?.user_1_id === user.id ? couple?.user_2_id : couple?.user_1_id

    if (partnerId) {
      const { data: partnerProfile } = await supabase
        .from('profiles')
        .select('name, share_with_partner')
        .eq('id', partnerId)
        .single()

      partnerName = partnerProfile?.name ?? 'Parceiro(a)'
      partnerSharing = partnerProfile?.share_with_partner ?? false

      if (partnerSharing) {
        const { data: pt } = await supabase
          .from('transactions')
          .select('type, amount, is_fixed, category:categories(id, segment, custom_name)')
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

  // ── Credit card installments ─────────────────────────────────────────────
  const { data: myCards } = await supabase
    .from('credit_cards')
    .select('id')
    .eq('user_id', user.id)

  const myCardIds = (myCards ?? []).map((c: { id: string }) => c.id)
  let partnerCardIds: string[] = []

  if (partnerId && partnerSharing) {
    const { data: partnerCards } = await supabase
      .from('credit_cards')
      .select('id')
      .eq('user_id', partnerId)
    partnerCardIds = (partnerCards ?? []).map((c: { id: string }) => c.id)
  }

  const cardIds = [...myCardIds, ...partnerCardIds]

  // Fetch installments active in the window: selected month → +5 months
  const lastForecastDate = new Date(year, mon - 1 + 5) // first of 6th forecast month
  const lastForecastStart = `${lastForecastDate.getFullYear()}-${String(lastForecastDate.getMonth() + 1).padStart(2, '0')}-01`

  type RawInstallment = { per_installment_amount: number; start_date: string; end_date: string; credit_card_id: string }
  let allInstallments: RawInstallment[] = []

  if (cardIds.length > 0) {
    const { data: insts } = await supabase
      .from('installments')
      .select('per_installment_amount, start_date, end_date, credit_card_id')
      .in('credit_card_id', cardIds)
      .lte('start_date', lastForecastStart)
      .gte('end_date', startDate)
    allInstallments = (insts ?? []) as RawInstallment[]
  }

  function cardExpensesForMonth(monthStart: string, filterCardIds?: string[]) {
    return allInstallments
      .filter(inst =>
        inst.start_date <= monthStart &&
        inst.end_date >= monthStart &&
        (filterCardIds ? filterCardIds.includes(inst.credit_card_id) : true)
      )
      .reduce((s, inst) => s + Number(inst.per_installment_amount), 0)
  }

  // ── Summaries ────────────────────────────────────────────────────────────
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

  const myCardExpenses = cardExpensesForMonth(startDate, myCardIds)
  const partnerCardExpenses = cardExpensesForMonth(startDate, partnerCardIds)
  const cardExpenses = myCardExpenses + partnerCardExpenses
  const totalExpenses = combined.expenses + cardExpenses
  const totalBalance = combined.income - totalExpenses

  const myTotalExpenses = mine.expenses + myCardExpenses
  const myBalance = mine.income - myTotalExpenses
  const partnerTotalExpenses = partner.expenses + partnerCardExpenses
  const partnerBalance = partner.income - partnerTotalExpenses

  const bySegment = SEGMENTS.map(segment => {
    const txs = allTransactions.filter((t) => {
      const cat = Array.isArray(t.category) ? t.category[0] : t.category
      return cat?.segment === segment
    })
    const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

    // Group by subcategory
    const subcatMap = new Map<string, { name: string; income: number; expenses: number }>()
    for (const tx of txs) {
      const cat = Array.isArray(tx.category) ? tx.category[0] : tx.category
      if (!cat) continue
      const key = cat.id as string
      const name = (cat.custom_name ?? cat.segment) as string
      if (!subcatMap.has(key)) subcatMap.set(key, { name, income: 0, expenses: 0 })
      const entry = subcatMap.get(key)!
      if (tx.type === 'income') entry.income += Number(tx.amount)
      else entry.expenses += Number(tx.amount)
    }
    const subcats = Array.from(subcatMap.values()).sort((a, b) => b.expenses - a.expenses)

    return { segment, income, expenses, subcats }
  }).filter(s => s.income > 0 || s.expenses > 0)

  const isCurrentMonth = month === currentMonth()

  // ── 6-month forecast ─────────────────────────────────────────────────────
  const forecastData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(year, mon - 1 + i)
    const fy = d.getFullYear()
    const fm = d.getMonth() + 1
    const monthStart = `${fy}-${String(fm).padStart(2, '0')}-01`
    const cardTotal = cardExpensesForMonth(monthStart)

    return {
      month: `${fy}-${String(fm).padStart(2, '0')}`,
      income: combined.income,
      normalExpenses: combined.expenses,
      cardExpenses: cardTotal,
      balance: combined.income - combined.expenses - cardTotal,
    }
  })

  const hasPartnerData = (partnerTransactions?.length ?? 0) > 0
  const myName = profile?.name ?? 'Você'

  // Split bar percentages
  const myIncomePct = combined.income > 0 ? (mine.income / combined.income) * 100 : (partnerName ? 50 : 100)
  const partnerIncomePct = 100 - myIncomePct

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="t-label" style={{ color: 'var(--caption)' }}>Visão geral</p>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--ink)' }}>Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <MonthPicker value={month} />
          <PrivacyToggle userId={user.id} initialValue={profile?.share_with_partner ?? false} />
        </div>
      </div>

      {partnerName && !hasPartnerData && (
        <p className="text-xs rounded-xl px-3 py-2 mb-4" style={{ color: 'var(--reserva)', background: 'rgba(155,120,69,0.08)', border: '1px solid rgba(155,120,69,0.2)' }}>
          Os totais abaixo incluem apenas seus dados — {partnerName} está com dados privados.
        </p>
      )}

      {/* Hero: Saldo + couple split */}
      <div className="rounded-2xl p-6 mb-6" style={{ background: 'var(--chumbo)', boxShadow: 'var(--lift-2)' }}>
        <p className="t-label mb-1" style={{ color: 'var(--faint)' }}>
          {hasPartnerData ? 'Saldo do casal' : 'Meu saldo'}
        </p>
        <p className="t-display mb-5" style={{ color: totalBalance >= 0 ? 'var(--ganho)' : 'var(--gasto)', filter: 'brightness(1.4)' }}>
          {totalBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </p>

        {/* Income split bar */}
        <p className="t-label mb-2" style={{ color: 'var(--faint)' }}>Composição da renda</p>
        <div className="flex rounded-full overflow-hidden h-2 mb-3" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div style={{ width: `${myIncomePct}%`, background: 'var(--ganho)' }} />
          {partnerName && (
            <div style={{ width: `${partnerIncomePct}%`, background: 'var(--reserva)' }} />
          )}
        </div>
        <div className="flex gap-6">
          <div>
            <p className="t-meta" style={{ color: 'var(--faint)' }}>{myName}</p>
            <p className="t-value" style={{ color: 'var(--ganho)', filter: 'brightness(1.3)' }}>
              {mine.income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
          {partnerName && (
            <div>
              <p className="t-meta" style={{ color: 'var(--faint)' }}>{partnerName}</p>
              <p className="t-value" style={{ color: hasPartnerData ? 'var(--reserva)' : 'var(--faint)', filter: hasPartnerData ? 'brightness(1.3)' : 'none' }}>
                {hasPartnerData ? partner.income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Privado'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <SummaryCard
          label={hasPartnerData ? 'Entradas do casal' : 'Minhas entradas'}
          value={combined.income}
          type="income"
        />
        <SummaryCard
          label={hasPartnerData ? 'Saídas do casal' : 'Minhas saídas'}
          value={totalExpenses}
          type="expense"
          subtitle={
            cardExpenses > 0
              ? `Transações ${combined.expenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · Cartão ${cardExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
              : undefined
          }
        />
      </div>

      {/* Financial Insights */}
      <FinancialInsights
        current={{ ...combined, expenses: totalExpenses, balance: totalBalance }}
        lastMonth={lastMonth}
        bySegment={bySegment}
        month={month}
        fixedExpenses={fixedExpenses + cardExpenses}
        isCurrentMonth={isCurrentMonth}
      />

      {/* 6-month forecast chart */}
      <ForecastChart months={forecastData} />

      {/* Individual summaries */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl p-5" style={{ background: 'var(--cream)', boxShadow: 'var(--lift-1)' }}>
          <p className="t-label mb-3" style={{ color: 'var(--caption)' }}>{myName}</p>
          <div className="space-y-2">
            <Row label="Entradas" value={mine.income} type="income" />
            <Row label="Saídas" value={myTotalExpenses} type="expense" />
            <div className="pt-2" style={{ borderTop: '1px solid var(--receipt)' }}>
              <Row label="Saldo" value={myBalance} type={myBalance >= 0 ? 'balance' : 'expense'} bold />
            </div>
          </div>
        </div>

        {partnerName && (
          <div className="rounded-2xl p-5" style={{ background: 'var(--cream)', boxShadow: 'var(--lift-1)' }}>
            <p className="t-label mb-3" style={{ color: 'var(--caption)' }}>{partnerName}</p>
            {hasPartnerData ? (
              <div className="space-y-2">
                <Row label="Entradas" value={partner.income} type="income" />
                <Row label="Saídas" value={partnerTotalExpenses} type="expense" />
                <div className="pt-2" style={{ borderTop: '1px solid var(--receipt)' }}>
                  <Row label="Saldo" value={partnerBalance} type={partnerBalance >= 0 ? 'balance' : 'expense'} bold />
                </div>
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--faint)' }}>Dados privados</p>
            )}
          </div>
        )}
      </div>

      {bySegment.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--cream)', boxShadow: 'var(--lift-1)' }}>
          <p className="t-label px-5 pt-5 pb-3" style={{ color: 'var(--caption)' }}>Por categoria</p>
          {bySegment.map(({ segment, income, expenses, subcats }, si) => (
            <div key={segment} style={{ borderTop: si === 0 ? 'none' : '1px solid var(--receipt)' }}>
              {/* Segment header */}
              <div className="flex items-center justify-between px-5 py-3">
                <span className="text-sm font-bold" style={{ color: 'var(--ink)' }}>{segment}</span>
                <div className="flex gap-3 text-xs font-bold">
                  {income > 0 && <span style={{ color: 'var(--ganho)' }}>+{income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>}
                  {expenses > 0 && <span style={{ color: 'var(--gasto)' }}>-{expenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>}
                </div>
              </div>
              {/* Subcategories */}
              {subcats.map((sub, ci) => (
                <div
                  key={ci}
                  className="flex items-center justify-between px-5 py-2"
                  style={{ borderTop: '1px solid var(--receipt)', background: 'rgba(27,25,22,0.02)' }}
                >
                  <span className="text-xs" style={{ color: 'var(--caption)', paddingLeft: '12px' }}>
                    — {sub.name}
                  </span>
                  <div className="flex gap-3 text-xs">
                    {sub.income > 0 && <span style={{ color: 'var(--ganho)' }}>+{sub.income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>}
                    {sub.expenses > 0 && <span style={{ color: 'var(--gasto)' }}>-{sub.expenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>}
                  </div>
                </div>
              ))}
            </div>
          ))}
          <div className="pb-2" />
        </div>
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  type,
  subtitle,
}: {
  label: string
  value: number
  type: 'income' | 'expense' | 'balance'
  subtitle?: string
}) {
  const colorMap = { income: 'var(--ganho)', expense: 'var(--gasto)', balance: 'var(--reserva)' }
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--cream)', boxShadow: 'var(--lift-1)' }}>
      <p className="t-label mb-2" style={{ color: 'var(--caption)' }}>{label}</p>
      <p className="t-value" style={{ color: colorMap[type], fontSize: '18px' }}>
        {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </p>
      {subtitle && (
        <p className="t-meta mt-1 leading-tight">{subtitle}</p>
      )}
    </div>
  )
}

function Row({ label, value, type, bold }: { label: string; value: number; type: 'income' | 'expense' | 'balance'; bold?: boolean }) {
  const colorMap = { income: 'var(--ganho)', expense: 'var(--gasto)', balance: 'var(--reserva)' }
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm" style={{ color: 'var(--caption)', fontWeight: bold ? 500 : 400 }}>{label}</span>
      <span className="t-value" style={{ color: colorMap[type], fontSize: '13px' }}>
        {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </span>
    </div>
  )
}
