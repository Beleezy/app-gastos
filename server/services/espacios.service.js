// Capa de servicios para espacios compartidos (modo familiar).
// Las APIs exponen CRUD básico; la enforcement de permisos (editor vs
// lector) ocurre aquí en cada mutación.

import { eq, and, inArray, sql, isNull } from 'drizzle-orm'
import { db } from '../utils/db.js'
import {
  espaciosCompartidos,
  miembrosEspacio,
  usuarios,
  gastos,
  ingresos,
} from '../database/schema.js'

/**
 * Lista espacios del usuario: los que es dueño + los que es miembro.
 * Incluye stats básicas (total gastos/ingresos del mes en curso).
 */
export async function listarMisEspacios({ usuarioId }) {
  const ids = await db
    .select({ espacioId: miembrosEspacio.espacioId })
    .from(miembrosEspacio)
    .where(eq(miembrosEspacio.usuarioId, usuarioId))

  const espacioIds = ids.map((r) => r.espacioId)
  if (espacioIds.length === 0) return []

  const espacios = await db
    .select()
    .from(espaciosCompartidos)
    .where(and(
      inArray(espaciosCompartidos.id, espacioIds),
      eq(espaciosCompartidos.archivado, false),
    ))

  // Stats por espacio en el mes actual.
  const hoy = new Date()
  const primerDia = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`

  const [gastosAgg, ingresosAgg, miembrosCount] = await Promise.all([
    db
      .select({ espacioId: gastos.espacioId, total: sql`COALESCE(SUM(${gastos.monto}), 0)` })
      .from(gastos)
      .where(and(
        inArray(gastos.espacioId, espacioIds),
        isNull(gastos.deletedAt),
        sql`${gastos.fecha} >= ${primerDia}`,
      ))
      .groupBy(gastos.espacioId),
    db
      .select({ espacioId: ingresos.espacioId, total: sql`COALESCE(SUM(${ingresos.monto}), 0)` })
      .from(ingresos)
      .where(and(
        inArray(ingresos.espacioId, espacioIds),
        isNull(ingresos.deletedAt),
        sql`${ingresos.fecha} >= ${primerDia}`,
      ))
      .groupBy(ingresos.espacioId),
    db
      .select({ espacioId: miembrosEspacio.espacioId, count: sql`COUNT(*)` })
      .from(miembrosEspacio)
      .where(inArray(miembrosEspacio.espacioId, espacioIds))
      .groupBy(miembrosEspacio.espacioId),
  ])

  const idxGastos = new Map(gastosAgg.map((g) => [g.espacioId, parseFloat(g.total)]))
  const idxIngresos = new Map(ingresosAgg.map((i) => [i.espacioId, parseFloat(i.total)]))
  const idxMiembros = new Map(miembrosCount.map((m) => [m.espacioId, Number(m.count)]))

  // Rol del usuario en cada espacio
  const rolPorEspacio = new Map()
  const miembrosPropio = await db
    .select({ espacioId: miembrosEspacio.espacioId, rol: miembrosEspacio.rol })
    .from(miembrosEspacio)
    .where(and(
      eq(miembrosEspacio.usuarioId, usuarioId),
      inArray(miembrosEspacio.espacioId, espacioIds),
    ))
  for (const m of miembrosPropio) rolPorEspacio.set(m.espacioId, m.rol)

  return espacios.map((e) => ({
    ...e,
    rolUsuario: rolPorEspacio.get(e.id) || 'editor',
    totalMiembros: idxMiembros.get(e.id) || 0,
    totalGastosMes: idxGastos.get(e.id) || 0,
    totalIngresosMes: idxIngresos.get(e.id) || 0,
    saldoNetoMes: (idxIngresos.get(e.id) || 0) - (idxGastos.get(e.id) || 0),
  }))
}

/**
 * Crea un espacio. El creador queda como `dueno`.
 */
export async function crearEspacio({ usuarioId, body }) {
  const result = await db.transaction(async (tx) => {
    const [e] = await tx
      .insert(espaciosCompartidos)
      .values({
        duenoId: usuarioId,
        nombre: body.nombre.trim(),
        descripcion: body.descripcion || null,
        icono: body.icono || null,
        color: body.color || null,
      })
      .returning()

    await tx
      .insert(miembrosEspacio)
      .values({
        espacioId: e.id,
        usuarioId,
        rol: 'dueno',
        invitadoPorId: null,
        aceptadoEn: new Date(),
      })

    return e
  })
  return result
}

/**
 * Asegura que el usuario tiene rol >= requerido en el espacio.
 * Devuelve el rol; lanza 403 si no es miembro.
 */
export async function assertRolEspacio({ espacioId, usuarioId, requerido }) {
  const [m] = await db
    .select({ rol: miembrosEspacio.rol })
    .from(miembrosEspacio)
    .where(and(
      eq(miembrosEspacio.espacioId, espacioId),
      eq(miembrosEspacio.usuarioId, usuarioId),
    ))
  if (!m) {
    const err = new Error('No eres miembro de este espacio')
    err.statusCode = 403
    throw err
  }
  const orden = { lector: 0, editor: 1, dueno: 2 }
  if ((orden[m.rol] ?? -1) < (orden[requerido] ?? 99)) {
    const err = new Error('Permiso insuficiente')
    err.statusCode = 403
    throw err
  }
  return m.rol
}

/**
 * Lista los miembros de un espacio (con nombre/email). Requiere ser miembro.
 */
export async function listarMiembros({ espacioId, usuarioId }) {
  await assertRolEspacio({ espacioId, usuarioId, requerido: 'lector' })
  return db
    .select({
      usuarioId: miembrosEspacio.usuarioId,
      rol: miembrosEspacio.rol,
      nombre: usuarios.nombre,
      email: usuarios.email,
      aceptadoEn: miembrosEspacio.aceptadoEn,
    })
    .from(miembrosEspacio)
    .innerJoin(usuarios, eq(miembrosEspacio.usuarioId, usuarios.id))
    .where(eq(miembrosEspacio.espacioId, espacioId))
}

/**
 * Alta directa de un miembro por el dueño (sin invitación). El correo debe
 * pertenecer a un usuario ya registrado en el sistema.
 */
export async function agregarMiembroDirecto({ espacioId, duenoId, email, rol = 'editor' }) {
  await assertRolEspacio({ espacioId, usuarioId: duenoId, requerido: 'dueno' })
  const correo = String(email || '').trim().toLowerCase()
  if (!correo || !correo.includes('@')) {
    const err = new Error('Correo inválido'); err.statusCode = 400; throw err
  }
  const [u] = await db
    .select({ id: usuarios.id, nombre: usuarios.nombre, email: usuarios.email })
    .from(usuarios)
    .where(eq(usuarios.email, correo))
    .limit(1)
  if (!u) {
    const err = new Error('No hay ningún usuario registrado con ese correo'); err.statusCode = 404; throw err
  }
  const [ya] = await db
    .select({ id: miembrosEspacio.id })
    .from(miembrosEspacio)
    .where(and(eq(miembrosEspacio.espacioId, espacioId), eq(miembrosEspacio.usuarioId, u.id)))
    .limit(1)
  if (ya) {
    const err = new Error('El usuario ya es miembro del espacio'); err.statusCode = 409; throw err
  }
  await db
    .insert(miembrosEspacio)
    .values({
      espacioId,
      usuarioId: u.id,
      rol: rol === 'lector' ? 'lector' : 'editor',
      invitadoPorId: duenoId,
      aceptadoEn: new Date(),
    })
    .onConflictDoNothing()
  return { usuarioId: u.id, nombre: u.nombre, email: u.email, rol: rol === 'lector' ? 'lector' : 'editor' }
}

/**
 * Quita un miembro del espacio. Solo el dueño; no puede quitar a otro dueño
 * ni a sí mismo.
 */
export async function quitarMiembro({ espacioId, duenoId, miembroUsuarioId }) {
  await assertRolEspacio({ espacioId, usuarioId: duenoId, requerido: 'dueno' })
  if (miembroUsuarioId === duenoId) {
    const err = new Error('El dueño no puede quitarse a sí mismo'); err.statusCode = 400; throw err
  }
  const [m] = await db
    .select({ rol: miembrosEspacio.rol })
    .from(miembrosEspacio)
    .where(and(eq(miembrosEspacio.espacioId, espacioId), eq(miembrosEspacio.usuarioId, miembroUsuarioId)))
    .limit(1)
  if (m?.rol === 'dueno') {
    const err = new Error('No puedes quitar a un dueño'); err.statusCode = 400; throw err
  }
  await db
    .delete(miembrosEspacio)
    .where(and(eq(miembrosEspacio.espacioId, espacioId), eq(miembrosEspacio.usuarioId, miembroUsuarioId)))
  return { ok: true }
}

/**
 * Usuarios a nombre de los cuales el `usuarioId` puede registrar (miembros de
 * los espacios que él posee, excluyéndose a sí mismo).
 */
export async function registrablesParaUsuario({ usuarioId }) {
  const propios = await db
    .select({ espacioId: miembrosEspacio.espacioId })
    .from(miembrosEspacio)
    .where(and(eq(miembrosEspacio.usuarioId, usuarioId), eq(miembrosEspacio.rol, 'dueno')))
  const ids = propios.map((p) => p.espacioId)
  if (!ids.length) return []
  const rows = await db
    .select({ usuarioId: miembrosEspacio.usuarioId, nombre: usuarios.nombre, email: usuarios.email })
    .from(miembrosEspacio)
    .innerJoin(usuarios, eq(miembrosEspacio.usuarioId, usuarios.id))
    .where(and(inArray(miembrosEspacio.espacioId, ids), sql`${miembrosEspacio.usuarioId} <> ${usuarioId}`))
  const seen = new Map()
  for (const r of rows) if (!seen.has(r.usuarioId)) seen.set(r.usuarioId, r)
  return Array.from(seen.values())
}
