import { db } from './db.js'
import {
  deudas,
  pagosDeuda,
  personasEntidades,
  auditoriaVinculos,
  usuarios,
  configuraciones,
  vinculosCheckpoints,
} from '../database/schema.js'
import { eq, and, isNotNull, isNull, inArray } from 'drizzle-orm'
import { caseUuidPorId } from './sqlBatch.js'

/**
 * Invierte el tipo de deuda: me_deben ↔ yo_debo
 */
export function flipTipoDeuda(tipo) {
  return tipo === 'me_deben' ? 'yo_debo' : 'me_deben'
}

/**
 * Obtiene el nombre de display del usuario:
 * Prioridad: configuraciones.nombre → usuarios.nombre → 'Usuario'
 */
export async function getNombreDisplay(usuarioId) {
  const [config] = await db
    .select({ nombre: configuraciones.nombre })
    .from(configuraciones)
    .where(eq(configuraciones.usuarioId, usuarioId))
    .limit(1)

  if (config?.nombre?.trim()) return config.nombre.trim()

  const [user] = await db
    .select({ nombre: usuarios.nombre })
    .from(usuarios)
    .where(eq(usuarios.id, usuarioId))
    .limit(1)

  return user?.nombre?.trim() || 'Usuario'
}

/**
 * Registra una entrada de auditoría para ambas partes del vínculo.
 * personaAId: la persona del usuario que realizó la acción
 * personaBId: la persona espejo (del otro usuario) - puede ser null
 */
export async function registrarAuditoria(
  tx,
  { personaAId, personaBId, usuarioId, accion, descripcion, datos },
) {
  await tx.insert(auditoriaVinculos).values({
    personaAId,
    personaBId: personaBId || null,
    usuarioId,
    accion,
    descripcion: descripcion || null,
    datos: datos ? JSON.stringify(datos) : null,
  })
}

/**
 * Desvincula dos personas: elimina los vinculos en personas, deudas y pagos.
 * No elimina ningún dato, solo quita las referencias de vínculo.
 * @param {*} tx - transacción drizzle (o db si no hay transacción activa)
 * @param {string} personaAId - ID de la persona del usuario A
 * @param {string} personaBId - ID de la persona espejo (usuario B)
 */
export async function desvincularPersonas(tx, personaAId, personaBId) {
  // Antes esto hacía, por cada deuda vinculada de A, una query de pagos y
  // DOS UPDATE por pago, más dos UPDATE por deuda: await dentro de for,
  // dentro de una transacción que mantenía los locks abiertos todo ese
  // rato. Con 100 deudas y 3 pagos cada una eran ~800 round trips.
  //
  // Todo lo vinculado entre las dos personas se resuelve con conjuntos:
  // 1. Deudas vinculadas de ambas personas (y a qué deuda apuntan).
  const deudasAB = await tx
    .select({ id: deudas.id, vinculoDeudaId: deudas.vinculoDeudaId })
    .from(deudas)
    .where(
      and(
        inArray(deudas.personaEntidadId, [personaAId, personaBId]),
        isNotNull(deudas.vinculoDeudaId),
      ),
    )

  // Las deudas vinculadas de A y B más las que ellas referencian (por si
  // alguna quedó apuntando fuera del par). Y sus pagos vinculados, más
  // los espejos que esos pagos referencian.
  const idsDeudas = [...new Set(deudasAB.flatMap((d) => [d.id, d.vinculoDeudaId]).filter(Boolean))]

  if (idsDeudas.length) {
    const pagosVinculados = await tx
      .select({ id: pagosDeuda.id, vinculoPagoId: pagosDeuda.vinculoPagoId })
      .from(pagosDeuda)
      .where(and(inArray(pagosDeuda.deudaId, idsDeudas), isNotNull(pagosDeuda.vinculoPagoId)))

    const idsPagos = [
      ...new Set(pagosVinculados.flatMap((p) => [p.id, p.vinculoPagoId]).filter(Boolean)),
    ]

    // 2. Desvincular pagos (originales y espejos) en UN UPDATE.
    if (idsPagos.length) {
      await tx
        .update(pagosDeuda)
        .set({ vinculoPagoId: null })
        .where(inArray(pagosDeuda.id, idsPagos))
    }

    // 3. Desvincular deudas (originales y espejos) en UN UPDATE.
    await tx.update(deudas).set({ vinculoDeudaId: null }).where(inArray(deudas.id, idsDeudas))
  }

  // 4. Desvincular personas
  await tx
    .update(personasEntidades)
    .set({ vinculadoUsuarioId: null, vinculoParId: null, updatedAt: new Date() })
    .where(eq(personasEntidades.id, personaAId))

  await tx
    .update(personasEntidades)
    .set({ vinculadoUsuarioId: null, vinculoParId: null, updatedAt: new Date() })
    .where(eq(personasEntidades.id, personaBId))
}

