import { createClient } from '@/lib/supabase/server'
import { SEGMENTS } from '@/types'
import type { Segment } from '@/types'
import MonthPicker from '@/components/MonthPicker'

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

type SubcatEntry = { categoryId: string; name: string; income: number; expenses: number }
type SegmentEntry = { segment: Segment; income: number; expenses: number; subcats: SubcatEntry[] }

export default async function AnalisePage({
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, couple_id, share_with_partner')
    .eq('id', user.id)
    .single()

  // My transactions
  const { data: myTxs } = await supabase
    .from('transactions')
    .select('type, amount, is_fixed, category:categories(id, segment, custom_name)')
    .eq('user_id', user.id)
    .or(`and(is_fixed.eq.false,date.gte.${startDate},date.lte.${endDate}),and(is_fixed.eq.true,date.lte.${endDate})`)

  // Partner transactions (if sharing)
  let partnerTxs: typeof myTxs = []
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
          .select('type, amount, is_fixed, category:categories(id, segment, custom_name)')
          .eq('user_id', partnerId)
          .or(`and(is_fixed.eq.false,date.gte.${startDate},date.lte.${endDate}),and(is_fixed.eq.true,date.lte.${endDate})`)
        partnerTxs = pt ?? []
      }
    }
  }

  // Credit card installments
  const { data: myCards } = await supabase
    .from('credit_cards')
    .select('id')
    .eq('user_id', user.id)

  const cardIds = (myCards ?? []).map((c: { id: string }) => c.id)

  type InstRow = { per_installment_amount: number; category: { id: string; segment: string; custom_name: string | null } | null }
  let installmentRows: InstRow[] = []

  if (cardIds.length > 0) {
    const { data: insts } = await supabase
      .from('installments')
      .select('per_installment_amount, category:categories(id, segment, custom_name)')
      .in('credit_card_id', cardIds)
      .lte('start_date', startDate)
      .gte('end_date', startDate)
    installmentRows = (insts ?? []) as unknown as InstRow[]
  }

  // ── Build breakdown ───────────────────────────────────────────────────────
  type TxLike = { type: string; amount: number; category: unknown }

  const allTxs: TxLike[] = [...(myTxs ?? []), ...(partnerTxs ?? [])]

  const segMap = new Map<Segment, Map<string, SubcatEntry>>()

  function accumulate(cat: { id: string; segment: string; custom_name: string | null } | null, type: 'income' | 'expense', amount: number) {
    if (!cat) return
    const seg = cat.segment as Segment
    if (!SEGMENTS.includes(seg)) return

    if (!segMap.has(seg)) segMap.set(seg, new Map())
    const catMap = segMap.get(seg)!
    const key = cat.id

    if (!catMap.has(key)) {
      catMap.set(key, {
        categoryId: cat.id,
        name: cat.custom_name ?? cat.segment,
        income: 0,
        expenses: 0,
      })
    }
    const entry = catMap.get(key)!
    if (type === 'income') entry.income += Number(amount)
    else entry.expenses += Number(amount)
  }

  for (const tx of allTxs) {
    const cat = Array.isArray(tx.category) ? tx.category[0] : tx.category
    accumulate(cat as { id: string; segment: string; custom_name: string | null } | null, tx.type as 'income' | 'expense', tx.amount as number)
  }

  // Installments always count as expenses
  for (const inst of installmentRows) {
    const cat = Array.isArray(inst.category) ? inst.category[0] : inst.category
    accumulate(cat as { id: string; segment: string; custom_name: string | null } | null, 'expense', inst.per_installment_amount)
  }

  const breakdown: SegmentEntry[] = SEGMENTS
    .map(segment => {
      const catMap = segMap.get(segment)
      if (!catMap) return null
      const subcats = Array.from(catMap.values()).sort((a, b) => b.expenses - a.expenses)
      const income = subcats.reduce((s, c) => s + c.income, 0)
      const expenses = subcats.reduce((s, c) => s + c.expenses, 0)
      return { segment, income, expenses, subcats }
    })
    .filter((s): s is SegmentEntry => s !== null && (s.income > 0 || s.expenses > 0))

  const expenseSegments = breakdown
    .filter(s => s.expenses > 0)
    .sort((a, b) => b.expenses - a.expenses)

  const incomeSegments = breakdown
    .filter(s => s.income > 0)
    .sort((a, b) => b.income - a.income)

  const totalExpenses = expenseSegments.reduce((s, seg) => s + seg.expenses, 0)
  const totalIncome = incomeSegments.reduce((s, seg) => s + seg.income, 0)
  const balance = totalIncome - totalExpenses

  const myName = profile?.name ?? 'Você'
  const hasPartner = !!partnerName

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="t-label" style={{ color: 'var(--caption)' }}>Análise</p>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--ink)' }}>
            {hasPartner ? `${myName} + ${partnerName}` : 'Meus lançamentos'}
          </h1>
        </div>
        <MonthPicker value={month} />
      </div>

      {/* Totals strip */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <TotalCard label="Ganhos" value={totalIncome} color="var(--ganho)" />
        <TotalCard label="Gastos" value={totalExpenses} color="var(--gasto)" />
        <TotalCard label="Saldo" value={balance} color={balance >= 0 ? 'var(--ganho)' : 'var(--gasto)'} />
      </div>

      {/* Expenses breakdown */}
      {expenseSegments.length > 0 && (
        <section className="mb-6">
          <p className="t-label mb-3" style={{ color: 'var(--caption)' }}>Gastos por categoria</p>
          <div className="space-y-3">
            {expenseSegments.map(seg => (
              <SegmentBlock
                key={seg.segment}
                segment={seg.segment}
                total={seg.expenses}
                maxTotal={expenseSegments[0].expenses}
                subcats={seg.subcats.filter(c => c.expenses > 0)}
                type="expense"
              />
            ))}
          </div>
        </section>
      )}

      {/* Income breakdown */}
      {incomeSegments.length > 0 && (
        <section>
          <p className="t-label mb-3" style={{ color: 'var(--caption)' }}>Ganhos por categoria</p>
          <div className="space-y-3">
            {incomeSegments.map(seg => (
              <SegmentBlock
                key={seg.segment}
                segment={seg.segment}
                total={seg.income}
                maxTotal={incomeSegments[0].income}
                subcats={seg.subcats.filter(c => c.income > 0)}
                type="income"
              />
            ))}
          </div>
        </section>
      )}

      {breakdown.length === 0 && (
        <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--cream)', boxShadow: 'var(--lift-1)' }}>
          <p className="text-sm" style={{ color: 'var(--faint)' }}>Nenhum lançamento neste mês.</p>
        </div>
      )}
    </div>
  )
}

function TotalCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--cream)', boxShadow: 'var(--lift-1)' }}>
      <p className="t-label mb-1" style={{ color: 'var(--caption)' }}>{label}</p>
      <p className="t-value" style={{ color, fontSize: '15px' }}>
        {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </p>
    </div>
  )
}

function SegmentBlock({
  segment,
  total,
  maxTotal,
  subcats,
  type,
}: {
  segment: string
  total: number
  maxTotal: number
  subcats: SubcatEntry[]
  type: 'income' | 'expense'
}) {
  const color = type === 'expense' ? 'var(--gasto)' : 'var(--ganho)'
  const barBg = type === 'expense' ? 'rgba(181,89,40,0.15)' : 'rgba(56,105,79,0.15)'
  const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--cream)', boxShadow: 'var(--lift-1)' }}>
      {/* Segment header */}
      <div className="px-5 py-4" style={{ borderBottom: subcats.length > 0 ? '1px solid var(--receipt)' : 'none' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{segment}</span>
          <span className="t-value" style={{ color, fontSize: '14px' }}>
            {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: barBg }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
      </div>

      {/* Subcategories */}
      {subcats.map((cat, i) => {
        const catPct = total > 0 ? (type === 'expense' ? cat.expenses / total : cat.income / total) * 100 : 0
        const catValue = type === 'expense' ? cat.expenses : cat.income
        return (
          <div
            key={cat.categoryId}
            className="px-5 py-3 flex items-center gap-3"
            style={{ borderBottom: i < subcats.length - 1 ? '1px solid var(--receipt)' : 'none' }}
          >
            {/* Mini bar */}
            <div className="flex-1 flex items-center gap-3">
              <span className="text-xs w-28 truncate" style={{ color: 'var(--caption)' }}>{cat.name}</span>
              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: barBg }}>
                <div className="h-full rounded-full" style={{ width: `${catPct}%`, background: color, opacity: 0.7 }} />
              </div>
            </div>
            <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--ink)', minWidth: '72px', textAlign: 'right' }}>
              {catValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
        )
      })}
    </div>
  )
}
