// Capa de servicios para espacios compartidos (modo familiar).
// Las APIs exponen CRUD básico; la enforcement de permisos (editor vs
// lector) ocurre aquí en cada mutación.

import { eq, and, inArray, sql, isNull } from 'drizzle-orm'
import { db } from '../utils/db.js'
import {
  espaciosCompartidos,
  miembrosEspacio,
  invitacionesEspacio,
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

export async function invitarMiembro({ espacioId, remitenteId, destinatarioEmail, rol = 'editor', mensaje = null }) {
  await assertRolEspacio({ espacioId, usuarioId: remitenteId, requerido: 'dueno' })

  // Verificar si el destinatario ya tiene cuenta (resolver email → id).
  const [destUser] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.email, destinatarioEmail.toLowerCase()))
    .limit(1)

  // Si ya es miembro activo, no duplicar.
  if (destUser) {
    const [yaEs] = await db
      .select({ id: miembrosEspacio.id })
      .from(miembrosEspacio)
      .where(and(
        eq(miembrosEspacio.espacioId, espacioId),
        eq(miembrosEspacio.usuarioId, destUser.id),
      ))
      .limit(1)
    if (yaEs) {
      const err = new Error('El usuario ya es miembro del espacio')
      err.statusCode = 409
      throw err
    }
  }

  const [inv] = await db
    .insert(invitacionesEspacio)
    .values({
      espacioId,
      remitenteId,
      destinatarioEmail: destinatarioEmail.toLowerCase(),
      destinatarioId: destUser?.id || null,
      rol,
      mensaje,
    })
    .returning()
  return inv
}

export async function aceptarInvitacion({ invitacionId, usuarioId }) {
  const result = await db.transaction(async (tx) => {
    const [inv] = await tx
      .select()
      .from(invitacionesEspacio)
      .where(eq(invitacionesEspacio.id, invitacionId))
      .limit(1)

    if (!inv) {
      const err = new Error('Invitación no encontrada')
      err.statusCode = 404
      throw err
    }
    if (inv.estado !== 'pendiente') {
      const err = new Error(`Invitación ya está ${inv.estado}`)
      err.statusCode = 409
      throw err
    }

    // El receptor debe coincidir con la cuenta actual (por email o id).
    const [u] = await tx.select({ id: usuarios.id, email: usuarios.email }).from(usuarios).where(eq(usuarios.id, usuarioId)).limit(1)
    if (!u) {
      const err = new Error('Usuario no encontrado')
      err.statusCode = 404
      throw err
    }
    if (inv.destinatarioId && inv.destinatarioId !== usuarioId) {
      const err = new Error('La invitación no es para esta cuenta')
      err.statusCode = 403
      throw err
    }
    if (!inv.destinatarioId && u.email?.toLowerCase() !== inv.destinatarioEmail) {
      const err = new Error('La invitación no es para esta cuenta')
      err.statusCode = 403
      throw err
    }

    await tx
      .insert(miembrosEspacio)
      .values({
        espacioId: inv.espacioId,
        usuarioId,
        rol: inv.rol,
        invitadoPorId: inv.remitenteId,
        aceptadoEn: new Date(),
      })
      .onConflictDoNothing()

    const [updated] = await tx
      .update(invitacionesEspacio)
      .set({ estado: 'aceptada', destinatarioId: usuarioId, updatedAt: new Date() })
      .where(eq(invitacionesEspacio.id, invitacionId))
      .returning()

    return updated
  })
  return result
}

export async function listarInvitacionesPendientes({ email, usuarioId }) {
  return db
    .select({
      id: invitacionesEspacio.id,
      espacioId: invitacionesEspacio.espacioId,
      espacioNombre: espaciosCompartidos.nombre,
      espacioIcono: espaciosCompartidos.icono,
      rol: invitacionesEspacio.rol,
      mensaje: invitacionesEspacio.mensaje,
      createdAt: invitacionesEspacio.createdAt,
    })
    .from(invitacionesEspacio)
    .innerJoin(espaciosCompartidos, eq(invitacionesEspacio.espacioId, espaciosCompartidos.id))
    .where(and(
      eq(invitacionesEspacio.estado, 'pendiente'),
      sql`(${invitacionesEspacio.destinatarioId} = ${usuarioId} OR LOWER(${invitacionesEspacio.destinatarioEmail}) = LOWER(${email}))`,
    ))
}