/**
 * Crea una deuda espejo en la cuenta del usuario vinculado.
 * Setea vinculo_deuda_id en ambos lados.
 * @param {*} tx - transacción de drizzle
 * @param {object} deudaOriginal - la deuda fuente
 * @param {string} personaParId - ID de la persona espejo en la cuenta destino
 * @param {string} destinoUsuarioId - ID del usuario destino
 * @returns {object} la deuda espejo creada
 */
export async function crearDeudaEspejo(tx, deudaOriginal, personaParId, destinoUsuarioId) {
  const [deudaEspejo] = await tx
    .insert(deudas)
    .values({
      usuarioId: destinoUsuarioId,
      personaEntidadId: personaParId,
      tipoDeuda: flipTipoDeuda(deudaOriginal.tipoDeuda),
      concepto: deudaOriginal.concepto,
      montoOriginal: deudaOriginal.montoOriginal,
      montoPendiente: deudaOriginal.montoPendiente,
      fechaCreacion: deudaOriginal.fechaCreacion,
      fechaPago: deudaOriginal.fechaPago,
      estado: deudaOriginal.estado,
      notas: deudaOriginal.notas,
      vinculoDeudaId: deudaOriginal.id,
    })
    .returning()

  // Actualizar la deuda original con el vinculo al espejo
  await tx
    .update(deudas)
    .set({ vinculoDeudaId: deudaEspejo.id })
    .where(eq(deudas.id, deudaOriginal.id))

  return deudaEspejo
}

/**
 * Bulk: crea N deudas espejo en una sola transacción usando INSERT batch
 * + UPDATE batch para los vinculoDeudaId originales.
 * Evita el patrón N*2 queries del loop con crearDeudaEspejo.
 *
 * @param {*} tx - transacción drizzle
 * @param {Array} deudasOriginales - deudas del remitente a espejar
 * @param {string} personaParId - persona espejo (destino)
 * @param {string} destinoUsuarioId
 * @returns {Map<string, string>} - mapping deudaOriginalId → deudaEspejoId
 */
export async function crearDeudasEspejoBulk(tx, deudasOriginales, personaParId, destinoUsuarioId) {
  if (!deudasOriginales.length) return new Map()

  const filas = deudasOriginales.map((d) => ({
    usuarioId: destinoUsuarioId,
    personaEntidadId: personaParId,
    tipoDeuda: flipTipoDeuda(d.tipoDeuda),
    concepto: d.concepto,
    montoOriginal: d.montoOriginal,
    montoPendiente: d.montoPendiente,
    fechaCreacion: d.fechaCreacion,
    fechaPago: d.fechaPago,
    estado: d.estado,
    notas: d.notas,
    vinculoDeudaId: d.id,
  }))

  const espejos = await tx
    .insert(deudas)
    .values(filas)
    .returning({ id: deudas.id, vinculoDeudaId: deudas.vinculoDeudaId })

  // Map original → espejo
  const mapping = new Map()
  for (const e of espejos) {
    mapping.set(e.vinculoDeudaId, e.id)
  }

  // Update originales con su vinculoDeudaId apuntando al espejo, en UNA
  // sentencia. El comentario anterior decía "paralelizamos los UPDATEs",
  // pero el código hacía `await` dentro de un `for`: eran N round trips
  // estrictamente secuenciales, y dentro de una transacción que mantenía
  // los locks abiertos todo ese rato. Vincular una persona con 100 deudas
  // eran 100 idas y vueltas.
  //
  // Drizzle no expone UPDATE...FROM (VALUES), así que se arma un CASE por
  // id (utils/sqlBatch.js). Los valores van parametrizados, no concatenados.
  const pares = deudasOriginales
    .map((d) => [d.id, mapping.get(d.id)])
    .filter(([, espejoId]) => espejoId)

  if (pares.length) {
    await tx
      .update(deudas)
      .set({ vinculoDeudaId: caseUuidPorId(deudas.id, pares) })
      .where(
        inArray(
          deudas.id,
          pares.map(([id]) => id),
        ),
      )
  }

  return mapping
}

