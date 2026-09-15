#!/usr/bin/env node
/**
 * Genera un archivo OpenAPI 3.0 mínimo a partir de los schemas Zod
 * compartidos. Ver §6.7 de planifica.md.
 *
 * No usamos zod-to-openapi para mantener cero dependencias adicionales:
 * Zod 4 ya sabe emitir JSON Schema y aquí solo se fija el dialecto.
 *
 * Salida: docs/openapi.json
 */

import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

import {
  gastoCreateSchema,
  gastoUpdateSchema,
  gastosBulkCreateSchema,
  gastosBulkIdsSchema,
} from '../shared/schemas/gastos.js'
import {
  deudaCreateSchema,
  deudaUpdateSchema,
  pagoCreateSchema,
  pagoGlobalSchema,
  solicitudVinculoSchema,
} from '../shared/schemas/deudas.js'
import {
  planMensualSchema,
  gastoPlanificadoSchema,
  gastoFuturoCreateSchema,
} from '../shared/schemas/planificador.js'

// Zod 4 trae su propio conversor (`z.toJSONSchema`); el recorrido a mano
// que había aquí usaba clases internas de Zod 3 (`z.ZodEffects`, `_def.shape()`)
// y llevaba roto desde la migración a Zod 4: reventaba en la primera línea.
// `target: 'openapi-3.0'` evita los constructos de JSON Schema 2020 que
// OpenAPI 3.0 no entiende; `io: 'input'` describe lo que ACEPTA el endpoint
// (con `z.coerce` el tipo de entrada y el de salida difieren);
// `unrepresentable: 'any'` deja `{}` donde no hay traducción (refines,
// transforms) en vez de abortar.
function toOpenApi(schema) {
  const out = z.toJSONSchema(schema, {
    target: 'openapi-3.0',
    io: 'input',
    unrepresentable: 'any',
  })
  delete out.$schema
  return out
}

const SCHEMAS = {
  GastoCreate: gastoCreateSchema,
  GastoUpdate: gastoUpdateSchema,
  GastosBulkCreate: gastosBulkCreateSchema,
  GastosBulkIds: gastosBulkIdsSchema,
  DeudaCreate: deudaCreateSchema,
  DeudaUpdate: deudaUpdateSchema,
  PagoCreate: pagoCreateSchema,
  PagoGlobal: pagoGlobalSchema,
  SolicitudVinculo: solicitudVinculoSchema,
  PlanMensual: planMensualSchema,
  GastoPlanificado: gastoPlanificadoSchema,
  GastoFuturoCreate: gastoFuturoCreateSchema,
}

const components = { schemas: {} }
for (const [name, schema] of Object.entries(SCHEMAS)) {
  components.schemas[name] = toOpenApi(schema)
}

const ref = (name) => ({ $ref: `#/components/schemas/${name}` })
const jsonRequest = (schemaName) => ({
  required: true,
  content: { 'application/json': { schema: ref(schemaName) } },
})
const ok200 = { 200: { description: 'OK' } }
const created201 = { 201: { description: 'Recurso creado' } }
const standardErrors = {
  400: { description: 'Validation error' },
  401: { description: 'No autenticado' },
  403: { description: 'Sin permisos' },
  404: { description: 'No encontrado' },
  429: { description: 'Rate limit excedido' },
}

const paths = {
  '/api/health': {
    get: {
      summary: 'Health check (sin auth)',
      responses: { ...ok200, 503: { description: 'DB inalcanzable' } },
    },
  },
  '/api/gastos': {
    post: {
      summary: 'Crear gasto',
      requestBody: jsonRequest('GastoCreate'),
      responses: { ...created201, ...standardErrors },
    },
  },
  '/api/gastos/bulk': {
    post: {
      summary: 'Crear gastos en lote',
      requestBody: jsonRequest('GastosBulkCreate'),
      responses: { ...created201, ...standardErrors },
    },
    put: { summary: 'Actualizar gastos en lote', responses: { ...ok200, ...standardErrors } },
    delete: {
      summary: 'Eliminar gastos en lote',
      requestBody: jsonRequest('GastosBulkIds'),
      responses: { ...ok200, ...standardErrors },
    },
  },
  '/api/gastos/detectar-duplicados': {
    post: {
      summary: 'Detecta posibles duplicados antes de confirmar voz/foto',
      responses: { ...ok200, ...standardErrors },
    },
  },
  '/api/deudas': {
    post: {
      summary: 'Crear deuda',
      requestBody: jsonRequest('DeudaCreate'),
      responses: { ...created201, ...standardErrors },
    },
  },
  '/api/deudas/balance': {
    get: { summary: 'Balance global del usuario', responses: { ...ok200, ...standardErrors } },
  },
  '/api/deudas/{id}/pagos': {
    post: {
      summary: 'Registrar pago contra una deuda',
      requestBody: jsonRequest('PagoCreate'),
      responses: { ...created201, ...standardErrors },
    },
  },
  '/api/deudas/personas/merge-sugerencias': {
    get: {
      summary: 'Sugiere personas con nombres similares para merge',
      responses: { ...ok200, ...standardErrors },
    },
  },
  '/api/deudas/vinculos/solicitar': {
    post: {
      summary: 'Solicitar vínculo con otro usuario',
      requestBody: jsonRequest('SolicitudVinculo'),
      responses: { ...created201, ...standardErrors },
    },
  },
  '/api/voz/parse': {
    post: {
      summary: 'Parse de gastos por voz vía LLM',
      responses: { ...ok200, ...standardErrors },
    },
  },
  '/api/voz/parse-image': {
    post: {
      summary: 'Parse de gastos por imagen (multimodal LLM)',
      responses: { ...ok200, ...standardErrors },
    },
  },
  '/api/usuarios/uso-llm': {
    get: {
      summary: 'Consumo del LLM del mes en curso',
      responses: { ...ok200, ...standardErrors },
    },
  },
  '/api/deudas/personas/merge': {
    post: {
      summary: 'Fusiona personas duplicadas en una sola',
      responses: { ...ok200, ...standardErrors },
    },
  },
  '/api/planificador/plantillas': {
    get: {
      summary: 'Lista plantillas de mes del usuario',
      responses: { ...ok200, ...standardErrors },
    },
    post: {
      summary: 'Crea plantilla manual o desde un plan existente',
      responses: { ...created201, ...standardErrors },
    },
  },
  '/api/planificador/plantillas/{id}': {
    delete: { summary: 'Elimina una plantilla', responses: { ...ok200, ...standardErrors } },
  },
  '/api/planificador/plantillas/{id}/aplicar': {
    post: {
      summary: 'Aplica una plantilla a un plan mensual existente',
      responses: { ...ok200, ...standardErrors },
    },
  },
  '/api/cron/expirar-solicitudes': {
    post: {
      summary: 'Cron: marca solicitudes expiradas (header X-Cron-Secret)',
      responses: { ...ok200, 401: { description: 'Sin X-Cron-Secret válido' } },
    },
  },
}

const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Sistema de Finanzas Personales API',
    version: process.env.APP_VERSION || '1.0.0',
    description:
      'API generada desde los schemas Zod compartidos. Ver shared/schemas/ y planifica.md §6.7.',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Local' }],
  components,
  paths,
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, '..', 'docs')
const outFile = resolve(outDir, 'openapi.json')
await mkdir(outDir, { recursive: true })
await writeFile(outFile, JSON.stringify(openapi, null, 2) + '\n')
console.log(
  `Generado ${outFile} con ${Object.keys(components.schemas).length} schemas y ${Object.keys(paths).length} endpoints.`,
)
