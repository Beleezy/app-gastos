// Perfiles gestionados (familia): mini-usuarios SIN login que un usuario real
// administra. Se modelan como filas en `usuarios` con `gestionado_por_id` = id
// del propietario. El presupuesto vive en su propia fila de `configuraciones`
// (la usa el planificador); el resto son datos de contacto en `usuarios`.

import { randomUUID } from 'node:crypto'
import { eq, and } from 'drizzle-orm'
import { db } from '../utils/db.js'
import { usuarios, configuraciones } from '../database/schema.js'

function limpiarNombre(nombre) {
  const n = String(nombre || '').trim()
  if (!n) {
    const e = new Error('El nombre es obligatorio')
    e.statusCode = 400
    throw e
  }
  return n
}

// Normaliza los campos de contacto a valores de BD (string vacío → null).
function camposContacto({ telefono, relacion, correoContacto, fechaNacimiento, notas }) {
  const txt = (v) => {
    const s = String(v ?? '').trim()
    return s || null
  }
  return {
    telefono: txt(telefono),
    relacion: txt(relacion),
    correoContacto: txt(correoContacto),
    fechaNacimiento: txt(fechaNacimiento), // 'YYYY-MM-DD' o null
    notas: txt(notas),
  }
}

export async function listarPerfiles(propietarioId) {
  const rows = await db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      telefono: usuarios.telefono,
      relacion: usuarios.relacion,
      correoContacto: usuarios.correoContacto,
      fechaNacimiento: usuarios.fechaNacimiento,
      notas: usuarios.notas,
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
    relacion: r.relacion || '',
    correoContacto: r.correoContacto || '',
    fechaNacimiento: r.fechaNacimiento || '',
    notas: r.notas || '',
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

export async function crearPerfil(propietarioId, datos) {
  const n = limpiarNombre(datos?.nombre)
  const contacto = camposContacto(datos || {})
  const id = randomUUID()
  await db.insert(usuarios).values({
    id,
    nombre: n,
    email: null,
    gestionadoPorId: propietarioId,
    permitido: false,
    ...contacto,
  })
  await db
    .insert(configuraciones)
    .values({
      usuarioId: id,
      nombre: n,
      presupuestoMensualDefault: String(Number(datos?.presupuesto) || 0),
    })
    .onConflictDoNothing()
  return { id, nombre: n, ...contacto, presupuesto: Number(datos?.presupuesto) || 0 }
}

export async function actualizarPerfil(propietarioId, perfilId, datos) {
  await assertPerfilPropio(propietarioId, perfilId)
  const n = limpiarNombre(datos?.nombre)
  const contacto = camposContacto(datos || {})
  await db
    .update(usuarios)
    .set({ nombre: n, ...contacto, updatedAt: new Date() })
    .where(and(eq(usuarios.id, perfilId), eq(usuarios.gestionadoPorId, propietarioId)))

  if (datos?.presupuesto != null && datos.presupuesto !== '') {
    const monto = String(Number(datos.presupuesto) || 0)
    await db
      .insert(configuraciones)
      .values({ usuarioId: perfilId, nombre: n, presupuestoMensualDefault: monto })
      .onConflictDoUpdate({
        target: configuraciones.usuarioId,
        set: { presupuestoMensualDefault: monto, updatedAt: new Date() },
      })
  }
  return { id: perfilId, nombre: n, ...contacto, presupuesto: Number(datos?.presupuesto) || 0 }
}

export async function eliminarPerfil(propietarioId, perfilId) {
  await assertPerfilPropio(propietarioId, perfilId)
  // Los datos del perfil (incl. su configuración) caen por FK cascade.
  await db
    .delete(usuarios)
    .where(and(eq(usuarios.id, perfilId), eq(usuarios.gestionadoPorId, propietarioId)))
  return { ok: true }
}
