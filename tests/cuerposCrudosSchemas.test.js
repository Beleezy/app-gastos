// Schemas de los handlers que todavía leían el cuerpo (o la query) crudo.
//
// El fuzz de esta ronda —cuerpos absurdos a cada handler con `readBody` y
// parámetros absurdos a cada GET— devolvió 28 respuestas 500 con la
// consulta y sus parámetros en el mensaje. Todas tenían la misma causa: un
// valor que no puede ser (un id que no es uuid, una fecha inventada, un mes
// "abc") llegaba a Postgres, que reventaba con el error del driver.
//
// Los ids son uuid en TODA la base. Los schemas los declaraban como
// `z.union([z.string(), z.number()])`, que deja pasar "abc" y 7: la forma
// se comprueba aquí, en un solo sitio, y no en cada handler.

import { describe, it, expect } from 'vitest'
import {
  gastoCreateSchema,
  gastoUpdateSchema,
  gastosBulkCreateSchema,
  gastosBulkUpdateSchema,
  gastosBulkIdsSchema,
} from '../shared/schemas/gastos.js'
import {
  deudaCreateSchema,
  pagoUpdateSchema,
  solicitudVinculoSchema,
  desvincularSchema,
  checkpointCreateSchema,
  checkpointsQuerySchema,
  personasListQuerySchema,
  mergePersonasSchema,
} from '../shared/schemas/deudas.js'
import {
  gastoPlanificadoUpdateSchema,
  duplicarMesSchema,
  registroPlanificadoSchema,
  decisionFuturoSchema,
  presupuestoCategoriaSchema,
  plantillaCreateSchema,
  plantillaAplicarSchema,
} from '../shared/schemas/planificador.js'
import { configuracionUpdateSchema } from '../shared/schemas/configuraciones.js'

const UUID = '3f51518f-b0ef-4c4f-a0f0-b3a7c3caa01c'
const OTRO = '9d2c6b1e-7a8f-4b3c-9e1d-2f3a4b5c6d7e'
const ok = (schema, v) => schema.safeParse(v).success

describe('ids de gastos: uuid o nada', () => {
  const base = { concepto: 'x', monto: 1, fecha: '2026-01-01' }

  it('POST /api/gastos rechaza una categoría que no es uuid', () => {
    expect(ok(gastoCreateSchema, { ...base, categoriaId: 'abc' })).toBe(false)
    expect(ok(gastoCreateSchema, { ...base, categoriaId: 7 })).toBe(false)
    expect(ok(gastoCreateSchema, { ...base, categoriaId: UUID })).toBe(true)
    // null/ausente se siguen admitiendo: la obligatoriedad la decide el servicio.
    expect(ok(gastoCreateSchema, { ...base, categoriaId: null })).toBe(true)
  })

  it('POST /api/gastos rechaza un gastoPlanificadoId que no es uuid', () => {
    expect(ok(gastoCreateSchema, { ...base, categoriaId: UUID, gastoPlanificadoId: 'abc' })).toBe(
      false,
    )
  })

  it('PUT /api/gastos/:id rechaza una categoría que no es uuid', () => {
    expect(ok(gastoUpdateSchema, { categoriaId: 'abc' })).toBe(false)
    expect(ok(gastoUpdateSchema, { categoriaId: UUID })).toBe(true)
  })

  it('el lote exige categoría y la exige uuid', () => {
    const item = (categoriaId) => ({ gastos: [{ concepto: 'x', monto: 1, categoriaId }] })
    expect(ok(gastosBulkCreateSchema, item('abc'))).toBe(false)
    expect(ok(gastosBulkCreateSchema, item(UUID))).toBe(true)
    const r = gastosBulkCreateSchema.safeParse({ gastos: [{ concepto: 'x', monto: 1 }] })
    expect(r.success).toBe(false)
    expect(JSON.stringify(r.error.issues)).toContain('La categoría es obligatoria')
  })

  it('las listas de ids del lote son listas de uuid', () => {
    expect(ok(gastosBulkIdsSchema, { ids: ['abc'] })).toBe(false)
    expect(ok(gastosBulkIdsSchema, { ids: [UUID] })).toBe(true)
    expect(ok(gastosBulkUpdateSchema, { ids: ['abc'], campos: { notas: 'x' } })).toBe(false)
    expect(ok(gastosBulkUpdateSchema, { ids: [UUID], campos: { categoriaId: 'abc' } })).toBe(false)
    expect(ok(gastosBulkUpdateSchema, { ids: [UUID], campos: { categoriaId: UUID } })).toBe(true)
  })
})

