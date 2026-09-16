// Catálogo de modelos de IA (server/utils/modelosLlm.js): la parte pura.
//
// Qué modelo de la lista de Google se enciende solo, con qué prioridad, y
// qué hace el descubrimiento con lo que ya había en la tabla. No hay BD.

import { describe, it, expect, vi } from 'vitest'

// El módulo también exporta el acceso a datos; aquí solo se prueba la parte
// pura, así que la conexión a Postgres se sustituye por un stub.
vi.mock('../server/utils/db.js', () => ({ db: {} }))

import {
  esCandidatoAutomatico,
  prioridadPorNombre,
  parsearListaGoogle,
  planificarDescubrimiento,
  ordenarModelos,
  esFalloDelModelo,
  normalizarNombreModelo,
} from '../server/utils/modelosLlm.js'

describe('esCandidatoAutomatico', () => {
  it('enciende solo la familia flash de gemini', () => {
    expect(esCandidatoAutomatico('gemini-2.5-flash')).toBe(true)
    expect(esCandidatoAutomatico('gemini-2.5-flash-lite')).toBe(true)
    expect(esCandidatoAutomatico('gemini-3.1-flash-lite-preview')).toBe(true)
    expect(esCandidatoAutomatico('models/gemini-2.0-flash')).toBe(true)
  })

  it('deja apagado lo que no sirve para parsear JSON o es efímero', () => {
    for (const n of [
      'gemini-2.5-pro',
      'gemini-2.5-flash-preview-tts',
      'gemini-2.5-flash-native-audio-preview-09-2025',
      'gemini-live-2.5-flash-preview',
      'gemini-2.5-flash-image-preview',
      'gemini-2.0-flash-exp',
      'gemini-2.5-flash-preview-05-20',
      'gemma-3-27b-it',
      'embedding-001',
      'imagen-4.0-generate-001',
    ]) {
      expect(esCandidatoAutomatico(n), n).toBe(false)
    }
  })
})

describe('prioridadPorNombre', () => {
  it('la versión más nueva va primero y lite antes que la normal', () => {
    const orden = [
      'gemini-2.0-flash',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-3.1-flash-lite-preview',
    ].map((n) => ({ nombre: n, prioridad: prioridadPorNombre(n) }))
    const ordenados = ordenarModelos(orden).map((m) => m.nombre)
    expect(ordenados).toEqual([
      'gemini-3.1-flash-lite-preview',
      'gemini-2.5-flash-lite',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
    ])
  })

  it('lo que no es gemini va al final, dentro del rango del CHECK', () => {
    expect(prioridadPorNombre('gemma-3-27b-it')).toBe(900)
    expect(prioridadPorNombre('gemini-99.9-flash')).toBeGreaterThanOrEqual(0)
  })
})

describe('parsearListaGoogle', () => {
  it('normaliza el prefijo models/ y detecta generateContent', () => {
    const filas = parsearListaGoogle({
      models: [
        {
          name: 'models/gemini-2.5-flash',
          version: '001',
          displayName: 'Gemini 2.5 Flash',
          supportedGenerationMethods: ['generateContent', 'countTokens'],
        },
        { name: 'models/embedding-001', supportedGenerationMethods: ['embedContent'] },
        { name: '' },
      ],
    })
    expect(filas).toEqual([
      {
        nombre: 'gemini-2.5-flash',
        version: '001',
        descripcion: 'Gemini 2.5 Flash',
        soportaGenerate: true,
      },
      { nombre: 'embedding-001', version: null, descripcion: null, soportaGenerate: false },
    ])
  })

  it('una respuesta vacía o rara no revienta', () => {
    expect(parsearListaGoogle(null)).toEqual([])
    expect(parsearListaGoogle({ models: 'x' })).toEqual([])
  })
})

