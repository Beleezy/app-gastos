import { db } from './db.js'
import { deudas, pagosDeuda, personasEntidades, auditoriaVinculos, usuarios, configuraciones, vinculosCheckpoints } from '../database/schema.js'
import { eq, and, isNotNull, or } from 'drizzle-orm'

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
export async function registrarAuditoria(tx, { personaAId, personaBId, usuarioId, accion, descripcion, datos }) {
  await tx
    .insert(auditoriaVinculos)
    .values({
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
  // 1. Obtener IDs de todas las deudas vinculadas entre estas dos personas
  const deudasA = await tx
    .select({ id: deudas.id, vinculoDeudaId: deudas.vinculoDeudaId })
    .from(deudas)
    .where(and(
      eq(deudas.personaEntidadId, personaAId),
      isNotNull(deudas.vinculoDeudaId)
    ))

  const deudasB = await tx
    .select({ id: deudas.id, vinculoDeudaId: deudas.vinculoDeudaId })
    .from(deudas)
    .where(and(
      eq(deudas.personaEntidadId, personaBId),
      isNotNull(deudas.vinculoDeudaId)
    ))

  // 2. Desvincular pagos de deudas de persona A
  for (const deuda of deudasA) {
    const pagosA = await tx
      .select({ id: pagosDeuda.id })
      .from(pagosDeuda)
      .where(and(
        eq(pagosDeuda.deudaId, deuda.id),
        isNotNull(pagosDeuda.vinculoPagoId)
      ))

    for (const pago of pagosA) {
      // Desvincular pago espejo primero
      await tx.update(pagosDeuda).set({ vinculoPagoId: null }).where(eq(pagosDeuda.vinculoPagoId, pago.id))
      // Desvincular pago original
      await tx.update(pagosDeuda).set({ vinculoPagoId: null }).where(eq(pagosDeuda.id, pago.id))
    }
  }

  // 3. Desvincular pagos de deudas de persona B
  for (const deuda of deudasB) {
    await tx
      .update(pagosDeuda)
      .set({ vinculoPagoId: null })
      .where(eq(pagosDeuda.deudaId, deuda.id))
  }

  // 4. Desvincular deudas de persona A
  for (const deuda of deudasA) {
    if (deuda.vinculoDeudaId) {
      await tx.update(deudas).set({ vinculoDeudaId: null }).where(eq(deudas.id, deuda.vinculoDeudaId))
    }
    await tx.update(deudas).set({ vinculoDeudaId: null }).where(eq(deudas.id, deuda.id))
  }

  // 5. Desvincular deudas de persona B (por si acaso quedan referencias)
  await tx
    .update(deudas)
    .set({ vinculoDeudaId: null })
    .where(eq(deudas.personaEntidadId, personaBId))

  // 6. Desvincular personas
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
 * Normaliza el par de personas para que personaAId sea siempre el UUID menor (orden lexicográfico).
 * Garantiza consistencia al guardar/buscar checkpoints independientemente de qué usuario los crea.
 */
export function normalizarParPersonas(id1, id2) {
  return id1 < id2
    ? { personaAId: id1, personaBId: id2 }
    : { personaAId: id2, personaBId: id1 }
}

/**
 * Toma un snapshot completo del estado de deudas y pagos de un par de personas vinculadas.
 * Incluye IDs originales para auditoría comparativa.
 */
export async function tomarSnapshot(tx, personaAId, personaBId) {
  const [perA] = await tx
    .select({ id: personasEntidades.id, nombre: personasEntidades.nombre, usuarioId: personasEntidades.usuarioId })
    .from(personasEntidades).where(eq(personasEntidades.id, personaAId)).limit(1)

  const [perB] = personaBId
    ? await tx.select({ id: personasEntidades.id, nombre: personasEntidades.nombre, usuarioId: personasEntidades.usuarioId })
        .from(personasEntidades).where(eq(personasEntidades.id, personaBId)).limit(1)
    : [null]

  async function getDeudasConPagos(personaId) {
    const deudasList = await tx.select().from(deudas).where(eq(deudas.personaEntidadId, personaId))
    const result = []
    for (const d of deudasList) {
      const pagosD = await tx.select().from(pagosDeuda).where(eq(pagosDeuda.deudaId, d.id))
      result.push({
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
        pagos: pagosD.map(p => ({
          id: p.id,
          montoPagado: p.montoPagado,
          fechaPago: p.fechaPago,
          metodoPago: p.metodoPago,
          notas: p.notas,
          vinculoPagoId: p.vinculoPagoId,
        })),
      })
    }
    return result
  }

  return {
    personaA: perA ? { id: perA.id, nombre: perA.nombre, usuarioId: perA.usuarioId, deudas: await getDeudasConPagos(personaAId) } : null,
    personaB: perB ? { id: perB.id, nombre: perB.nombre, usuarioId: perB.usuarioId, deudas: await getDeudasConPagos(personaBId) } : null,
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
export async function crearCheckpoint(tx, { personaAId, personaBId, tipo, creadoPorId, descripcion }) {
  const snapshot = await tomarSnapshot(tx, personaAId, personaBId)

  if (tipo === 'actual') {
    // Buscar checkpoint actual existente
    const [actualExistente] = await tx
      .select({ id: vinculosCheckpoints.id })
      .from(vinculosCheckpoints)
      .where(and(
        eq(vinculosCheckpoints.personaAId, personaAId),
        eq(vinculosCheckpoints.tipo, 'actual')
      ))
      .limit(1)

    if (actualExistente) {
      // Contar los 'anterior' existentes y eliminar los más antiguos si ya hay 3
      // (máximo 5 total: 1 inicio + 1 actual + 3 anterior)
      const anteriores = await tx
        .select({ id: vinculosCheckpoints.id, createdAt: vinculosCheckpoints.createdAt })
        .from(vinculosCheckpoints)
        .where(and(
          eq(vinculosCheckpoints.personaAId, personaAId),
          eq(vinculosCheckpoints.tipo, 'anterior')
        ))
        .orderBy(vinculosCheckpoints.createdAt)

      // Si ya hay 3 anteriores, eliminar el más antiguo para hacer hueco
      if (anteriores.length >= 3) {
        await tx
          .delete(vinculosCheckpoints)
          .where(eq(vinculosCheckpoints.id, anteriores[0].id))
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
