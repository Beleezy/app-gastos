// Lógica de negocio del módulo Compartido: conexiones y avisos.
// La vista de gastos vive en compartidoVista.service.js.

import { and, desc, eq, inArray, isNull, ne, or, sql } from 'drizzle-orm'
import { db } from '../utils/db.js'
import {
  compartidoAvisos,
  compartidoCategorias,
  compartidoConexiones,
  categorias,
  usuarios,
} from '../database/schema.js'
import { cargarConexionDeLaQueEsParte, cargarCategoriasCompartidas } from '../utils/compartido.js'
// Reusado, no duplicado: el nombre a mostrar sale de configuraciones.nombre
// con fallback a usuarios.nombre, igual que en los vínculos de deudas.
import { getNombreDisplay } from '../utils/vinculos.js'

// Estados en los que una conexión sigue "viva". Espeja el índice único
// parcial compartido_conexiones_activa_uq.
const ESTADOS_VIVOS = ['pendiente', 'aceptada']

function error(statusCode, message) {
  return createError({ statusCode, message })
}

/** Proyección pública de una conexión: nunca expone ids de la otra cuenta
 *  más allá de lo necesario para pintar la UI. */
function aDto(conexion, extra = {}) {
  return {
    id: conexion.id,
    estado: conexion.estado,
    nivelDetalle: conexion.nivelDetalle,
    incluirMarcados: conexion.incluirMarcados,
    pausada: conexion.pausada,
    mensaje: conexion.mensaje,
    vistoHasta: conexion.vistoHasta,
    aceptadaEn: conexion.aceptadaEn,
    createdAt: conexion.createdAt,
    updatedAt: conexion.updatedAt,
    ...extra,
  }
}

/**
 * Escribe un evento de sistema en el feed de la conexión. Es lo que evita
 * que el receptor vea desaparecer una categoría sin explicación.
 * autorId queda NULL a propósito (CHECK compartido_avisos_autor_chk).
 */
export async function registrarEventoSistema(tx, conexionId, mensaje) {
  await (tx || db).insert(compartidoAvisos).values({
    conexionId,
    tipo: 'sistema',
    mensaje,
  })
}

/** Conexiones del usuario: las que él comparte y las que le comparten. */
export async function listarConexiones({ usuarioId }) {
  const filas = await db
    .select({
      conexion: compartidoConexiones,
      emisorNombre: usuarios.nombre,
      emisorEmail: usuarios.email,
    })
    .from(compartidoConexiones)
    .leftJoin(usuarios, eq(usuarios.id, compartidoConexiones.emisorId))
    .where(
      and(
        or(
          eq(compartidoConexiones.emisorId, usuarioId),
          eq(compartidoConexiones.receptorId, usuarioId),
        ),
        inArray(compartidoConexiones.estado, ESTADOS_VIVOS),
      ),
    )
    .orderBy(desc(compartidoConexiones.createdAt))

  const ids = filas.map((f) => f.conexion.id)
  const cats = ids.length
    ? await db
        .select({
          conexionId: compartidoCategorias.conexionId,
          categoriaId: compartidoCategorias.categoriaId,
          umbralAviso: compartidoCategorias.umbralAviso,
          nombre: categorias.nombre,
          icono: categorias.icono,
          color: categorias.color,
        })
        .from(compartidoCategorias)
        .innerJoin(categorias, eq(categorias.id, compartidoCategorias.categoriaId))
        .where(inArray(compartidoCategorias.conexionId, ids))
    : []

  const porConexion = new Map()
  for (const c of cats) {
    if (!porConexion.has(c.conexionId)) porConexion.set(c.conexionId, [])
    porConexion.get(c.conexionId).push(c)
  }

  const noLeidos = ids.length ? await contarNoLeidosPorConexion(ids, usuarioId) : new Map()

  const compartoCon = []
  const meComparten = []
  const invitacionesRecibidas = []

  for (const { conexion, emisorNombre, emisorEmail } of filas) {
    const categoriasConexion = porConexion.get(conexion.id) || []
    const base = aDto(conexion, {
      categorias: categoriasConexion,
      avisosNoLeidos: noLeidos.get(conexion.id) || 0,
    })

    if (conexion.emisorId === usuarioId) {
      compartoCon.push({ ...base, receptorEmail: conexion.receptorEmail })
    } else if (conexion.estado === 'pendiente') {
      // Invitación que me llegó y aún no acepté.
      invitacionesRecibidas.push({
        ...base,
        emisorNombre: emisorNombre?.trim() || emisorEmail || 'Usuario',
      })
    } else {
      meComparten.push({
        ...base,
        emisorNombre: emisorNombre?.trim() || emisorEmail || 'Usuario',
      })
    }
  }

  return { compartoCon, meComparten, invitacionesRecibidas }
}

