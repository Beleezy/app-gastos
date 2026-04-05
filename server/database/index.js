import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'

let _db = null

export function getDb() {
  if (!_db) {
    const config = useRuntimeConfig()
    const client = postgres(config.databaseUrl, {
      max: 10,
      idle_timeout: 20,
      ssl: 'require',
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