/**
 * Bulk: crea N pagos espejo en una sola INSERT batch.
 *
 * @param {*} tx - transacción drizzle
 * @param {Array} pagosConDeudaEspejo - array de { pago, deudaEspejoId }
 * @returns {number} - cantidad de pagos creados
 */
export async function crearPagosEspejoBulk(tx, pagosConDeudaEspejo) {
  if (!pagosConDeudaEspejo.length) return 0

  const filas = pagosConDeudaEspejo.map(({ pago, deudaEspejoId }) => ({
    deudaId: deudaEspejoId,
    montoPagado: pago.montoPagado,
    fechaPago: pago.fechaPago,
    metodoPago: pago.metodoPago,
    notas: pago.notas,
    vinculoPagoId: pago.id,
  }))

  const espejos = await tx
    .insert(pagosDeuda)
    .values(filas)
    .returning({ id: pagosDeuda.id, vinculoPagoId: pagosDeuda.vinculoPagoId })

  // Update originales con vinculoPagoId apuntando al espejo, en UNA
  // sentencia (mismo motivo que en crearDeudasEspejoBulk: el bucle con
  // await era N round trips secuenciales dentro de la transacción).
  if (espejos.length) {
    await tx
      .update(pagosDeuda)
      .set({
        vinculoPagoId: caseUuidPorId(
          pagosDeuda.id,
          espejos.map((e) => [e.vinculoPagoId, e.id]),
        ),
      })
      .where(
        inArray(
          pagosDeuda.id,
          espejos.map((e) => e.vinculoPagoId),
        ),
      )
  }

  return espejos.length
}

/**
 * Crea un pago espejo en la deuda vinculada.
 * Setea vinculo_pago_id en ambos lados.
 */
export async function crearPagoEspejo(tx, pagoOriginal, deudaEspejoId) {
  const [pagoEspejo] = await tx
    .insert(pagosDeuda)
    .values({
      deudaId: deudaEspejoId,
      montoPagado: pagoOriginal.montoPagado,
      fechaPago: pagoOriginal.fechaPago,
      metodoPago: pagoOriginal.metodoPago,
      notas: pagoOriginal.notas,
      vinculoPagoId: pagoOriginal.id,
    })
    .returning()

  // Actualizar el pago original con el vinculo al espejo
  await tx
    .update(pagosDeuda)
    .set({ vinculoPagoId: pagoEspejo.id })
    .where(eq(pagosDeuda.id, pagoOriginal.id))

  return pagoEspejo
}

/**
 * Arma la estructura del snapshot a partir de las deudas y de TODOS sus
 * pagos traídos de una vez, en lugar de consultar los pagos deuda a deuda.
 *
 * La proyección de campos es explícita a propósito: el snapshot se
 * serializa a JSON y se guarda en `vinculos_checkpoints`, que la otra
 * parte del vínculo puede leer. Con un spread, cualquier columna que se
 * agregue mañana a `deudas` o `pagos_deuda` acabaría dentro del checkpoint
 * sin que nadie lo decidiera.
 *
 * @param {Array} deudasList
 * @param {Array} pagosList pagos de (al menos) esas deudas
 */
export function agruparPagosPorDeuda(deudasList, pagosList) {
  const porDeuda = new Map()
  for (const d of deudasList || []) porDeuda.set(d.id, [])
  for (const p of pagosList || []) {
    // Un pago de una deuda que no está en la lista se descarta: la query
    // puede traer de más, pero el snapshot no debe inventar deudas.
    porDeuda.get(p.deudaId)?.push({
      id: p.id,
      montoPagado: p.montoPagado,
      fechaPago: p.fechaPago,
      metodoPago: p.metodoPago,
      notas: p.notas,
      vinculoPagoId: p.vinculoPagoId,
    })
  }

  return (deudasList || []).map((d) => ({
    id: d.id,
    concepto: d.concepto,
    tipoDeuda: d.tipoDeuda,
    montoOriginal: d.montoOriginal,
    montoPendiente: d.montoPendiente,
    fechaCreacion: d.fechaCreacion,
    fechaPago: d.fechaPago,
    estado: d.estado,
    notas: d.notas,
    vinculoDeudaId: d.vinculoDeudaId,
    pagos: porDeuda.get(d.id) || [],
  }))
}