/** Avisos sin leer por conexión, excluyendo los que escribió uno mismo. */
async function contarNoLeidosPorConexion(conexionIds, usuarioId) {
  const filas = await db
    .select({
      conexionId: compartidoAvisos.conexionId,
      total: sql`count(*)`.mapWith(Number).as('total'),
    })
    .from(compartidoAvisos)
    .where(
      and(
        inArray(compartidoAvisos.conexionId, conexionIds),
        isNull(compartidoAvisos.leidoAt),
        // Los propios no cuentan; los de sistema (autor NULL) sí.
        or(isNull(compartidoAvisos.autorId), ne(compartidoAvisos.autorId, usuarioId)),
      ),
    )
    .groupBy(compartidoAvisos.conexionId)

  return new Map(filas.map((f) => [f.conexionId, f.total]))
}

/**
 * Invita a alguien a ver parte de mis gastos. La invitación ES la conexión
 * (estado 'pendiente'); aceptarla solo cambia el estado.
 */
export async function crearInvitacion({ usuarioId, body }) {
  const [yo] = await db
    .select({ email: usuarios.email })
    .from(usuarios)
    .where(eq(usuarios.id, usuarioId))
    .limit(1)

  if (!yo?.email) throw error(400, 'Tu cuenta no tiene email registrado')
  if (yo.email.trim().toLowerCase() === body.email) {
    throw error(400, 'No puedes compartir tus gastos contigo mismo')
  }

  const [destinatario] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.email, body.email))
    .limit(1)

  // Los perfiles gestionados no tienen login: sus gastos ya los ve quien los
  // administra, y no pueden aceptar una invitación.
  if (destinatario?.id) {
    const [perfil] = await db
      .select({ gestionadoPorId: usuarios.gestionadoPorId })
      .from(usuarios)
      .where(eq(usuarios.id, destinatario.id))
      .limit(1)
    if (perfil?.gestionadoPorId) {
      throw error(400, 'Ese email pertenece a un perfil de familia, no a una cuenta')
    }
  }

  const [yaExiste] = await db
    .select({ id: compartidoConexiones.id, estado: compartidoConexiones.estado })
    .from(compartidoConexiones)
    .where(
      and(
        eq(compartidoConexiones.emisorId, usuarioId),
        eq(compartidoConexiones.receptorEmail, body.email),
        inArray(compartidoConexiones.estado, ESTADOS_VIVOS),
      ),
    )
    .limit(1)

  if (yaExiste) {
    throw error(
      409,
      yaExiste.estado === 'aceptada'
        ? 'Ya compartes tus gastos con esta persona'
        : 'Ya hay una invitación pendiente para este email',
    )
  }

  const categoriaIds = body.categorias.map((c) => c.categoriaId)
  if (categoriaIds.length) await validarCategoriasPropias(usuarioId, categoriaIds)

  return db.transaction(async (tx) => {
    const [conexion] = await tx
      .insert(compartidoConexiones)
      .values({
        emisorId: usuarioId,
        receptorEmail: body.email,
        receptorId: destinatario?.id || null,
        nivelDetalle: body.nivelDetalle,
        mensaje: body.mensaje || null,
      })
      .returning()

    if (body.categorias.length) {
      await tx.insert(compartidoCategorias).values(
        body.categorias.map((c) => ({
          conexionId: conexion.id,
          categoriaId: c.categoriaId,
          umbralAviso: c.umbralAviso,
        })),
      )
    }

    return aDto(conexion, {
      receptorEmail: conexion.receptorEmail,
      destinatarioRegistrado: !!destinatario,
    })
  })
}

