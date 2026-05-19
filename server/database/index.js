import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'

let _db = null

export function getDb() {
  if (!_db) {
    const config = useRuntimeConfig()
    const databaseUrl = config.databaseUrl || process.env.DATABASE_URL || ''
    let host = ''
    let sslMode

    try {
      const parsedUrl = new URL(databaseUrl)
      host = parsedUrl.hostname.toLowerCase()
      sslMode = parsedUrl.searchParams.get('sslmode')?.toLowerCase()
    } catch {
      // Evita romper requests con 500 si runtimeConfig aún no expone
      // la URL completa (p.ej. build-time env distinto a runtime).
      host = ''
      sslMode = undefined
    }
    const isLocalAlias = ['localhost', '127.0.0.1', '::1', 'db', 'postgres'].includes(host)
    const isPrivateIPv4 = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host)
    const isLocalDatabase = isLocalAlias || isPrivateIPv4
    const shouldDisableSsl = sslMode === 'disable' || sslMode === 'allow' || sslMode === 'prefer' || isLocalDatabase

    const poolMax = parseInt(process.env.DB_POOL_MAX || '10', 10)
    const client = postgres(databaseUrl, {
      // Pool de 10 por proceso permite servir requests concurrentes sin
      // serializar. Supabase pooler (PgBouncer transactional) multiplexa
      // por debajo, así que este valor es por instancia de la app.
      max: poolMax,
      idle_timeout: 20,
      connect_timeout: 10,
      // En CI/E2E local (localhost) Postgres suele correr sin TLS.
      // Para entornos remotos mantenemos SSL obligatorio.
      ssl: shouldDisableSsl ? false : 'require',
      prepare: false,
    })
    _db = drizzle(client, { schema })
  }
  return _db
}

export const db = new Proxy({}, {
  get(_, prop) {
    const instance = getDb()
    const value = instance[prop]
    return typeof value === 'function' ? value.bind(instance) : value
  }
})
