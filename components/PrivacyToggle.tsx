'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'

export default function PrivacyToggle({
  userId,
  initialValue,
}: {
  userId: string
  initialValue: boolean
}) {
  const [shared, setShared] = useState(initialValue)

  async function toggle() {
    const next = !shared
    setShared(next)
    const supabase = createClient()
    await supabase
      .from('profiles')
      .update({ share_with_partner: next })
      .eq('id', userId)
  }

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
        shared
          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
          : 'bg-gray-50 text-gray-500 border-gray-200'
      }`}
    >
      {shared ? <Eye size={13} /> : <EyeOff size={13} />}
      {shared ? 'Dados visíveis ao parceiro' : 'Dados privados'}
    </button>
  )
}