/**
 * Las categorías compartibles son las del usuario o las globales
 * (usuario_id NULL). Sin esto, alguien podría compartir la categoría
 * personalizada de otra cuenta y descubrir su nombre en la respuesta.
 */
async function validarCategoriasPropias(usuarioId, categoriaIds) {
  const validas = await db
    .select({ id: categorias.id })
    .from(categorias)
    .where(
      and(
        inArray(categorias.id, categoriaIds),
        or(eq(categorias.usuarioId, usuarioId), isNull(categorias.usuarioId)),
      ),
    )

  if (validas.length !== categoriaIds.length) {
    throw error(400, 'Alguna categoría no existe o no es tuya')
  }
}

export async function aceptarInvitacion({ conexionId, usuarioId }) {
  // Un id malformado no puede existir; sin este corte, Postgres revienta la
  // query y el usuario recibe un 500 en vez de un 404 limpio.
  if (!esUuid(conexionId)) throw error(404, 'Invitación no encontrada o ya procesada')

  const [yo] = await db
    .select({ email: usuarios.email })
    .from(usuarios)
    .where(eq(usuarios.id, usuarioId))
    .limit(1)

  if (!yo?.email) throw error(400, 'Tu cuenta no tiene email registrado')

  const [conexion] = await db
    .select()
    .from(compartidoConexiones)
    .where(
      and(eq(compartidoConexiones.id, conexionId), eq(compartidoConexiones.estado, 'pendiente')),
    )
    .limit(1)

  // 404 en todos los casos para no revelar invitaciones ajenas.
  if (!conexion) throw error(404, 'Invitación no encontrada o ya procesada')
  if (conexion.receptorEmail !== yo.email.trim().toLowerCase()) {
    throw error(404, 'Invitación no encontrada o ya procesada')
  }
  if (conexion.emisorId === usuarioId) throw error(400, 'No puedes aceptar tu propia invitación')

  const [actualizada] = await db
    .update(compartidoConexiones)
    .set({
      estado: 'aceptada',
      receptorId: usuarioId,
      aceptadaEn: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(compartidoConexiones.id, conexionId))
    .returning()

  const nombre = await getNombreDisplay(usuarioId)
  await registrarEventoSistema(null, conexionId, `${nombre} aceptó ver estos gastos`)

  return aDto(actualizada, { emisorNombre: await getNombreDisplay(conexion.emisorId) })
}

export async function rechazarInvitacion({ conexionId, usuarioId }) {
  if (!esUuid(conexionId)) throw error(404, 'Invitación no encontrada o ya procesada')

  const [yo] = await db
    .select({ email: usuarios.email })
    .from(usuarios)
    .where(eq(usuarios.id, usuarioId))
    .limit(1)

  const [conexion] = await db
    .select()
    .from(compartidoConexiones)
    .where(
      and(eq(compartidoConexiones.id, conexionId), eq(compartidoConexiones.estado, 'pendiente')),
    )
    .limit(1)

  if (!conexion || conexion.receptorEmail !== yo?.email?.trim()?.toLowerCase()) {
    throw error(404, 'Invitación no encontrada o ya procesada')
  }

  await db
    .update(compartidoConexiones)
    .set({ estado: 'rechazada', updatedAt: new Date() })
    .where(eq(compartidoConexiones.id, conexionId))

  return { id: conexionId, estado: 'rechazada' }
}

/**
 * Cambia qué se comparte. Solo el emisor: el receptor no decide cuánto le
 * muestran. Cada cambio deja un evento de sistema en el feed.
 */
export async function actualizarAlcance({ conexionId, usuarioId, body }) {
  const { conexion, rol } = await cargarConexionDeLaQueEsParte(conexionId, usuarioId)
  if (rol !== 'emisor') {
    throw error(403, 'Solo quien comparte puede cambiar el alcance')
  }
  if (conexion.estado !== 'aceptada' && conexion.estado !== 'pendiente') {
    throw error(409, 'Esta conexión ya no está activa')
  }

  const previas = await cargarCategoriasCompartidas(conexionId)
  const eventos = []

  const set = { updatedAt: new Date() }
  if (body.nivelDetalle !== undefined && body.nivelDetalle !== conexion.nivelDetalle) {
    set.nivelDetalle = body.nivelDetalle
    eventos.push(
      body.nivelDetalle === 'resumen'
        ? 'Cambió a modo resumen: ya no verás los gastos uno por uno'
        : 'Cambió a modo detalle: ahora verás los gastos uno por uno',
    )
  }
  if (body.incluirMarcados !== undefined && body.incluirMarcados !== conexion.incluirMarcados) {
    set.incluirMarcados = body.incluirMarcados
    eventos.push(
      body.incluirMarcados
        ? 'Empezó a compartir los gastos marcados a mano'
        : 'Dejó de compartir los gastos marcados a mano',
    )
  }
  if (body.pausada !== undefined && body.pausada !== conexion.pausada) {
    set.pausada = body.pausada
    eventos.push(body.pausada ? 'Pausó lo que comparte' : 'Reanudó lo que comparte')
  }

  if (body.categorias !== undefined) {
    const categoriaIds = body.categorias.map((c) => c.categoriaId)
    if (categoriaIds.length) await validarCategoriasPropias(usuarioId, categoriaIds)

    const antes = new Set(previas.map((p) => p.categoriaId))
    const despues = new Set(categoriaIds)
    const quitadas = previas.filter((p) => !despues.has(p.categoriaId))
    const agregadas = body.categorias.filter((c) => !antes.has(c.categoriaId))

    if (quitadas.length) {
      eventos.push(`Dejó de compartir: ${quitadas.map((q) => q.nombre).join(', ')}`)
    }
    if (agregadas.length) {
      const nombres = await nombresDeCategorias(agregadas.map((a) => a.categoriaId))
      eventos.push(`Empezó a compartir: ${nombres.join(', ')}`)
    }
  }

  await db.transaction(async (tx) => {
    await tx.update(compartidoConexiones).set(set).where(eq(compartidoConexiones.id, conexionId))

    if (body.categorias !== undefined) {
      // Reemplazo completo del conjunto: idempotente y sin endpoints de
      // add/remove por fila.
      await tx.delete(compartidoCategorias).where(eq(compartidoCategorias.conexionId, conexionId))
      if (body.categorias.length) {
        await tx.insert(compartidoCategorias).values(
          body.categorias.map((c) => ({
            conexionId,
            categoriaId: c.categoriaId,
            umbralAviso: c.umbralAviso,
          })),
        )
      }
    }

    for (const mensaje of eventos) await registrarEventoSistema(tx, conexionId, mensaje)
  })

  const [actualizada] = await db
    .select()
    .from(compartidoConexiones)
    .where(eq(compartidoConexiones.id, conexionId))
    .limit(1)

  return aDto(actualizada, {
    receptorEmail: actualizada.receptorEmail,
    categorias: await cargarCategoriasCompartidas(conexionId),
  })
}

async function nombresDeCategorias(ids) {
  if (!ids.length) return []
  const filas = await db
    .select({ nombre: categorias.nombre })
    .from(categorias)
    .where(inArray(categorias.id, ids))
  return filas.map((f) => f.nombre)
}

/**
 * Revocar: cualquiera de las dos partes corta. NO borra la fila — el
 * historial de avisos sobrevive y el filtro de visibilidad ya niega el
 * acceso por estado. El cron de papelera purga las viejas.
 */
export async function revocarConexion({ conexionId, usuarioId }) {
  const { conexion, rol } = await cargarConexionDeLaQueEsParte(conexionId, usuarioId)
  if (conexion.estado === 'revocada') return { id: conexionId, estado: 'revocada' }

  const nombre = await getNombreDisplay(usuarioId)
  await db.transaction(async (tx) => {
    await tx
      .update(compartidoConexiones)
      .set({
        estado: 'revocada',
        revocadaEn: new Date(),
        revocadaPor: usuarioId,
        updatedAt: new Date(),
      })
      .where(eq(compartidoConexiones.id, conexionId))

    await registrarEventoSistema(
      tx,
      conexionId,
      rol === 'emisor'
        ? `${nombre} dejó de compartir sus gastos`
        : `${nombre} dejó de ver tus gastos`,
    )
  })

  return { id: conexionId, estado: 'revocada' }
}

// ── Avisos ───────────────────────────────────────────────────────────────

export async function listarAvisos({ conexionId, usuarioId, limit = 50 }) {
  await cargarConexionDeLaQueEsParte(conexionId, usuarioId)

  const filas = await db
    .select({
      id: compartidoAvisos.id,
      tipo: compartidoAvisos.tipo,
      mensaje: compartidoAvisos.mensaje,
      categoriaId: compartidoAvisos.categoriaId,
      gastoId: compartidoAvisos.gastoId,
      autorId: compartidoAvisos.autorId,
      leidoAt: compartidoAvisos.leidoAt,
      createdAt: compartidoAvisos.createdAt,
      categoriaNombre: categorias.nombre,
    })
    .from(compartidoAvisos)
    .leftJoin(categorias, eq(categorias.id, compartidoAvisos.categoriaId))
    .where(eq(compartidoAvisos.conexionId, conexionId))
    .orderBy(desc(compartidoAvisos.createdAt))
    .limit(limit)

  return filas.map((f) => ({ ...f, esMio: f.autorId === usuarioId }))
}

export async function crearAviso({ usuarioId, body }) {
  const { conexion } = await cargarConexionDeLaQueEsParte(body.conexionId, usuarioId)
  if (conexion.estado !== 'aceptada') throw error(409, 'Esta conexión no está activa')

  // Un aviso sobre una categoría solo tiene sentido si está compartida; uno
  // sobre un gasto, solo si ese gasto es visible en esta conexión. Sin esto
  // el endpoint sería un oráculo para adivinar ids ajenos.
  if (body.categoriaId) {
    const compartidas = await cargarCategoriasCompartidas(body.conexionId)
    if (!compartidas.some((c) => c.categoriaId === body.categoriaId)) {
      throw error(404, 'Esa categoría no está compartida en esta conexión')
    }
  }
  if (body.gastoId) {
    const visible = await gastoVisibleEnConexion(conexion, body.gastoId)
    if (!visible) throw error(404, 'Ese gasto no está visible en esta conexión')
  }

  const [aviso] = await db
    .insert(compartidoAvisos)
    .values({
      conexionId: body.conexionId,
      autorId: usuarioId,
      tipo: body.tipo,
      categoriaId: body.categoriaId || null,
      gastoId: body.gastoId || null,
      mensaje: body.mensaje,
    })
    .returning()

  return { ...aviso, esMio: true }
}

// Importado tarde para no crear un ciclo entre servicios.
async function gastoVisibleEnConexion(conexion, gastoId) {
  const { gastoEsVisible } = await import('./compartidoVista.service.js')
  return gastoEsVisible(conexion, gastoId)
}

export async function marcarAvisoLeido({ avisoId, usuarioId }) {
  if (!esUuid(avisoId)) throw error(404, 'Aviso no encontrado')

  const [aviso] = await db
    .select({ id: compartidoAvisos.id, conexionId: compartidoAvisos.conexionId })
    .from(compartidoAvisos)
    .where(eq(compartidoAvisos.id, avisoId))
    .limit(1)

  if (!aviso) throw error(404, 'Aviso no encontrado')
  await cargarConexionDeLaQueEsParte(aviso.conexionId, usuarioId)

  await db
    .update(compartidoAvisos)
    .set({ leidoAt: new Date() })
    .where(and(eq(compartidoAvisos.id, avisoId), isNull(compartidoAvisos.leidoAt)))

  return { id: avisoId, leido: true }
}
