import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { createError } from 'h3'
import {
  categorias,
  gastosFuturos,
  gastosFuturosDetalles,
  gastosFuturosOpciones,
} from '../database/schema.js'

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function textRequired(value, label) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!normalized) {
    throw createError({ statusCode: 400, message: `${label} es obligatorio` })
  }
  return normalized
}

function textOptional(value) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  return normalized || null
}

function urlOptional(value, label) {
  const normalized = textOptional(value)
  if (!normalized) return null

  try {
    const parsed = new URL(normalized)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('protocol')
    }
    return parsed.toString()
  } catch {
    throw createError({ statusCode: 400, message: `${label} debe ser una URL valida` })
  }
}

function decimalOptional(value, label) {
  if (value === '' || value === null || value === undefined) return null
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0) {
    throw createError({ statusCode: 400, message: `${label} debe ser un numero valido` })
  }
  return round2(number)
}

// Un precio 0 (o vacío) no es un precio de referencia: no debe entrar al
// min-max ni al promedio (antes "S/ 0" arrastraba los totales del proyecto
// y el chip "Mejor precio" premiaba opciones con 0).
function precioValido(value) {
  return value !== null && value !== undefined && value > 0 ? value : null
}

function fallbackAverage({ precioMinimo, precioMaximo, precioPromedio }) {
  const promedio = precioValido(precioPromedio)
  if (promedio !== null) return promedio
  const minimo = precioValido(precioMinimo)
  const maximo = precioValido(precioMaximo)
  if (minimo !== null && maximo !== null) return round2((minimo + maximo) / 2)
  return minimo ?? maximo ?? null
}

function hasOptionContent(option) {
  return Boolean(
    textOptional(option?.nombre) ||
    textOptional(option?.referenciaUrl) ||
    textOptional(option?.imagenUrl) ||
    textOptional(option?.notas) ||
    (option?.precioMinimo !== null && option?.precioMinimo !== undefined) ||
    (option?.precioMaximo !== null && option?.precioMaximo !== undefined) ||
    (option?.precioPromedio !== null && option?.precioPromedio !== undefined),
  )
}

export function normalizeGastoFuturoPayload(body) {
  const categoriaId = textRequired(body?.categoriaId, 'La categoria')
  const tipoGasto = textRequired(body?.tipoGasto, 'El tipo de gasto')
  const descripcion = textOptional(body?.descripcion)
  const prioridadRaw = body?.prioridad
  let prioridad = 0
  if (prioridadRaw !== undefined && prioridadRaw !== null && prioridadRaw !== '') {
    const n = Number(prioridadRaw)
    if (!Number.isInteger(n) || n < 0 || n > 3) {
      throw createError({ statusCode: 400, message: 'La prioridad debe estar entre 0 y 3' })
    }
    prioridad = n
  }
  const detallesBody = Array.isArray(body?.detalles) ? body.detalles : []

  const detalles = detallesBody
    .map((detalle, detalleIndex) => {
      const nombre = textOptional(detalle?.nombre)
      const notas = textOptional(detalle?.notas)
      const opcionesBody = Array.isArray(detalle?.opciones) ? detalle.opciones : []

      const opciones = opcionesBody
        .map((opcion, optionIndex) => {
          const nombreOpcion = textOptional(opcion?.nombre)
          const referenciaUrl = urlOptional(
            opcion?.referenciaUrl,
            `El link de referencia de la opcion ${optionIndex + 1}`,
          )
          const imagenUrl = urlOptional(
            opcion?.imagenUrl,
            `La imagen de la opcion ${optionIndex + 1}`,
          )
          const precioMinimo = decimalOptional(
            opcion?.precioMinimo,
            `El precio minimo de la opcion ${optionIndex + 1}`,
          )
          const precioMaximo = decimalOptional(
            opcion?.precioMaximo,
            `El precio maximo de la opcion ${optionIndex + 1}`,
          )
          let precioPromedio = decimalOptional(
            opcion?.precioPromedio,
            `El precio promedio de la opcion ${optionIndex + 1}`,
          )
          const notasOpcion = textOptional(opcion?.notas)

          const normalized = {
            nombre: nombreOpcion,
            referenciaUrl,
            imagenUrl,
            precioMinimo,
            precioMaximo,
            precioPromedio,
            notas: notasOpcion,
          }

          if (!hasOptionContent(normalized)) return null

          if (!nombreOpcion) {
            throw createError({
              statusCode: 400,
              message: `La opcion ${optionIndex + 1} del detalle ${detalleIndex + 1} debe tener nombre`,
            })
          }

          if (precioMinimo !== null && precioMaximo !== null && precioMinimo > precioMaximo) {
            throw createError({
              statusCode: 400,
              message: `El precio minimo no puede ser mayor que el maximo en ${nombreOpcion}`,
            })
          }

          precioPromedio = fallbackAverage({ precioMinimo, precioMaximo, precioPromedio })

          return {
            nombre: nombreOpcion,
            referenciaUrl,
            imagenUrl,
            precioMinimo,
            precioMaximo,
            precioPromedio,
            notas: notasOpcion,
          }
        })
        .filter(Boolean)

      if (!nombre && !notas && opciones.length === 0) {
        return null
      }

      if (!nombre) {
        throw createError({
          statusCode: 400,
          message: `El detalle ${detalleIndex + 1} debe tener nombre`,
        })
      }

      const prioridadDetalle = detalle?.prioridad
      let prioridadDetalleNorm = 0
      if (prioridadDetalle !== undefined && prioridadDetalle !== null && prioridadDetalle !== '') {
        const pd = Number(prioridadDetalle)
        if (Number.isInteger(pd) && pd >= 0 && pd <= 3) prioridadDetalleNorm = pd
      }

      return {
        id: textOptional(detalle?.id),
        nombre,
        notas,
        prioridad: prioridadDetalleNorm,
        opciones,
      }
    })
    .filter(Boolean)

  if (detalles.length === 0) {
    throw createError({ statusCode: 400, message: 'Agrega al menos un detalle al gasto futuro' })
  }

  return {
    categoriaId,
    tipoGasto,
    descripcion,
    prioridad,
    detalles,
  }
}

