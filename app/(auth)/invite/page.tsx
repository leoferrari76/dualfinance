'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Link2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function InviteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const codeFromUrl = searchParams.get('code')?.toUpperCase() ?? ''

  const [myCode, setMyCode] = useState('')
  const [inputCode, setInputCode] = useState(codeFromUrl)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('couple_id')
        .eq('id', user.id)
        .single()

      if (profile?.couple_id) {
        router.push('/dashboard')
        return
      }

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

  async function handleJoin(e: React.SyntheticEvent) {
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
      setError('Código inválido. Confirme com seu parceiro.')
      setLoading(false)
      return
    }

    if (couple.user_2_id) {
      setError('Este convite já foi usado.')
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
    setCopied('code')
    setTimeout(() => setCopied(null), 2000)
  }

  async function copyLink() {
    const link = `${window.location.origin}/invite?code=${myCode}`
    await navigator.clipboard.writeText(link)
    setCopied('link')
    setTimeout(() => setCopied(null), 2000)
  }

  const arrivedViaLink = !!codeFromUrl

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Conectar casal</h1>
          <p className="text-gray-500 text-sm mt-1">
            {arrivedViaLink
              ? 'Você recebeu um convite. Confirme para conectar.'
              : 'Envie seu link de convite para o parceiro'}
          </p>
        </div>

        {!arrivedViaLink && myCode && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Seu convite
            </p>
            <p className="text-3xl font-bold tracking-widest text-indigo-600 text-center mb-4">
              {myCode}
            </p>
            <div className="flex gap-2">
              <button
                onClick={copyCode}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  copied === 'code'
                    ? 'border-green-200 bg-green-50 text-green-600'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {copied === 'code' ? <Check size={13} /> : null}
                {copied === 'code' ? 'Copiado!' : 'Copiar código'}
              </button>
              <button
                onClick={copyLink}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  copied === 'link'
                    ? 'border-green-200 bg-green-50 text-green-600'
                    : 'border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                }`}
              >
                {copied === 'link' ? <Check size={13} /> : <Link2 size={13} />}
                {copied === 'link' ? 'Copiado!' : 'Copiar link'}
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center mt-3">
              O link já preenche o código automaticamente
            </p>
          </div>
        )}

        <form onSubmit={handleJoin} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
          <p className="text-sm font-medium text-gray-700">
            {arrivedViaLink ? 'Código do convite' : 'Já tem o código do parceiro?'}
          </p>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <input
            type="text"
            value={inputCode}
            onChange={e => setInputCode(e.target.value)}
            placeholder="Ex: A1B2C3D4"
            maxLength={8}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <button
            type="submit"
            disabled={loading || !inputCode}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors"
          >
            {loading ? 'Conectando...' : 'Conectar casal'}
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

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <InviteContent />
    </Suspense>
  )
}