describe('deudas y vínculos', () => {
  it('crear deuda rechaza un personaEntidadId que no es uuid', () => {
    const base = { tipoDeuda: 'me_deben', concepto: 'x', monto: 1 }
    expect(ok(deudaCreateSchema, { ...base, personaEntidadId: 'abc' })).toBe(false)
    expect(ok(deudaCreateSchema, { ...base, personaEntidadId: UUID })).toBe(true)
    expect(ok(deudaCreateSchema, { ...base, personaNombre: 'Ana' })).toBe(true)
  })

  it('pagoUpdateSchema acepta lo que manda HistorialPagosPersona', () => {
    // `fechaPago: undefined` desaparece al serializar; metodoPago y notas
    // llegan como null cuando se vacían.
    expect(ok(pagoUpdateSchema, { metodoPago: null, notas: null })).toBe(true)
    expect(ok(pagoUpdateSchema, { fechaPago: '2026-03-01', metodoPago: 'yape', notas: 'x' })).toBe(
      true,
    )
    expect(ok(pagoUpdateSchema, { monto: 12.5 })).toBe(true)
  })

  it('pagoUpdateSchema rechaza fecha inventada, monto no positivo y cuerpo vacío', () => {
    expect(ok(pagoUpdateSchema, { fechaPago: 'el martes' })).toBe(false)
    expect(ok(pagoUpdateSchema, { monto: 'mucho' })).toBe(false)
    expect(ok(pagoUpdateSchema, { monto: 0 })).toBe(false)
    expect(ok(pagoUpdateSchema, {})).toBe(false)
  })

  it('solicitar vínculo exige email real y persona uuid, y normaliza el email', () => {
    expect(ok(solicitudVinculoSchema, { email: 'no-es-email', personaEntidadId: UUID })).toBe(false)
    expect(ok(solicitudVinculoSchema, { email: 'a@b.com', personaEntidadId: 'abc' })).toBe(false)
    const r = solicitudVinculoSchema.parse({ email: '  Ana@Mail.com ', personaEntidadId: UUID })
    expect(r.email).toBe('ana@mail.com')
    expect(r.mensaje).toBeUndefined()
  })

  it('desvincular y checkpoints exigen uuid', () => {
    expect(ok(desvincularSchema, { personaEntidadId: 'abc' })).toBe(false)
    expect(ok(desvincularSchema, { personaEntidadId: UUID })).toBe(true)
    expect(ok(checkpointCreateSchema, { personaId: 'abc' })).toBe(false)
    expect(ok(checkpointCreateSchema, { personaId: UUID, descripcion: '' })).toBe(true)
    expect(ok(checkpointsQuerySchema, { personaId: 'abc' })).toBe(false)
    expect(ok(checkpointsQuerySchema, { personaId: UUID, _t: '1' })).toBe(true)
  })

  it('el listado de personas valida el tipo y tolera el filtro vacío', () => {
    expect(ok(personasListQuerySchema, { tipo: 'basura' })).toBe(false)
    expect(ok(personasListQuerySchema, { tipo: 'me_deben' })).toBe(true)
    expect(personasListQuerySchema.parse({ tipo: '' }).tipo).toBeUndefined()
    expect(ok(personasListQuerySchema, { _t: '123' })).toBe(true)
  })

  it('merge exige uuids y no funde una persona consigo misma', () => {
    expect(ok(mergePersonasSchema, { destinoId: 'abc', origenIds: [UUID] })).toBe(false)
    expect(ok(mergePersonasSchema, { destinoId: UUID, origenIds: ['abc'] })).toBe(false)
    expect(ok(mergePersonasSchema, { destinoId: UUID, origenIds: [] })).toBe(false)
    expect(ok(mergePersonasSchema, { destinoId: UUID, origenIds: [OTRO] })).toBe(true)
  })
})

