#!/usr/bin/env node
import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { usuarios } from './schema.js'

// Refuse to seed against a production DB. Ver seed-test-data.js para
// la explicación. seed.js (categorías predefinidas) sí puede ejecutarse
// en prod — este script no.
if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED_IN_PRODUCTION !== '1') {
  console.error(
    'seed-temp-users.js: NO se ejecuta con NODE_ENV=production. ' +
      'Si es intencional, establece ALLOW_SEED_IN_PRODUCTION=1.',
  )
  process.exit(2)
}

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL no esta configurada')
  process.exit(1)
}

const client = postgres(connectionString)
const db = drizzle(client)

const tempUsers = [
  {
    id: '00000000-0000-0000-0000-000000000101',
    nombre: 'Usuario Demo 1',
    email: 'demo1@test.local',
  },
  {
    id: '00000000-0000-0000-0000-000000000102',
    nombre: 'Usuario Demo 2',
    email: 'demo2@test.local',
  },
]

try {
  for (const user of tempUsers) {
    await db.insert(usuarios).values(user).onConflictDoNothing()
  }
  console.log(
    '✅ Usuarios temporales listos:',
    tempUsers.map((u) => `${u.nombre} <${u.email}>`).join(', '),
  )
} finally {
  await client.end()
}
