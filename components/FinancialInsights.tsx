import type { Segment } from '@/types'

interface Stats {
  income: number
  expenses: number
  balance: number
}

interface Props {
  current: Stats
  lastMonth: Stats
  bySegment: { segment: Segment; income: number; expenses: number }[]
  month: string
  fixedExpenses: number
  isCurrentMonth: boolean
}

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function pct(value: number, total: number) {
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}

interface Alert {
  level: 'red' | 'yellow' | 'blue' | 'green'
  message: string
}

export default function FinancialInsights({
  current,
  lastMonth,
  bySegment,
  fixedExpenses,
  isCurrentMonth,
}: Props) {
  const alerts: Alert[] = []

  // 1. Saldo negativo
  if (current.expenses > 0 && current.balance < 0) {
    alerts.push({
      level: 'red',
      message: `Os gastos superam as entradas em ${fmt(Math.abs(current.balance))}. O orçamento está no negativo.`,
    })
  }

  // 2. Gastos em alta vs mês anterior
  if (lastMonth.expenses > 0 && current.expenses > lastMonth.expenses * 1.15) {
    const increase = pct(current.expenses - lastMonth.expenses, lastMonth.expenses)
    alerts.push({
      level: 'yellow',
      message: `Gastos ${increase}% acima do mês anterior (${fmt(lastMonth.expenses)} → ${fmt(current.expenses)}).`,
    })
  }

  // 3. Categoria dominante (>40% dos gastos)
  if (current.expenses > 0) {
    const dominant = bySegment
      .map(s => ({ segment: s.segment, share: pct(s.expenses, current.expenses) }))
      .filter(s => s.share >= 40)
    dominant.forEach(({ segment, share }) => {
      alerts.push({
        level: 'yellow',
        message: `${segment} representa ${share}% de todos os gastos. Vale avaliar se está dentro do planejado.`,
      })
    })
  }

  // 4. Gastos fixos comprometem >60% da renda
  if (current.income > 0 && fixedExpenses > current.income * 0.6) {
    const share = pct(fixedExpenses, current.income)
    alerts.push({
      level: 'blue',
      message: `Gastos fixos comprometem ${share}% da renda (${fmt(fixedExpenses)}). Pouco espaço para imprevistos.`,
    })
  }

  // 5. Saldo positivo — elogio
  if (current.balance > 0 && current.income > 0) {
    const savingsRate = pct(current.balance, current.income)
    if (savingsRate >= 10) {
      alerts.push({
        level: 'green',
        message: `Vocês estão guardando ${savingsRate}% da renda este mês. Ótima disciplina financeira.`,
      })
    }
  }

  // Projection (only for current month)
  let projection: { projected: number; savings3m: number; daysLeft: number } | null = null
  if (isCurrentMonth && current.income > 0) {
    const today = new Date()
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    const dayOfMonth = today.getDate()
    const daysLeft = daysInMonth - dayOfMonth

    const variableExpenses = current.expenses - fixedExpenses
    const dailyVariableRate = dayOfMonth > 0 ? variableExpenses / dayOfMonth : 0
    const projected = fixedExpenses + dailyVariableRate * daysInMonth
    const projectedBalance = current.income - projected
    const savings3m = projectedBalance * 3

    projection = { projected, savings3m, daysLeft }
  }

  // Closing sentence
  let closing = ''
  if (current.income === 0 && current.expenses === 0) {
    closing = ''
  } else if (current.balance < 0) {
    closing = 'Prioridade: reverter o saldo negativo antes de assumir novos compromissos.'
  } else if (alerts.some(a => a.level === 'yellow')) {
    closing = 'O orçamento está controlado, mas alguns pontos merecem atenção.'
  } else if (alerts.some(a => a.level === 'green')) {
    closing = 'Finanças equilibradas. Bom momento para reforçar a reserva de emergência.'
  } else if (alerts.length === 0 && current.income > 0) {
    closing = 'Nenhum alerta no momento. Continue acompanhando mês a mês.'
  }

  if (alerts.length === 0 && !projection && !closing) return null

  const levelStyle: Record<string, { background: string; color: string; border: string }> = {
    red:    { background: 'rgba(181,89,40,0.07)',  color: 'var(--gasto)',   border: 'rgba(181,89,40,0.2)' },
    yellow: { background: 'rgba(155,120,69,0.07)', color: 'var(--reserva)', border: 'rgba(155,120,69,0.2)' },
    blue:   { background: 'rgba(56,105,79,0.07)',  color: 'var(--ganho)',   border: 'rgba(56,105,79,0.2)' },
    green:  { background: 'rgba(56,105,79,0.07)',  color: 'var(--ganho)',   border: 'rgba(56,105,79,0.2)' },
  }

  const levelIcon: Record<string, string> = {
    red: '⚠', yellow: '↑', blue: 'ℹ', green: '✓',
  }

  return (
    <div className="rounded-2xl p-5 mb-6 space-y-4" style={{ background: 'var(--cream)', boxShadow: 'var(--lift-1)' }}>
      <p className="t-label" style={{ color: 'var(--caption)' }}>Análise do mês</p>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => {
            const s = levelStyle[alert.level]
            return (
              <div
                key={i}
                className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-sm"
                style={{ background: s.background, color: s.color, border: `1px solid ${s.border}` }}
              >
                <span className="mt-0.5 font-bold shrink-0">{levelIcon[alert.level]}</span>
                <span>{alert.message}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Projection */}
      {projection && (
        <div className="pt-4 space-y-2" style={{ borderTop: '1px solid var(--receipt)' }}>
          <p className="t-label" style={{ color: 'var(--faint)' }}>Projeção</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3" style={{ background: 'var(--receipt)' }}>
              <p className="t-meta mb-0.5">Gasto projetado no mês</p>
              <p className="t-value" style={{ color: 'var(--ink)', fontSize: '15px' }}>{fmt(projection.projected)}</p>
              <p className="t-meta">{projection.daysLeft} dias restantes</p>
            </div>
            <div className="rounded-xl p-3" style={{
              background: projection.savings3m >= 0 ? 'rgba(56,105,79,0.07)' : 'rgba(181,89,40,0.07)',
            }}>
              <p className="t-meta mb-0.5">Economia projetada em 3 meses</p>
              <p className="t-value" style={{ color: projection.savings3m >= 0 ? 'var(--ganho)' : 'var(--gasto)', fontSize: '15px' }}>
                {fmt(projection.savings3m)}
              </p>
              <p className="t-meta">mantendo o ritmo atual</p>
            </div>
          </div>
        </div>
      )}

      {/* Closing */}
      {closing && (
        <p className="t-meta pt-3 italic" style={{ borderTop: '1px solid var(--receipt)' }}>
          {closing}
        </p>
      )}
    </div>
  )
}
