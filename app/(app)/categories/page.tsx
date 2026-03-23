import { createClient } from '@/lib/supabase/server'
import CategoryManager from '@/components/CategoryManager'
import { SEGMENTS } from '@/types'

export default async function CategoriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: categories } = await supabase
    .from('categories')
    .select('id, segment, custom_name, user_id')
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .order('segment')

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Os segmentos são fixos. Você pode adicionar nomes específicos dentro de cada um —
          por exemplo, "Academia" dentro de Saúde.
        </p>
      </div>

      <CategoryManager
        userId={user.id}
        categories={categories ?? []}
        segments={SEGMENTS}
      />
    </div>
  )
}
