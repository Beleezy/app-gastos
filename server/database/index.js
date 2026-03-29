import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'

const connectionString = useRuntimeConfig().databaseUrl

const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  ssl: 'require',
})

export const db = drizzle(client, { schema })
