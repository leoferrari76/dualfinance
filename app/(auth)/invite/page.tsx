'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function InvitePage() {
  const router = useRouter()
  const [inviteCode, setInviteCode] = useState('')
  const [myCode, setMyCode] = useState('')
  const [inputCode, setInputCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check if already in a couple
      const { data: profile } = await supabase
        .from('profiles')
        .select('couple_id')
        .eq('id', user.id)
        .single()

      if (profile?.couple_id) {
        router.push('/dashboard')
        return
      }

      // Get or create couple for this user
      const { data: couple } = await supabase
        .from('couples')
        .select('invite_code')
        .eq('user_1_id', user.id)
        .single()

      if (couple) {
        setMyCode(couple.invite_code)
      } else {
        const { data: newCouple } = await supabase
          .from('couples')
          .insert({ user_1_id: user.id })
          .select('invite_code')
          .single()
        if (newCouple) setMyCode(newCouple.invite_code)
      }
    }
    load()
  }, [router])

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: couple } = await supabase
      .from('couples')
      .select('id, user_2_id')
      .eq('invite_code', inputCode.toUpperCase())
      .single()

    if (!couple) {
      setError('Código inválido.')
      setLoading(false)
      return
    }

    if (couple.user_2_id) {
      setError('Este casal já está completo.')
      setLoading(false)
      return
    }

    await supabase.from('couples').update({ user_2_id: user.id }).eq('id', couple.id)
    await supabase.from('profiles').update({ couple_id: couple.id }).eq('id', user.id)

    router.push('/dashboard')
    router.refresh()
  }

  async function copyCode() {
    await navigator.clipboard.writeText(myCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Conectar casal</h1>
          <p className="text-gray-500 text-sm mt-1">Compartilhe seu código ou insira o do parceiro</p>
        </div>

        {myCode && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
            <p className="text-sm text-gray-500 mb-2">Seu código de convite</p>
            <p className="text-3xl font-bold tracking-widest text-indigo-600">{myCode}</p>
            <button
              onClick={copyCode}
              className="mt-3 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
            >
              {copied ? 'Copiado!' : 'Copiar código'}
            </button>
          </div>
        )}

        <form onSubmit={handleJoin} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
          <p className="text-sm font-medium text-gray-700">Inserir código do parceiro</p>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <input
            type="text"
            value={inputCode}
            onChange={e => setInputCode(e.target.value)}
            placeholder="Ex: A1B2C3D4"
            maxLength={8}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <button
            type="submit"
            disabled={loading || !inputCode}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors"
          >
            {loading ? 'Conectando...' : 'Conectar'}
          </button>
        </form>

        <button
          onClick={() => router.push('/dashboard')}
          className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-2"
        >
          Pular por agora
        </button>
      </div>
    </div>
  )
}