export async function validarCategoriaGastoFuturo(executor, categoriaId, usuarioId) {
  const [categoria] = await executor
    .select({
      id: categorias.id,
      usuarioId: categorias.usuarioId,
      esPredefinida: categorias.esPredefinida,
    })
    .from(categorias)
    .where(eq(categorias.id, categoriaId))
    .limit(1)

  if (!categoria) {
    throw createError({ statusCode: 404, message: 'Categoria no encontrada' })
  }

  if (categoria.usuarioId && categoria.usuarioId !== usuarioId) {
    throw createError({ statusCode: 403, message: 'Categoria no disponible para este usuario' })
  }

  return categoria
}

export async function persistGastoFuturoChildren(tx, gastoFuturoId, detalles) {
  for (const [detalleIndex, detalle] of detalles.entries()) {
    const [insertedDetail] = await tx
      .insert(gastosFuturosDetalles)
      .values({
        gastoFuturoId,
        nombre: detalle.nombre,
        notas: detalle.notas,
        prioridad: detalle.prioridad ?? 0,
        orden: detalleIndex,
      })
      .returning({ id: gastosFuturosDetalles.id })

    for (const [optionIndex, opcion] of detalle.opciones.entries()) {
      await tx.insert(gastosFuturosOpciones).values({
        detalleId: insertedDetail.id,
        nombre: opcion.nombre,
        referenciaUrl: opcion.referenciaUrl,
        imagenUrl: opcion.imagenUrl,
        precioMinimo: opcion.precioMinimo !== null ? String(opcion.precioMinimo) : null,
        precioMaximo: opcion.precioMaximo !== null ? String(opcion.precioMaximo) : null,
        precioPromedio: opcion.precioPromedio !== null ? String(opcion.precioPromedio) : null,
        notas: opcion.notas,
        orden: optionIndex,
      })
    }
  }
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function summarizeDetail(opciones) {
  const minCandidates = []
  const maxCandidates = []
  const avgCandidates = []

  for (const opcion of opciones) {
    const minimo =
      precioValido(opcion.precioMinimo) ??
      precioValido(opcion.precioPromedio) ??
      precioValido(opcion.precioMaximo)
    const maximo =
      precioValido(opcion.precioMaximo) ??
      precioValido(opcion.precioPromedio) ??
      precioValido(opcion.precioMinimo)
    const promedio = fallbackAverage(opcion)

    if (minimo !== null) minCandidates.push(minimo)
    if (maximo !== null) maxCandidates.push(maximo)
    if (promedio !== null) avgCandidates.push(promedio)
  }

  return {
    totalOpciones: opciones.length,
    tieneReferencias:
      minCandidates.length > 0 || maxCandidates.length > 0 || avgCandidates.length > 0,
    minimoReferencia: minCandidates.length ? round2(Math.min(...minCandidates)) : null,
    maximoReferencia: maxCandidates.length ? round2(Math.max(...maxCandidates)) : null,
    promedioReferencia: avgCandidates.length
      ? round2(avgCandidates.reduce((sum, value) => sum + value, 0) / avgCandidates.length)
      : null,
  }
}

function summarizeProject(detalles) {
  const summary = {
    totalDetalles: detalles.length,
    totalOpciones: 0,
    detallesConReferencia: 0,
    totalMinimo: 0,
    totalMaximo: 0,
    totalPromedio: 0,
    tieneReferencias: false,
  }

  for (const detalle of detalles) {
    summary.totalOpciones += detalle.opciones.length
    if (!detalle.resumen.tieneReferencias) continue

    summary.detallesConReferencia += 1
    summary.tieneReferencias = true
    summary.totalMinimo += detalle.resumen.minimoReferencia ?? 0
    summary.totalMaximo += detalle.resumen.maximoReferencia ?? 0
    summary.totalPromedio += detalle.resumen.promedioReferencia ?? 0
  }

  summary.totalMinimo = round2(summary.totalMinimo)
  summary.totalMaximo = round2(summary.totalMaximo)
  summary.totalPromedio = round2(summary.totalPromedio)

  return summary
}

export function summarizeFuturePortfolio(proyectos) {
  const summary = {
    totalProyectos: proyectos.length,
    totalDetalles: 0,
    totalOpciones: 0,
    proyectosConReferencia: 0,
    totalMinimo: 0,
    totalMaximo: 0,
    totalPromedio: 0,
    destacados: [],
    // Nuevos campos
    porPrioridad: { alta: 0, media: 0, baja: 0, sinDefinir: 0 },
    progresoDecision: { total: 0, decididos: 0, porcentaje: 0 },
    proyectoMasCaro: null,
    porCategoria: [],
  }

  const categoriaMap = new Map()

  for (const proyecto of proyectos) {
    summary.totalDetalles += proyecto.resumen.totalDetalles
    summary.totalOpciones += proyecto.resumen.totalOpciones

    // Distribución por prioridad
    if (proyecto.prioridad === 3) summary.porPrioridad.alta++
    else if (proyecto.prioridad === 2) summary.porPrioridad.media++
    else if (proyecto.prioridad === 1) summary.porPrioridad.baja++
    else summary.porPrioridad.sinDefinir++

    // Progreso de decisión
    for (const detalle of proyecto.detalles) {
      summary.progresoDecision.total++
      if (detalle.estadoDecision) summary.progresoDecision.decididos++
    }

    // Por categoría
    const catKey = proyecto.categoriaNombre || 'Sin categoria'
    if (!categoriaMap.has(catKey)) {
      categoriaMap.set(catKey, {
        nombre: catKey,
        icono: proyecto.categoriaIcono,
        color: proyecto.categoriaColor,
        cantidad: 0,
        totalPromedio: 0,
      })
    }
    const cat = categoriaMap.get(catKey)
    cat.cantidad++
    cat.totalPromedio += proyecto.resumen.totalPromedio || 0

    if (proyecto.resumen.tieneReferencias) {
      summary.proyectosConReferencia += 1
      summary.totalMinimo += proyecto.resumen.totalMinimo
      summary.totalMaximo += proyecto.resumen.totalMaximo
      summary.totalPromedio += proyecto.resumen.totalPromedio

      // Proyecto más caro
      if (
        !summary.proyectoMasCaro ||
        proyecto.resumen.totalPromedio > summary.proyectoMasCaro.totalPromedio
      ) {
        summary.proyectoMasCaro = {
          tipoGasto: proyecto.tipoGasto,
          totalPromedio: proyecto.resumen.totalPromedio,
          categoriaNombre: proyecto.categoriaNombre,
          categoriaIcono: proyecto.categoriaIcono,
        }
      }
    }
  }

  summary.totalMinimo = round2(summary.totalMinimo)
  summary.totalMaximo = round2(summary.totalMaximo)
  summary.totalPromedio = round2(summary.totalPromedio)
  summary.promedioPorProyecto =
    summary.proyectosConReferencia > 0
      ? round2(summary.totalPromedio / summary.proyectosConReferencia)
      : 0
  summary.progresoDecision.porcentaje =
    summary.progresoDecision.total > 0
      ? Math.round((summary.progresoDecision.decididos / summary.progresoDecision.total) * 100)
      : 0
  summary.porCategoria = Array.from(categoriaMap.values())
    .map((c) => ({ ...c, totalPromedio: round2(c.totalPromedio) }))
    .sort((a, b) => b.totalPromedio - a.totalPromedio)
  summary.destacados = proyectos
    .slice()
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 3)
    .map((proyecto) => ({
      id: proyecto.id,
      tipoGasto: proyecto.tipoGasto,
      categoriaNombre: proyecto.categoriaNombre,
      prioridad: proyecto.prioridad,
      totalMinimo: proyecto.resumen.totalMinimo,
      totalMaximo: proyecto.resumen.totalMaximo,
      totalPromedio: proyecto.resumen.totalPromedio,
      totalDetalles: proyecto.resumen.totalDetalles,
      totalOpciones: proyecto.resumen.totalOpciones,
      tieneReferencias: proyecto.resumen.tieneReferencias,
      detalles: proyecto.detalles.slice(0, 3).map((detalle) => detalle.nombre),
    }))

  return summary
}

