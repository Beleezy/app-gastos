// Perfiles gestionados (familia): mini-usuarios SIN login que un usuario real
// administra. Se modelan como filas en `usuarios` con `gestionado_por_id` = id
// del propietario. Sus datos (gastos, ingresos, planificador, ahorros, deudas)
// cuelgan de su usuario_id y se borran en cascada al eliminar el perfil.

import { randomUUID } from 'node:crypto'
import { eq, and } from 'drizzle-orm'
import { db } from '../utils/db.js'
import { usuarios } from '../database/schema.js'

export async function listarPerfiles(propietarioId) {
  return db
    .select({ id: usuarios.id, nombre: usuarios.nombre })
    .from(usuarios)
    .where(eq(usuarios.gestionadoPorId, propietarioId))
    .orderBy(usuarios.nombre)
}

async function assertPerfilPropio(propietarioId, perfilId) {
  const [p] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(and(eq(usuarios.id, perfilId), eq(usuarios.gestionadoPorId, propietarioId)))
    .limit(1)
  if (!p) {
    const e = new Error('Perfil no encontrado')
    e.statusCode = 404
    throw e
  }
}

export async function crearPerfil(propietarioId, { nombre }) {
  const n = String(nombre || '').trim()
  if (!n) {
    const e = new Error('El nombre es obligatorio')
    e.statusCode = 400
    throw e
  }
  const [p] = await db
    .insert(usuarios)
    .values({ id: randomUUID(), nombre: n, email: null, gestionadoPorId: propietarioId, permitido: false })
    .returning({ id: usuarios.id, nombre: usuarios.nombre })
  return p
}

export async function actualizarPerfil(propietarioId, perfilId, { nombre }) {
  await assertPerfilPropio(propietarioId, perfilId)
  const n = String(nombre || '').trim()
  if (!n) {
    const e = new Error('El nombre es obligatorio')
    e.statusCode = 400
    throw e
  }
  const [p] = await db
    .update(usuarios)
    .set({ nombre: n, updatedAt: new Date() })
    .where(and(eq(usuarios.id, perfilId), eq(usuarios.gestionadoPorId, propietarioId)))
    .returning({ id: usuarios.id, nombre: usuarios.nombre })
  return p
}

export async function eliminarPerfil(propietarioId, perfilId) {
  await assertPerfilPropio(propietarioId, perfilId)
  // Los datos del perfil caen por FK cascade (usuario_id → usuarios.id).
  await db
    .delete(usuarios)
    .where(and(eq(usuarios.id, perfilId), eq(usuarios.gestionadoPorId, propietarioId)))
  return { ok: true }
}
