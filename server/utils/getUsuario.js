import { createClient } from '@supabase/supabase-js'

export async function getUsuarioFromEvent(event) {
  const config = useRuntimeConfig()
  const authHeader = getHeader(event, 'authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'No autenticado' })
  }

  const token = authHeader.slice(7)
  const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey)
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    throw createError({ statusCode: 401, message: 'Token inválido o expirado' })
  }

  return user.id
}