export async function fetchFuturePortfolio(executor, usuarioId) {
  const proyectosRows = await executor
    .select({
      id: gastosFuturos.id,
      usuarioId: gastosFuturos.usuarioId,
      categoriaId: gastosFuturos.categoriaId,
      tipoGasto: gastosFuturos.tipoGasto,
      descripcion: gastosFuturos.descripcion,
      prioridad: gastosFuturos.prioridad,
      createdAt: gastosFuturos.createdAt,
      updatedAt: gastosFuturos.updatedAt,
      categoriaNombre: categorias.nombre,
      categoriaIcono: categorias.icono,
      categoriaColor: categorias.color,
    })
    .from(gastosFuturos)
    .leftJoin(categorias, eq(gastosFuturos.categoriaId, categorias.id))
    .where(eq(gastosFuturos.usuarioId, usuarioId))
    .orderBy(
      desc(gastosFuturos.prioridad),
      desc(gastosFuturos.updatedAt),
      asc(gastosFuturos.tipoGasto),
    )

  if (proyectosRows.length === 0) {
    return {
      gastosFuturos: [],
      resumenFuturos: summarizeFuturePortfolio([]),
    }
  }

  const proyectoIds = proyectosRows.map((proyecto) => proyecto.id)
  const detallesRows = await executor
    .select()
    .from(gastosFuturosDetalles)
    .where(inArray(gastosFuturosDetalles.gastoFuturoId, proyectoIds))
    .orderBy(
      desc(gastosFuturosDetalles.prioridad),
      asc(gastosFuturosDetalles.orden),
      asc(gastosFuturosDetalles.createdAt),
    )

  const detalleIds = detallesRows.map((detalle) => detalle.id)
  const opcionesRows =
    detalleIds.length > 0
      ? await executor
          .select()
          .from(gastosFuturosOpciones)
          .where(inArray(gastosFuturosOpciones.detalleId, detalleIds))
          .orderBy(asc(gastosFuturosOpciones.orden), asc(gastosFuturosOpciones.createdAt))
      : []

  const opcionesByDetalle = new Map()
  for (const option of opcionesRows) {
    const normalized = {
      ...option,
      precioMinimo: toNumberOrNull(option.precioMinimo),
      precioMaximo: toNumberOrNull(option.precioMaximo),
      precioPromedio: toNumberOrNull(option.precioPromedio),
    }

    if (!opcionesByDetalle.has(option.detalleId)) {
      opcionesByDetalle.set(option.detalleId, [])
    }
    opcionesByDetalle.get(option.detalleId).push(normalized)
  }

  const detallesByProyecto = new Map()
  for (const detalle of detallesRows) {
    const opciones = opcionesByDetalle.get(detalle.id) || []
    const normalized = {
      ...detalle,
      opciones,
      resumen: summarizeDetail(opciones),
      estadoDecision: detalle.estadoDecision || null,
      decididoEn: detalle.decididoEn || null,
      gastoId: detalle.gastoId || null,
      gastoPlanificadoId: detalle.gastoPlanificadoId || null,
    }

    if (!detallesByProyecto.has(detalle.gastoFuturoId)) {
      detallesByProyecto.set(detalle.gastoFuturoId, [])
    }
    detallesByProyecto.get(detalle.gastoFuturoId).push(normalized)
  }

  const portfolio = proyectosRows.map((proyecto) => {
    const detalles = detallesByProyecto.get(proyecto.id) || []
    return {
      ...proyecto,
      detalles,
      resumen: summarizeProject(detalles),
    }
  })

  return {
    gastosFuturos: portfolio,
    resumenFuturos: summarizeFuturePortfolio(portfolio),
  }
}

export async function fetchFutureExpenseById(executor, usuarioId, id) {
  const proyecto = await executor
    .select({ id: gastosFuturos.id })
    .from(gastosFuturos)
    .where(and(eq(gastosFuturos.id, id), eq(gastosFuturos.usuarioId, usuarioId)))
    .limit(1)

  if (proyecto.length === 0) return null

  const portfolio = await fetchFuturePortfolio(executor, usuarioId)
  return portfolio.gastosFuturos.find((item) => item.id === id) || null
}
