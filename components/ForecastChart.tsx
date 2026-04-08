'use client'

export interface ForecastMonth {
  month: string        // YYYY-MM
  income: number
  normalExpenses: number
  cardExpenses: number
  balance: number
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtShort(v: number) {
  const abs = Math.abs(v)
  if (abs >= 1000) return `${v < 0 ? '-' : ''}${(abs / 1000).toFixed(1)}k`
  return v.toFixed(0)
}

function monthLabel(month: string) {
  const [year, mon] = month.split('-').map(Number)
  return new Date(year, mon - 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
}

export default function ForecastChart({ months }: { months: ForecastMonth[] }) {
  const hasData = months.some(m => m.income > 0 || m.normalExpenses > 0 || m.cardExpenses > 0)

  if (!hasData) {
    return (
      <div className="rounded-2xl p-5 mb-6" style={{ background: 'var(--cream)', boxShadow: 'var(--lift-1)' }}>
        <p className="t-label mb-1" style={{ color: 'var(--caption)' }}>Previsão — próximos 6 meses</p>
        <p className="t-meta py-6 text-center">Adicione entradas e saídas para ver a previsão.</p>
      </div>
    )
  }

  const W = 580
  const H = 200
  const ML = 52   // margin left
  const MR = 12   // margin right
  const MT = 16   // margin top
  const MB = 28   // margin bottom
  const PW = W - ML - MR
  const PH = H - MT - MB

  const maxVal = Math.max(
    ...months.flatMap(m => [m.income, m.normalExpenses + m.cardExpenses]),
    100,
  ) * 1.12  // 12% headroom

  const sy = (v: number) => MT + PH - (v / maxVal) * PH

  const n = months.length
  const slotW = PW / n
  const bw = slotW * 0.52

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(p => maxVal * p)

  // Income polyline points
  const incomePoints = months.map((m, i) => {
    const cx = ML + i * slotW + slotW / 2
    return `${cx},${sy(m.income)}`
  }).join(' ')

  return (
    <div className="rounded-2xl p-5 mb-6" style={{ background: 'var(--cream)', boxShadow: 'var(--lift-1)' }}>
      <p className="t-label mb-0.5" style={{ color: 'var(--caption)' }}>Previsão — próximos 6 meses</p>
      <p className="t-meta mb-4">
        Baseado na renda e gastos do mês selecionado + parcelas futuras do cartão
      </p>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-3 text-xs" style={{ color: 'var(--caption)' }}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#D4895A' }} />
          Gastos normais
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: 'var(--gasto)' }} />
          Cartão
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4" style={{ borderTop: '2px dashed var(--ganho)' }} />
          Renda
        </span>
      </div>

      {/* SVG Chart */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* Y-axis grid + labels */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line
              x1={ML} y1={sy(v)}
              x2={ML + PW} y2={sy(v)}
              stroke="#f3f4f6" strokeWidth="1"
            />
            <text
              x={ML - 5} y={sy(v) + 4}
              textAnchor="end" fontSize="9" fill="#9ca3af"
            >
              {fmtShort(v)}
            </text>
          </g>
        ))}

        {/* Bars */}
        {months.map((m, i) => {
          const cx = ML + i * slotW + slotW / 2
          const bx = cx - bw / 2
          const totalExp = m.normalExpenses + m.cardExpenses
          const normalH = (m.normalExpenses / maxVal) * PH
          const cardH = (m.cardExpenses / maxVal) * PH
          const isFirst = i === 0

          return (
            <g key={m.month}>
              {/* Highlight current month */}
              {isFirst && (
                <rect
                  x={ML + i * slotW} y={MT}
                  width={slotW} height={PH}
                  fill="rgba(27,25,22,0.03)" rx="0"
                />
              )}

              {/* Normal expenses (bottom of stack) */}
              {m.normalExpenses > 0 && (
                <rect
                  x={bx} y={sy(m.normalExpenses)}
                  width={bw} height={normalH}
                  fill="#D4895A" rx="2"
                />
              )}

              {/* Card expenses (stacked on top) */}
              {m.cardExpenses > 0 && (
                <rect
                  x={bx} y={sy(totalExp)}
                  width={bw} height={cardH}
                  fill="#B55928" rx="2"
                />
              )}

              {/* Month label */}
              <text
                x={cx} y={H - MB + 14}
                textAnchor="middle" fontSize="10"
                fill={isFirst ? '#1B1916' : '#6B6459'}
                fontWeight={isFirst ? '600' : '400'}
              >
                {monthLabel(m.month)}
              </text>
            </g>
          )
        })}

        {/* Income dashed line */}
        <polyline
          points={incomePoints}
          fill="none" stroke="#38694F"
          strokeWidth="2" strokeDasharray="5 3"
        />

        {/* Income dots */}
        {months.map((m, i) => {
          const cx = ML + i * slotW + slotW / 2
          return (
            <circle
              key={m.month}
              cx={cx} cy={sy(m.income)}
              r="3" fill="#38694F" stroke="#FEFCF7" strokeWidth="1.5"
            />
          )
        })}
      </svg>

      {/* Monthly balance cards */}
      <div className="grid grid-cols-6 gap-1 mt-2">
        {months.map((m, i) => (
          <div
            key={m.month}
            title={`Renda: ${fmtBRL(m.income)}\nGastos: ${fmtBRL(m.normalExpenses + m.cardExpenses)}\nSaldo: ${fmtBRL(m.balance)}`}
            className="text-center px-1 py-2 rounded-xl"
            style={{
              background: m.balance >= 0 ? 'rgba(56,105,79,0.08)' : 'rgba(181,89,40,0.08)',
              color: m.balance >= 0 ? 'var(--ganho)' : 'var(--gasto)',
              outline: i === 0 ? '1px solid var(--receipt)' : 'none',
            }}
          >
            <p className="t-meta mb-0.5" style={{ color: 'var(--faint)' }}>{monthLabel(m.month)}</p>
            <p className="text-xs font-semibold leading-tight">
              {m.balance >= 0 ? '+' : ''}{fmtShort(m.balance)}
            </p>
          </div>
        ))}
      </div>
      <p className="t-meta mt-2 text-right" style={{ color: 'var(--faint)' }}>
        Passe o mouse nos cards para ver o detalhamento
      </p>
    </div>
  )
}
