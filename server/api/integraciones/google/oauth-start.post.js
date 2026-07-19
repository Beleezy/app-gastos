import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { signState } from '../../../utils/googleOAuthState.js'

const SCOPE = 'https://www.googleapis.com/auth/calendar.app.created'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const config = useRuntimeConfig()

  if (!config.googleOAuthClientId || !config.googleOAuthRedirectUri) {
    throw createError({
      statusCode: 500,
      message: 'Google OAuth no esta configurado en el servidor',
    })
  }

  const state = signState({ usuarioId })

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', config.googleOAuthClientId)
  url.searchParams.set('redirect_uri', config.googleOAuthRedirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', SCOPE)
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('state', state)

  return { authUrl: url.toString() }
})
