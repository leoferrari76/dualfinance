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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-8">
        <p className="text-sm font-semibold text-gray-700 mb-1">Previsão — próximos 6 meses</p>
        <p className="text-sm text-gray-400 py-6 text-center">
          Adicione entradas e saídas para ver a previsão.
        </p>
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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-8">
      <p className="text-sm font-semibold text-gray-700 mb-0.5">Previsão — próximos 6 meses</p>
      <p className="text-xs text-gray-400 mb-4">
        Baseado na renda e gastos do mês selecionado + parcelas futuras do cartão
      </p>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-3 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-indigo-200" />
          Gastos normais
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-indigo-500" />
          Cartão
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 border-t-2 border-dashed border-emerald-500" />
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
                  fill="#f9fafb" rx="0"
                />
              )}

              {/* Normal expenses (bottom of stack) */}
              {m.normalExpenses > 0 && (
                <rect
                  x={bx} y={sy(m.normalExpenses)}
                  width={bw} height={normalH}
                  fill="#c7d2fe" rx="2"
                />
              )}

              {/* Card expenses (stacked on top) */}
              {m.cardExpenses > 0 && (
                <rect
                  x={bx} y={sy(totalExp)}
                  width={bw} height={cardH}
                  fill="#6366f1" rx="2"
                />
              )}

              {/* Month label */}
              <text
                x={cx} y={H - MB + 14}
                textAnchor="middle" fontSize="10"
                fill={isFirst ? '#374151' : '#6b7280'}
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
          fill="none" stroke="#10b981"
          strokeWidth="2" strokeDasharray="5 3"
        />

        {/* Income dots */}
        {months.map((m, i) => {
          const cx = ML + i * slotW + slotW / 2
          return (
            <circle
              key={m.month}
              cx={cx} cy={sy(m.income)}
              r="3" fill="#10b981" stroke="white" strokeWidth="1.5"
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
            className={`text-center px-1 py-2 rounded-xl text-xs ${
              m.balance >= 0
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-600'
            } ${i === 0 ? 'ring-1 ring-gray-200' : ''}`}
          >
            <p className="text-[10px] text-gray-400 mb-0.5">{monthLabel(m.month)}</p>
            <p className="font-semibold leading-tight">
              {m.balance >= 0 ? '+' : ''}{fmtShort(m.balance)}
            </p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-gray-300 mt-2 text-right">
        Passe o mouse nos cards para ver o detalhamento
      </p>
    </div>
  )
}
