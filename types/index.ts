export type Segment =
  | 'Moradia'
  | 'Educação'
  | 'Saúde'
  | 'Transporte'
  | 'Financiamento'
  | 'Alimentação'
  | 'Pessoal'
  | 'Trabalho'

export const SEGMENTS: Segment[] = [
  'Moradia',
  'Educação',
  'Saúde',
  'Transporte',
  'Financiamento',
  'Alimentação',
  'Pessoal',
  'Trabalho',
]

export type TransactionType = 'income' | 'expense'

export interface Profile {
  id: string
  name: string
  email: string
  couple_id: string | null
  share_with_partner: boolean
  created_at: string
}

export interface Couple {
  id: string
  user_1_id: string
  user_2_id: string | null
  invite_code: string
  created_at: string
}

export interface Category {
  id: string
  segment: Segment
  custom_name: string | null
  user_id?: string | null
  created_at?: string
}

export interface Transaction {
  id: string
  user_id: string
  type: TransactionType
  amount: number
  category_id: string
  category?: Category
  date: string
  description: string
  is_fixed: boolean
  credit_card_id: string | null
  created_at: string
}

export interface CreditCard {
  id: string
  user_id: string
  name: string
  closing_day: number
  created_at: string
}

export interface Installment {
  id: string
  credit_card_id: string
  credit_card?: CreditCard
  description: string
  total_amount: number
  per_installment_amount: number
  total_installments: number
  start_date: string
  end_date: string
  is_recurring: boolean
  category_id: string
  category?: Category
  created_at: string
}

export interface DashboardSummary {
  total_income: number
  total_expenses: number
  balance: number
  by_segment: {
    segment: Segment
    income: number
    expenses: number
  }[]
}