describe('planificarDescubrimiento', () => {
  const ahora = new Date('2026-09-15T12:00:00Z')
  const google = [
    { nombre: 'gemini-2.5-flash', soportaGenerate: true, version: '001', descripcion: 'Flash' },
    {
      nombre: 'gemini-3.0-flash-lite',
      soportaGenerate: true,
      version: '001',
      descripcion: 'Nuevo',
    },
    { nombre: 'gemini-2.5-pro', soportaGenerate: true, version: '001', descripcion: 'Pro' },
    { nombre: 'embedding-001', soportaGenerate: false, version: null, descripcion: null },
  ]

  it('da de alta lo nuevo: encendido si es candidato, apagado si no', () => {
    const plan = planificarDescubrimiento([], google, { ahora })
    const porNombre = Object.fromEntries(plan.nuevos.map((n) => [n.nombre, n]))
    expect(Object.keys(porNombre).sort()).toEqual([
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-3.0-flash-lite',
    ])
    expect(porNombre['gemini-3.0-flash-lite'].activo).toBe(true)
    expect(porNombre['gemini-2.5-pro'].activo).toBe(false)
    expect(porNombre['gemini-3.0-flash-lite'].origen).toBe('descubierto')
    // Los embeddings ni se guardan.
    expect(porNombre['embedding-001']).toBeUndefined()
  })

  it('retira lo que Google dejó de listar, salvo lo que puso el superadmin', () => {
    const actuales = [
      { nombre: 'gemini-1.5-flash', activo: true, origen: 'entorno', desactivadoAuto: false },
      { nombre: 'mi-modelo-privado', activo: true, origen: 'manual', desactivadoAuto: false },
      { nombre: 'gemini-2.5-flash', activo: true, origen: 'descubierto', desactivadoAuto: false },
    ]
    const plan = planificarDescubrimiento(actuales, google, { ahora })
    expect(plan.retirados).toEqual(['gemini-1.5-flash'])
    expect(plan.actualizados.map((a) => a.nombre)).toEqual(['gemini-2.5-flash'])
  })

  it('reactiva lo que apagó el sistema hace más de una semana, no lo reciente', () => {
    const hace8dias = new Date(ahora.getTime() - 8 * 24 * 3600 * 1000)
    const hace1dia = new Date(ahora.getTime() - 1 * 24 * 3600 * 1000)
    const actuales = [
      {
        nombre: 'gemini-2.5-flash',
        activo: false,
        origen: 'descubierto',
        desactivadoAuto: true,
        ultimoFalloAt: hace8dias,
      },
      {
        nombre: 'gemini-2.5-pro',
        activo: false,
        origen: 'descubierto',
        desactivadoAuto: true,
        ultimoFalloAt: hace1dia,
      },
      {
        nombre: 'gemini-3.0-flash-lite',
        activo: false,
        origen: 'descubierto',
        desactivadoAuto: false,
      },
    ]
    const plan = planificarDescubrimiento(actuales, google, { ahora })
    expect(plan.reactivados).toEqual(['gemini-2.5-flash'])
  })
})

describe('esFalloDelModelo', () => {
  it('la cuota y la clave no cuentan contra el modelo', () => {
    expect(esFalloDelModelo('gemini 429')).toBe(false)
    expect(esFalloDelModelo('gemini 403')).toBe(false)
    expect(esFalloDelModelo('')).toBe(false)
  })
  it('un 404, un 500 o una respuesta inválida sí', () => {
    expect(esFalloDelModelo('gemini 404')).toBe(true)
    expect(esFalloDelModelo('gemini 500')).toBe(true)
    expect(esFalloDelModelo('La respuesta del LLM no es JSON válido')).toBe(true)
  })
})

describe('normalizarNombreModelo', () => {
  it('quita models/ y espacios', () => {
    expect(normalizarNombreModelo('  models/gemini-2.5-flash ')).toBe('gemini-2.5-flash')
    expect(normalizarNombreModelo(null)).toBe('')
  })
})
