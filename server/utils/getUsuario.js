import { db } from './db.js'
import { usuarios } from '../database/schema.js'

let cachedUserId = null

export async function getUsuarioId() {
  if (cachedUserId) return cachedUserId
  const [user] = await db.select({ id: usuarios.id }).from(usuarios).limit(1)
  if (user) {
    cachedUserId = user.id
    return user.id
  }
  const [newUser] = await db.insert(usuarios).values({ nombre: 'Usuario' }).returning({ id: usuarios.id })
  cachedUserId = newUser.id
  return newUser.id
}
