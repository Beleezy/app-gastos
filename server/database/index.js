import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'

let _db = null

export function getDb() {
  if (!_db) {
    const config = useRuntimeConfig()
    const databaseUrl = config.databaseUrl
    const isLocalDatabase = /^postgres(?:ql)?:\/\/(?:[^@/]+@)?(?:localhost|127\.0\.0\.1)(?::\d+)?\//i.test(databaseUrl)
    const client = postgres(config.databaseUrl, {
      max: 1,
      idle_timeout: 20,
      // En CI/E2E local (localhost) Postgres suele correr sin TLS.
      // Para entornos remotos mantenemos SSL obligatorio.
      ssl: isLocalDatabase ? false : 'require',
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
