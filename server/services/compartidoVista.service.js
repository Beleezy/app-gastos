// La vista compartida: qué ve el receptor de los gastos del emisor.
//
// Todo lo de acá lee datos de OTRO usuario, así que cada función empieza por
// el guard de server/utils/compartido.js y proyecta columnas con la
// whitelist SELECT_GASTO_COMPARTIDO. Nada de `select()` sin proyección.

import { and, between, desc, eq, gt, inArray, isNull, ne, or, sql } from 'drizzle-orm'
import { db } from '../utils/db.js'
import {
  compartidoAvisos,
  compartidoConexiones,
  categorias,
  gastos,
  presupuestosCategoria,
  usuarios,
} from '../database/schema.js'
import {
  SELECT_GASTO_COMPARTIDO,
  cargarCategoriasCompartidas,
  cargarConexionLegible,
  construirFiltroVisibilidad,
} from '../utils/compartido.js'
import { getFechaHoraLocalUsuario } from '../utils/fechaLocal.js'
// Alias `~`, como el resto del repo: un import relativo desde server/ lo
// reescribe Nitro respecto al chunk generado y termina apuntando fuera de la
// raíz del proyecto (rompe `nuxt dev`, aunque la build de producción pase).
import { calcularProyeccion, diasDelMesDesdeFecha } from '~/shared/compartido/proyeccion.js'

function rangoMes(mes, anio) {
  const mm = String(mes).padStart(2, '0')
  const ultimo = new Date(anio, mes, 0).getDate()
  return [`${anio}-${mm}-01`, `${anio}-${mm}-${String(ultimo).padStart(2, '0')}`]
}

function mesAnterior(mes, anio) {
  return mes === 1 ? { mes: 12, anio: anio - 1 } : { mes: mes - 1, anio }
}

/** Suma por categoría de los gastos visibles en un rango. */
async function sumarPorCategoria(conexion, categoriaIds, desde, hasta) {
  const filtro = construirFiltroVisibilidad(conexion, categoriaIds)
  const filas = await db
    .select({
      categoriaId: gastos.categoriaId,
      total: sql`COALESCE(SUM(${gastos.monto}), 0)`.mapWith(Number).as('total'),
      cantidad: sql`COUNT(*)`.mapWith(Number).as('cantidad'),
    })
    .from(gastos)
    .where(and(filtro, between(gastos.fecha, desde, hasta)))
    .groupBy(gastos.categoriaId)

  return new Map(filas.map((f) => [f.categoriaId, f]))
}

/**
 * Vista de un mes. Devuelve una fila por categoría con presupuesto,
 * consumo, proyección y comparativa contra el mes anterior; más la lista de
 * gastos si la conexión está en nivel 'detalle'.
 */
