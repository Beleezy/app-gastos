#!/usr/bin/env node
/**
 * Genera un archivo OpenAPI 3.0 mínimo a partir de los schemas Zod
 * compartidos. Ver §6.7 de planifica.md.
 *
 * No usamos zod-to-openapi para mantener cero dependencias adicionales.
 * Cubrimos los tipos que existen hoy en shared/schemas/* (objetos,
 * strings con regex, números, enums, arrays, refines, partials).
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

function unwrap(schema) {
  let s = schema
  while (true) {
    if (s instanceof z.ZodEffects) {
      s = s._def.schema
      continue
    }
    if (s instanceof z.ZodOptional || s instanceof z.ZodNullable) {
      s = s._def.innerType
      continue
    }
    if (s instanceof z.ZodDefault) {
      s = s._def.innerType
      continue
    }
    break
  }
  return s
}

function toOpenApi(schema) {
  const s = unwrap(schema)

  if (s instanceof z.ZodString) {
    const def = s._def
    const out = { type: 'string' }
    if (def.checks) {
      for (const check of def.checks) {
        if (check.kind === 'min') out.minLength = check.value
        if (check.kind === 'max') out.maxLength = check.value
        if (check.kind === 'regex') out.pattern = check.regex.source
        if (check.kind === 'email') out.format = 'email'
        if (check.kind === 'url') out.format = 'uri'
      }
    }
    return out
  }
  if (s instanceof z.ZodNumber) {
    const def = s._def
    const out = { type: 'number' }
    if (def.checks) {
      for (const check of def.checks) {
        if (check.kind === 'min') out.minimum = check.value
        if (check.kind === 'max') out.maximum = check.value
        if (check.kind === 'int') out.type = 'integer'
      }
    }
    return out
  }
  if (s instanceof z.ZodBoolean) return { type: 'boolean' }
  if (s instanceof z.ZodEnum) return { type: 'string', enum: [...s._def.values] }
  if (s instanceof z.ZodNativeEnum) return { type: 'string', enum: Object.values(s._def.values) }
  if (s instanceof z.ZodArray) {
    return { type: 'array', items: toOpenApi(s._def.type) }
  }
  if (s instanceof z.ZodUnion) {
    return { oneOf: s._def.options.map(toOpenApi) }
  }
  if (s instanceof z.ZodObject) {
    const shape = s._def.shape()
    const properties = {}
    const required = []
    for (const [key, value] of Object.entries(shape)) {
      properties[key] = toOpenApi(value)
      const isOptional = value instanceof z.ZodOptional || value instanceof z.ZodNullable || value instanceof z.ZodDefault
      if (!isOptional) required.push(key)
    }
    const out = { type: 'object', properties }
    if (required.length > 0) out.required = required
    return out
  }
  return {}
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
    get: { summary: 'Health check (sin auth)', responses: { ...ok200, 503: { description: 'DB inalcanzable' } } },
  },
  '/api/gastos': {
    post: { summary: 'Crear gasto', requestBody: jsonRequest('GastoCreate'), responses: { ...created201, ...standardErrors } },
  },
  '/api/gastos/bulk': {
    post: { summary: 'Crear gastos en lote', requestBody: jsonRequest('GastosBulkCreate'), responses: { ...created201, ...standardErrors } },
    put: { summary: 'Actualizar gastos en lote', responses: { ...ok200, ...standardErrors } },
    delete: { summary: 'Eliminar gastos en lote', requestBody: jsonRequest('GastosBulkIds'), responses: { ...ok200, ...standardErrors } },
  },
  '/api/gastos/detectar-duplicados': {
    post: { summary: 'Detecta posibles duplicados antes de confirmar voz/foto', responses: { ...ok200, ...standardErrors } },
  },
  '/api/deudas': {
    post: { summary: 'Crear deuda', requestBody: jsonRequest('DeudaCreate'), responses: { ...created201, ...standardErrors } },
  },
  '/api/deudas/balance': {
    get: { summary: 'Balance global del usuario', responses: { ...ok200, ...standardErrors } },
  },
  '/api/deudas/{id}/pagos': {
    post: { summary: 'Registrar pago contra una deuda', requestBody: jsonRequest('PagoCreate'), responses: { ...created201, ...standardErrors } },
  },
  '/api/deudas/personas/merge-sugerencias': {
    get: { summary: 'Sugiere personas con nombres similares para merge', responses: { ...ok200, ...standardErrors } },
  },
  '/api/deudas/vinculos/solicitar': {
    post: { summary: 'Solicitar vínculo con otro usuario', requestBody: jsonRequest('SolicitudVinculo'), responses: { ...created201, ...standardErrors } },
  },
  '/api/voz/parse': {
    post: { summary: 'Parse de gastos por voz vía LLM', responses: { ...ok200, ...standardErrors } },
  },
  '/api/voz/parse-image': {
    post: { summary: 'Parse de gastos por imagen (multimodal LLM)', responses: { ...ok200, ...standardErrors } },
  },
  '/api/usuarios/uso-llm': {
    get: { summary: 'Consumo del LLM del mes en curso', responses: { ...ok200, ...standardErrors } },
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
console.log(`Generado ${outFile} con ${Object.keys(components.schemas).length} schemas y ${Object.keys(paths).length} endpoints.`)