/**
 * Reparte las entradas de auditoría entre los checkpoints que las
 * preceden: cada checkpoint recibe lo ocurrido desde su creación hasta la
 * del siguiente (inclusivo por abajo, exclusivo por arriba, como el par
 * gte/lt que antes se consultaba checkpoint a checkpoint).
 *
 * @param {Array<{createdAt: Date|string}>} checkpoints ordenados por createdAt asc
 * @param {Array<{createdAt: Date|string}>} entradas ordenadas por createdAt asc
 * @returns {Array<Array>} un array de entradas por checkpoint, en el mismo orden
 */
export function agruparAuditoriaPorCheckpoint(checkpoints, entradas) {
  const ms = (v) => new Date(v).getTime()
  const grupos = (checkpoints || []).map(() => [])
  if (!grupos.length) return grupos
  const inicios = checkpoints.map((c) => ms(c.createdAt))
  for (const e of entradas || []) {
    const t = ms(e.createdAt)
    // El último checkpoint cuyo inicio es <= t.
    let indice = -1
    for (let i = 0; i < inicios.length; i++) {
      if (inicios[i] <= t) indice = i
      else break
    }
    if (indice >= 0) grupos[indice].push(e)
  }
  return grupos
}

/**
 * Normaliza el par de personas para que personaAId sea siempre el UUID menor (orden lexicográfico).
 * Garantiza consistencia al guardar/buscar checkpoints independientemente de qué usuario los crea.
 */
export function normalizarParPersonas(id1, id2) {
  return id1 < id2 ? { personaAId: id1, personaBId: id2 } : { personaAId: id2, personaBId: id1 }
}

/**
 * Toma un snapshot completo del estado de deudas y pagos de un par de personas vinculadas.
 * Incluye IDs originales para auditoría comparativa.
 */
export async function tomarSnapshot(tx, personaAId, personaBId) {
  const [perA] = await tx
    .select({
      id: personasEntidades.id,
      nombre: personasEntidades.nombre,
      usuarioId: personasEntidades.usuarioId,
    })
    .from(personasEntidades)
    .where(eq(personasEntidades.id, personaAId))
    .limit(1)

  const [perB] = personaBId
    ? await tx
        .select({
          id: personasEntidades.id,
          nombre: personasEntidades.nombre,
          usuarioId: personasEntidades.usuarioId,
        })
        .from(personasEntidades)
        .where(eq(personasEntidades.id, personaBId))
        .limit(1)
    : [null]

  // Las deudas de AMBAS personas y todos sus pagos, en dos queries. Antes
  // esto era, por persona: 1 query de deudas + 1 query de pagos POR DEUDA.
  // Con el volumen del seed (119 deudas) eran ~240 round trips secuenciales
  // dentro de una transacción, que además mantenía los locks abiertos todo
  // ese rato.
  //
  // Solo lo vivo: el snapshot es lo que cada parte VE. Sin `isNull(deletedAt)`
  // una deuda o un pago en la papelera entraba al checkpoint y, al
  // restaurarlo, resucitaba como activo.
  const personaIds = [personaAId, personaBId].filter(Boolean)
  const todasLasDeudas = personaIds.length
    ? await tx
        .select()
        .from(deudas)
        .where(and(inArray(deudas.personaEntidadId, personaIds), isNull(deudas.deletedAt)))
    : []

  const deudaIds = todasLasDeudas.map((d) => d.id)
  const todosLosPagos = deudaIds.length
    ? await tx
        .select()
        .from(pagosDeuda)
        .where(and(inArray(pagosDeuda.deudaId, deudaIds), isNull(pagosDeuda.deletedAt)))
    : []

  const deudasPorPersona = new Map(personaIds.map((id) => [id, []]))
  for (const d of todasLasDeudas) {
    deudasPorPersona.get(d.personaEntidadId)?.push(d)
  }

  const getDeudasConPagos = (personaId) =>
    agruparPagosPorDeuda(deudasPorPersona.get(personaId) || [], todosLosPagos)

  return {
    personaA: perA
      ? {
          id: perA.id,
          nombre: perA.nombre,
          usuarioId: perA.usuarioId,
          deudas: getDeudasConPagos(personaAId),
        }
      : null,
    personaB: perB
      ? {
          id: perB.id,
          nombre: perB.nombre,
          usuarioId: perB.usuarioId,
          deudas: getDeudasConPagos(personaBId),
        }
      : null,
    fechaSnapshot: new Date().toISOString(),
  }
}