export async function vistaCompartida({ conexionId, usuarioId, mes, anio }) {
  const conexion = await cargarConexionLegible(conexionId, usuarioId)

  // Zona horaria del EMISOR, no del observador: si están en husos distintos,
  // "cuántos días van del mes" tiene que medirse donde se gasta el dinero.
  const { fecha: hoyEmisor } = await getFechaHoraLocalUsuario(conexion.emisorId)
  const [anioHoy, mesHoy] = hoyEmisor.split('-').map(Number)
  const mesFinal = mes || mesHoy
  const anioFinal = anio || anioHoy

  const compartidas = await cargarCategoriasCompartidas(conexionId)
  const categoriaIds = compartidas.map((c) => c.categoriaId)
  const infoCategoria = new Map(compartidas.map((c) => [c.categoriaId, c]))

  const [desde, hasta] = rangoMes(mesFinal, anioFinal)
  const prev = mesAnterior(mesFinal, anioFinal)
  const [desdePrev, hastaPrev] = rangoMes(prev.mes, prev.anio)

  const [sumas, sumasPrev, presupuestos, emisorNombre] = await Promise.all([
    sumarPorCategoria(conexion, categoriaIds, desde, hasta),
    sumarPorCategoria(conexion, categoriaIds, desdePrev, hastaPrev),
    categoriaIds.length
      ? db
          .select({
            categoriaId: presupuestosCategoria.categoriaId,
            montoMensual: presupuestosCategoria.montoMensual,
          })
          .from(presupuestosCategoria)
          .where(
            and(
              eq(presupuestosCategoria.usuarioId, conexion.emisorId),
              inArray(presupuestosCategoria.categoriaId, categoriaIds),
            ),
          )
      : [],
    db
      .select({ nombre: usuarios.nombre, email: usuarios.email })
      .from(usuarios)
      .where(eq(usuarios.id, conexion.emisorId))
      .limit(1),
  ])

  const presupuestoPorCat = new Map(
    presupuestos.map((p) => [p.categoriaId, parseFloat(p.montoMensual)]),
  )

  const { diasDelMes, diasTranscurridos } = diasDelMesDesdeFecha(hoyEmisor, mesFinal, anioFinal)

  // Categorías con movimiento visible: las compartidas más las que aparecen
  // solo porque el emisor marcó un gasto suelto de ese rubro.
  const idsConMovimiento = new Set([...sumas.keys(), ...sumasPrev.keys()])
  const todasLasIds = [...new Set([...categoriaIds, ...idsConMovimiento])]
  const nombres = await nombresCategorias(todasLasIds, infoCategoria)

  const filas = todasLasIds.map((catId) => {
    const compartidaCompleta = infoCategoria.has(catId)
    const suma = sumas.get(catId)
    const consumido = suma?.total || 0
    const consumidoPrev = sumasPrev.get(catId)?.total || 0
    const meta = nombres.get(catId) || {}

    const base = {
      categoriaId: catId,
      categoriaNombre: meta.nombre || 'Sin categoría',
      categoriaIcono: meta.icono || null,
      categoriaColor: meta.color || null,
      // 'completa' = el rubro entero está compartido, así que el consumo es
      // el total real del mes. 'solo_marcados' = solo llegan gastos sueltos
      // que el emisor marcó, así que el total NO es el del rubro.
      alcance: compartidaCompleta ? 'completa' : 'solo_marcados',
      consumido: Math.round(consumido * 100) / 100,
      cantidad: suma?.cantidad || 0,
      consumidoMesAnterior: Math.round(consumidoPrev * 100) / 100,
      variacionMesAnterior:
        consumidoPrev > 0
          ? Math.round(((consumido - consumidoPrev) / consumidoPrev) * 10000) / 100
          : null,
    }

    // Presupuesto y proyección SOLO cuando el rubro está compartido entero.
    // Con gastos sueltos, un "20 de 600 = 3%" sería mentira: el receptor no
    // está viendo todo lo que se gastó en ese rubro.
    if (!compartidaCompleta) {
      return { ...base, umbralAviso: null, proyeccion: null, estado: 'parcial' }
    }

    const umbral = infoCategoria.get(catId)?.umbralAviso ?? 75
    const proyeccion = calcularProyeccion({
      consumido,
      presupuesto: presupuestoPorCat.get(catId) || 0,
      diasTranscurridos,
      diasDelMes,
      umbral,
    })

    return { ...base, umbralAviso: umbral, proyeccion, estado: proyeccion.estado }
  })

  filas.sort(
    (a, b) => prioridadEstado(a.estado) - prioridadEstado(b.estado) || b.consumido - a.consumido,
  )

  const detalle =
    conexion.nivelDetalle === 'detalle'
      ? await db
          .select(SELECT_GASTO_COMPARTIDO)
          .from(gastos)
          .where(
            and(
              construirFiltroVisibilidad(conexion, categoriaIds),
              between(gastos.fecha, desde, hasta),
            ),
          )
          .orderBy(desc(gastos.fecha), desc(gastos.createdAt))
          .limit(500)
      : []

  const totalVisible = filas.reduce((acc, f) => acc + f.consumido, 0)

  return {
    conexion: {
      id: conexion.id,
      nivelDetalle: conexion.nivelDetalle,
      incluirMarcados: conexion.incluirMarcados,
      vistoHasta: conexion.vistoHasta,
      emisorNombre: emisorNombre[0]?.nombre?.trim() || emisorNombre[0]?.email || 'Usuario',
    },
    mes: mesFinal,
    anio: anioFinal,
    hoyEmisor,
    diasDelMes,
    diasTranscurridos,
    categorias: filas,
    detalle: detalle.map((g) => ({ ...g, monto: parseFloat(g.monto) })),
    totalVisible: Math.round(totalVisible * 100) / 100,
    // Semáforo agregado de la persona, para la card colapsada.
    estadoGlobal: filas.reduce(
      (peor, f) => (prioridadEstado(f.estado) < prioridadEstado(peor) ? f.estado : peor),
      'ok',
    ),
    actualizadoEn: new Date().toISOString(),
  }
}

