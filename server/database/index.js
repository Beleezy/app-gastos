import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'

let _db = null

export function getDb() {
  if (!_db) {
    const config = useRuntimeConfig()
    const databaseUrl = config.databaseUrl || process.env.DATABASE_URL || ''
    let host
    let port
    let sslMode

    try {
      const parsedUrl = new URL(databaseUrl)
      host = parsedUrl.hostname.toLowerCase()
      port = parsedUrl.port || '5432'
      sslMode = parsedUrl.searchParams.get('sslmode')?.toLowerCase()
    } catch {
      // Evita romper requests con 500 si runtimeConfig aún no expone
      // la URL completa (p.ej. build-time env distinto a runtime).
      host = ''
      port = ''
      sslMode = undefined
    }
    const isLocalAlias = ['localhost', '127.0.0.1', '::1', 'db', 'postgres'].includes(host)
    const isPrivateIPv4 = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host)
    const isLocalDatabase = isLocalAlias || isPrivateIPv4
    const shouldDisableSsl =
      sslMode === 'disable' || sslMode === 'allow' || sslMode === 'prefer' || isLocalDatabase

    // ── Detección de runtime serverless ──
    // Vercel/Netlify Functions arrancan una nueva instancia por petición
    // concurrente. Cada instancia con max=10 puede agotar el pool de
    // Supabase (PgBouncer 29 max en transaction mode del free tier) en
    // segundos. La regla: en serverless, max=1 por instancia es lo
    // recomendado — el pooler ya multiplexa entre todas las instancias.
    const isServerless = !!(
      process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.NETLIFY ||
      process.env.LAMBDA_TASK_ROOT
    )
    const defaultPoolMax = isServerless ? 1 : 10
    const poolMax = parseInt(process.env.DB_POOL_MAX || String(defaultPoolMax), 10)

    // ── Detección de pooler vs conexión directa ──
    // Supabase ofrece:
    //   - Direct: puerto 5432, max ~60 conexiones globales
    //   - Pooler: puerto 6543 (transaction mode) — IDEAL para serverless
    // Si vemos puerto 5432 en producción serverless, warn — esto agota
    // conexiones casi seguro.
    if (isServerless && port === '5432' && !isLocalDatabase) {
      console.warn(
        '[db] DATABASE_URL apunta al puerto 5432 (direct) en serverless. ' +
          'Usa el pooler de Supabase (puerto 6543) para evitar EMAXCONNSESSION. ' +
          'Settings → Database → Connection string → Transaction mode.',
      )
    }

    const client = postgres(databaseUrl, {
      max: poolMax,
      // Liberar conexiones rápido en serverless: la instancia muere
      // pronto y conexiones idle ocupan slot del pooler. 5s en
      // serverless, 20s en server tradicional.
      idle_timeout: isServerless ? 5 : 20,
      // Reciclar conexiones cada 30 min para evitar fugas si el server
      // permanece levantado mucho tiempo (long-running).
      max_lifetime: isServerless ? 60 * 5 : 60 * 30,
      connect_timeout: 10,
      ssl: shouldDisableSsl ? false : 'require',
      // CRÍTICO: PgBouncer en transaction mode no soporta prepared
      // statements del lado del cliente. Mantener en false.
      prepare: false,
    })
    _db = drizzle(client, { schema })
  }
  return _db
}

export const db = new Proxy(
  {},
  {
    get(_, prop) {
      const instance = getDb()
      const value = instance[prop]
      return typeof value === 'function' ? value.bind(instance) : value
    },
  },
)