/**
 * Crea o rota un checkpoint para un par de personas vinculadas.
 * Regla de 3 máximos:
 *   - 'inicio_vinculo': inmutable, nunca se rota.
 *   - 'actual' → al guardar nuevo: se convierte en 'anterior' (el anterior previo se elimina).
 *   - Nuevo snapshot → se guarda como 'actual'.
 *
 * @param {object} tx - transacción Drizzle
 * @param {object} opts
 * @param {string} opts.personaAId - ID normalizado (menor UUID del par)
 * @param {string} opts.personaBId - ID normalizado (mayor UUID del par)
 * @param {'inicio_vinculo'|'actual'} opts.tipo - tipo de checkpoint
 * @param {string} opts.creadoPorId - usuarioId que crea el checkpoint
 * @param {string} [opts.descripcion] - descripción opcional
 */
export async function crearCheckpoint(
  tx,
  { personaAId, personaBId, tipo, creadoPorId, descripcion },
) {
  const snapshot = await tomarSnapshot(tx, personaAId, personaBId)

  if (tipo === 'actual') {
    // Buscar checkpoint actual existente
    const [actualExistente] = await tx
      .select({ id: vinculosCheckpoints.id })
      .from(vinculosCheckpoints)
      .where(
        and(eq(vinculosCheckpoints.personaAId, personaAId), eq(vinculosCheckpoints.tipo, 'actual')),
      )
      .limit(1)

    if (actualExistente) {
      // Contar los 'anterior' existentes y eliminar los más antiguos si ya hay 3
      // (máximo 5 total: 1 inicio + 1 actual + 3 anterior)
      const anteriores = await tx
        .select({ id: vinculosCheckpoints.id, createdAt: vinculosCheckpoints.createdAt })
        .from(vinculosCheckpoints)
        .where(
          and(
            eq(vinculosCheckpoints.personaAId, personaAId),
            eq(vinculosCheckpoints.tipo, 'anterior'),
          ),
        )
        .orderBy(vinculosCheckpoints.createdAt)

      // Si ya hay 3 anteriores, eliminar el más antiguo para hacer hueco
      if (anteriores.length >= 3) {
        await tx.delete(vinculosCheckpoints).where(eq(vinculosCheckpoints.id, anteriores[0].id))
      }

      // Rotar: actual → anterior
      await tx
        .update(vinculosCheckpoints)
        .set({ tipo: 'anterior' })
        .where(eq(vinculosCheckpoints.id, actualExistente.id))
    }
  }

  const [checkpoint] = await tx
    .insert(vinculosCheckpoints)
    .values({
      personaAId,
      personaBId: personaBId || null,
      tipo,
      creadoPorId: creadoPorId || null,
      descripcion: descripcion || null,
      snapshotDatos: JSON.stringify(snapshot),
    })
    .returning()

  return checkpoint
}

/**
 * Obtiene la persona vinculada (par) y su usuario asociado.
 * Retorna null si la persona no está vinculada.
 */
export async function getPersonaPar(personaEntidadId) {
  const [persona] = await db
    .select()
    .from(personasEntidades)
    .where(eq(personasEntidades.id, personaEntidadId))
    .limit(1)

  if (!persona?.vinculoParId) return null

  const [personaPar] = await db
    .select()
    .from(personasEntidades)
    .where(eq(personasEntidades.id, persona.vinculoParId))
    .limit(1)

  return personaPar || null
}