function prioridadEstado(estado) {
  return { critico: 0, alerta: 1, ok: 2, sin_presupuesto: 3, parcial: 4 }[estado] ?? 5
}

async function nombresCategorias(ids, infoCategoria) {
  const faltantes = ids.filter((id) => !infoCategoria.has(id))
  const extra = faltantes.length
    ? await db
        .select({
          id: categorias.id,
          nombre: categorias.nombre,
          icono: categorias.icono,
          color: categorias.color,
        })
        .from(categorias)
        .where(inArray(categorias.id, faltantes))
    : []

  const mapa = new Map(extra.map((e) => [e.id, e]))
  for (const [id, c] of infoCategoria) mapa.set(id, c)
  return mapa
}

/** ¿Este gasto concreto es visible en esta conexión? Usado al crear avisos. */
export async function gastoEsVisible(conexion, gastoId) {
  const categoriaIds = (await cargarCategoriasCompartidas(conexion.id)).map((c) => c.categoriaId)
  const [fila] = await db
    .select({ id: gastos.id })
    .from(gastos)
    .where(and(eq(gastos.id, gastoId), construirFiltroVisibilidad(conexion, categoriaIds)))
    .limit(1)
  return !!fila
}

/** Marca la vista como revisada: base de "qué hay de nuevo desde entonces". */
export async function marcarVisto({ conexionId, usuarioId }) {
  const conexion = await cargarConexionLegible(conexionId, usuarioId)
  const ahora = new Date()
  await db
    .update(compartidoConexiones)
    .set({ vistoHasta: ahora, updatedAt: ahora })
    .where(eq(compartidoConexiones.id, conexion.id))
  return { id: conexion.id, vistoHasta: ahora }
}

/**
 * Badge y banner: avisos sin leer, categorías en alerta y gastos nuevos
 * desde la última revisión. Es lo que alimenta la notificación in-app.
 */
