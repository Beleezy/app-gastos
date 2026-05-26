// Perfiles gestionados (familia): mini-usuarios SIN login que un usuario real
// administra. Se modelan como filas en `usuarios` con `gestionado_por_id` = id
// del propietario. Su presupuesto vive en su propia fila de `configuraciones`
// (la usa el planificador) y su teléfono (WhatsApp) en `usuarios.telefono`.

import { randomUUID } from 'node:crypto'
import { eq, and } from 'drizzle-orm'
import { db } from '../utils/db.js'
import { usuarios, configuraciones } from '../database/schema.js'

export async function listarPerfiles(propietarioId) {
  const rows = await db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      telefono: usuarios.telefono,
      presupuesto: configuraciones.presupuestoMensualDefault,
    })
    .from(usuarios)
    .leftJoin(configuraciones, eq(configuraciones.usuarioId, usuarios.id))
    .where(eq(usuarios.gestionadoPorId, propietarioId))
    .orderBy(usuarios.nombre)
  return rows.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    telefono: r.telefono || '',
    presupuesto: parseFloat(r.presupuesto || 0),
  }))
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

function limpiarNombre(nombre) {
  const n = String(nombre || '').trim()
  if (!n) {
    const e = new Error('El nombre es obligatorio')
    e.statusCode = 400
    throw e
  }
  return n
}

export async function crearPerfil(propietarioId, { nombre, telefono, presupuesto }) {
  const n = limpiarNombre(nombre)
  const id = randomUUID()
  await db.insert(usuarios).values({
    id,
    nombre: n,
    email: null,
    telefono: String(telefono || '').trim() || null,
    gestionadoPorId: propietarioId,
    permitido: false,
  })
  await db.insert(configuraciones).values({
    usuarioId: id,
    nombre: n,
    presupuestoMensualDefault: String(Number(presupuesto) || 0),
  }).onConflictDoNothing()
  return { id, nombre: n, telefono: String(telefono || '').trim(), presupuesto: Number(presupuesto) || 0 }
}

export async function actualizarPerfil(propietarioId, perfilId, { nombre, telefono, presupuesto }) {
  await assertPerfilPropio(propietarioId, perfilId)
  const n = limpiarNombre(nombre)
  await db
    .update(usuarios)
    .set({ nombre: n, telefono: String(telefono || '').trim() || null, updatedAt: new Date() })
    .where(and(eq(usuarios.id, perfilId), eq(usuarios.gestionadoPorId, propietarioId)))

  if (presupuesto != null && presupuesto !== '') {
    await db
      .insert(configuraciones)
      .values({ usuarioId: perfilId, nombre: n, presupuestoMensualDefault: String(Number(presupuesto) || 0) })
      .onConflictDoUpdate({
        target: configuraciones.usuarioId,
        set: { presupuestoMensualDefault: String(Number(presupuesto) || 0), updatedAt: new Date() },
      })
  }
  return { id: perfilId, nombre: n, telefono: String(telefono || '').trim(), presupuesto: Number(presupuesto) || 0 }
}

export async function eliminarPerfil(propietarioId, perfilId) {
  await assertPerfilPropio(propietarioId, perfilId)
  // Los datos del perfil (incl. su configuración) caen por FK cascade.
  await db
    .delete(usuarios)
    .where(and(eq(usuarios.id, perfilId), eq(usuarios.gestionadoPorId, propietarioId)))
  return { ok: true }
}