describe('planificador', () => {
  it('PUT planificado rechaza categoría que no es uuid', () => {
    expect(ok(gastoPlanificadoUpdateSchema, { categoriaId: 'abc' })).toBe(false)
    expect(ok(gastoPlanificadoUpdateSchema, { categoriaId: UUID })).toBe(true)
  })

  it('duplicar mes coerciona y acota mes/año, y rechaza origen = destino', () => {
    const d = duplicarMesSchema.parse({
      mesOrigen: '8',
      anioOrigen: '2026',
      mesDestino: 9,
      anioDestino: 2026,
    })
    expect(d.mesOrigen).toBe(8)
    expect(
      ok(duplicarMesSchema, { mesOrigen: 'a', anioOrigen: 'b', mesDestino: 'c', anioDestino: 'd' }),
    ).toBe(false)
    expect(
      ok(duplicarMesSchema, { mesOrigen: 99, anioOrigen: 2026, mesDestino: 1, anioDestino: 2027 }),
    ).toBe(false)
    expect(
      ok(duplicarMesSchema, { mesOrigen: 9, anioOrigen: 2026, mesDestino: 9, anioDestino: 2026 }),
    ).toBe(false)
  })

  it('registrar un planificado exige fecha real y medio uuid', () => {
    expect(ok(registroPlanificadoSchema, { fechaPago: 'el martes' })).toBe(false)
    expect(ok(registroPlanificadoSchema, { fechaPago: '2026-01-01', medioAhorroId: 'abc' })).toBe(
      false,
    )
    expect(
      ok(registroPlanificadoSchema, { fechaPago: '2026-01-01', notas: '', medioAhorroId: null }),
    ).toBe(true)
    expect(ok(registroPlanificadoSchema, {})).toBe(false)
  })

  it('decidir una opción exige tipo, opción uuid, monto positivo y fecha para planificar', () => {
    const base = { tipo: 'comprar', opcionId: UUID, monto: 10 }
    expect(ok(decisionFuturoSchema, base)).toBe(true)
    expect(ok(decisionFuturoSchema, { ...base, opcionId: 'abc' })).toBe(false)
    expect(ok(decisionFuturoSchema, { ...base, tipo: 'regalar' })).toBe(false)
    expect(ok(decisionFuturoSchema, { ...base, monto: 0 })).toBe(false)
    expect(ok(decisionFuturoSchema, { ...base, fecha: 'el martes' })).toBe(false)
    expect(ok(decisionFuturoSchema, { ...base, tipo: 'planificar' })).toBe(false)
    expect(ok(decisionFuturoSchema, { ...base, tipo: 'planificar', fecha: '2026-10-01' })).toBe(
      true,
    )
    // Lista.vue manda `fecha: ''` cuando el campo está vacío y `notas: null`.
    expect(ok(decisionFuturoSchema, { ...base, fecha: '', notas: null })).toBe(true)
  })

  it('presupuesto por categoría: uuid, monto positivo y umbral 0..100 con default', () => {
    expect(ok(presupuestoCategoriaSchema, { categoriaId: 'abc', montoMensual: 5 })).toBe(false)
    expect(ok(presupuestoCategoriaSchema, { categoriaId: UUID, montoMensual: 0 })).toBe(false)
    expect(
      presupuestoCategoriaSchema.parse({ categoriaId: UUID, montoMensual: 5 }).alertaUmbral,
    ).toBe(80)
    expect(
      ok(presupuestoCategoriaSchema, { categoriaId: UUID, montoMensual: 5, alertaUmbral: 150 }),
    ).toBe(false)
  })

  it('plantillas: los ids son uuid', () => {
    expect(ok(plantillaCreateSchema, { nombre: 'x', desdePlanId: 'abc' })).toBe(false)
    expect(ok(plantillaCreateSchema, { nombre: 'x', desdePlanId: UUID })).toBe(true)
    expect(
      ok(plantillaCreateSchema, {
        nombre: 'x',
        gastos: [{ concepto: 'a', montoEstimado: 5, categoriaId: 'abc' }],
      }),
    ).toBe(false)
    expect(ok(plantillaAplicarSchema, { planMensualId: 'abc' })).toBe(false)
    expect(ok(plantillaAplicarSchema, { planMensualId: UUID })).toBe(true)
  })
})

describe('configuracionUpdateSchema', () => {
  it('acepta el cuerpo completo que manda /configuraciones', () => {
    const r = configuracionUpdateSchema.safeParse({
      nombre: 'Bryan',
      presupuestoMensualDefault: 4500,
      monedaPreferida: 'PEN',
      diaInicioCiclo: 1,
      zonaHoraria: 'America/Lima',
      locale: 'es-PE',
      diasPdfSaldadas: 7,
      vistaRegistroDia: true,
      vistaRegistroSemana: false,
      tamanoLetra: 'normal',
      modoDaltonico: false,
    })
    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true)
  })

  it('rechaza lo que reventaba en Postgres', () => {
    expect(ok(configuracionUpdateSchema, { presupuestoMensualDefault: 'abc' })).toBe(false)
    expect(ok(configuracionUpdateSchema, { monedaPreferida: 'x'.repeat(30) })).toBe(false)
    expect(ok(configuracionUpdateSchema, { diaInicioCiclo: 'x' })).toBe(false)
    expect(ok(configuracionUpdateSchema, { diaInicioCiclo: 0 })).toBe(false)
    expect(ok(configuracionUpdateSchema, { locale: 'x'.repeat(30) })).toBe(false)
    expect(ok(configuracionUpdateSchema, { zonaHoraria: 'Marte/Olympus' })).toBe(false)
    expect(ok(configuracionUpdateSchema, { tamanoLetra: 'enorme' })).toBe(false)
    expect(ok(configuracionUpdateSchema, {})).toBe(false)
  })

  it('un cuerpo parcial no arrastra claves que no vinieron', () => {
    expect(Object.keys(configuracionUpdateSchema.parse({ nombre: 'X' }))).toEqual(['nombre'])
  })
})