export async function novedades({ usuarioId }) {
  const conexiones = await db
    .select()
    .from(compartidoConexiones)
    .where(
      and(
        eq(compartidoConexiones.receptorId, usuarioId),
        eq(compartidoConexiones.estado, 'aceptada'),
        eq(compartidoConexiones.pausada, false),
      ),
    )

  // Invitaciones que me llegaron y aún no acepté. Se buscan por email
  // porque la invitación puede ser anterior a que existiera mi cuenta.
  const [yo] = await db
    .select({ email: usuarios.email })
    .from(usuarios)
    .where(eq(usuarios.id, usuarioId))
    .limit(1)

  const invitaciones = yo?.email
    ? await db
        .select({ total: sql`count(*)`.mapWith(Number).as('total') })
        .from(compartidoConexiones)
        .where(
          and(
            eq(compartidoConexiones.estado, 'pendiente'),
            eq(compartidoConexiones.receptorEmail, yo.email.trim().toLowerCase()),
          ),
        )
    : []
  const invitacionesPendientes = invitaciones[0]?.total || 0

  // N pequeño (una persona comparte con 1–5 personas), así que paralelizar
  // por conexión es más simple y legible que un SQL único con CTEs.
  const porConexion = await Promise.all(
    conexiones.map(async (conexion) => {
      const compartidas = await cargarCategoriasCompartidas(conexion.id)
      const categoriaIds = compartidas.map((c) => c.categoriaId)
      const { fecha: hoyEmisor } = await getFechaHoraLocalUsuario(conexion.emisorId)
      const [anio, mes] = hoyEmisor.split('-').map(Number)
      const [desde, hasta] = rangoMes(mes, anio)

      const [sumas, presupuestos, avisos, nuevos] = await Promise.all([
        sumarPorCategoria(conexion, categoriaIds, desde, hasta),
        categoriaIds.length
          ? db
              .select({
                categoriaId: presupuestosCategoria.categoriaId,
                montoMensual: presupuestosCategoria.montoMensual,
              })
              .from(presupuestosCategoria)
              .where(
                and(
                  eq(presupuestosCategoria.usuarioId, conexion.emisorId),
                  inArray(presupuestosCategoria.categoriaId, categoriaIds),
                ),
              )
          : [],
        db
          .select({ total: sql`count(*)`.mapWith(Number).as('total') })
          .from(compartidoAvisos)
          .where(
            and(
              eq(compartidoAvisos.conexionId, conexion.id),
              isNull(compartidoAvisos.leidoAt),
              or(isNull(compartidoAvisos.autorId), ne(compartidoAvisos.autorId, usuarioId)),
            ),
          ),
        contarGastosNuevos(conexion, categoriaIds),
      ])

      const presupuestoPorCat = new Map(
        presupuestos.map((p) => [p.categoriaId, parseFloat(p.montoMensual)]),
      )
      const { diasDelMes, diasTranscurridos } = diasDelMesDesdeFecha(hoyEmisor, mes, anio)

      const alertas = []
      for (const c of compartidas) {
        const presupuesto = presupuestoPorCat.get(c.categoriaId) || 0
        if (!presupuesto) continue
        const p = calcularProyeccion({
          consumido: sumas.get(c.categoriaId)?.total || 0,
          presupuesto,
          diasTranscurridos,
          diasDelMes,
          umbral: c.umbralAviso,
        })
        if (p.estado === 'ok') continue
        alertas.push({
          conexionId: conexion.id,
          categoriaId: c.categoriaId,
          categoriaNombre: c.nombre,
          estado: p.estado,
          porcentaje: p.porcentaje,
          consumido: p.consumido,
          presupuesto: p.presupuesto,
        })
      }

      return {
        conexionId: conexion.id,
        avisosNoLeidos: avisos[0]?.total || 0,
        gastosNuevos: nuevos,
        alertas,
      }
    }),
  )

  const nombres = await Promise.all(
    conexiones.map((c) =>
      db
        .select({ nombre: usuarios.nombre, email: usuarios.email })
        .from(usuarios)
        .where(eq(usuarios.id, c.emisorId))
        .limit(1),
    ),
  )

  const detalle = porConexion.map((p, i) => ({
    ...p,
    emisorNombre: nombres[i][0]?.nombre?.trim() || nombres[i][0]?.email || 'Usuario',
  }))

  return {
    conexiones: detalle,
    invitacionesPendientes,
    totalAvisos: detalle.reduce((a, c) => a + c.avisosNoLeidos, 0),
    totalAlertas: detalle.reduce((a, c) => a + c.alertas.length, 0),
    totalGastosNuevos: detalle.reduce((a, c) => a + c.gastosNuevos, 0),
    // Lo que va al badge de navegación.
    badge:
      detalle.reduce((a, c) => a + c.avisosNoLeidos + c.alertas.length, 0) + invitacionesPendientes,
  }
}

async function contarGastosNuevos(conexion, categoriaIds) {
  if (!conexion.vistoHasta) return 0
  const [fila] = await db
    .select({ total: sql`count(*)`.mapWith(Number).as('total') })
    .from(gastos)
    .where(
      and(
        construirFiltroVisibilidad(conexion, categoriaIds),
        // gt() y no una plantilla sql cruda: interpolar un Date de JS en
        // `sql` lo manda como parámetro sin tipo y postgres.js revienta al
        // serializarlo. gt() usa el tipo de la columna.
        gt(gastos.createdAt, conexion.vistoHasta),
      ),
    )
  return fila?.total || 0
}
