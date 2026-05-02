import { db } from '../utils/db.js'
import { usuarios } from './schema.js'

const tempUsers = [
  { id: '00000000-0000-0000-0000-000000000101', nombre: 'Usuario Demo 1', email: 'demo1@test.local' },
  { id: '00000000-0000-0000-0000-000000000102', nombre: 'Usuario Demo 2', email: 'demo2@test.local' },
]

for (const user of tempUsers) {
  await db.insert(usuarios).values(user).onConflictDoNothing()
}

console.log('✅ Usuarios temporales listos:', tempUsers.map(u => `${u.nombre} <${u.email}>`).join(', '))
