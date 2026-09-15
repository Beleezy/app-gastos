// `useFechaPeru` estaba fijado a America/Lima mientras el servidor mide
// "hoy" en `configuraciones.zonaHoraria` (server/utils/fechaLocal.js). Un
// usuario con otra zona veía el historial de un día y la API le devolvía
// el de otro. Ahora lee la misma configuración que el resto del cliente
// (useState('configuraciones'), cargado por useConfiguraciones) y cae a
// Lima si aún no está o no es válida.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useFechaPeru } from '../composables/useFechaPeru.js'

const estados = new Map()

beforeEach(() => {
  estados.clear()
  globalThis.useState = (key, init) => {
    if (!estados.has(key)) estados.set(key, ref(typeof init === 'function' ? init() : init))
    return estados.get(key)
  }
  // 23:30 UTC del 15 → Lima (UTC-5) 18:30 del 15; Tokio (UTC+9) 08:30 del 16.
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-15T23:30:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useFechaPeru — zona del usuario', () => {
  it('sin configuración cargada mide en America/Lima', () => {
    const { fechaHoy, horaActual } = useFechaPeru()
    expect(fechaHoy()).toBe('2026-09-15')
    expect(horaActual()).toBe('18:30')
  })

  it('con zona configurada mide en esa zona', () => {
    estados.set('configuraciones', ref({ zonaHoraria: 'Asia/Tokyo' }))
    const { fechaHoy, horaActual } = useFechaPeru()
    expect(fechaHoy()).toBe('2026-09-16')
    expect(horaActual()).toBe('08:30')
  })

  it('reacciona cuando la configuración llega después de crear el composable', () => {
    const cfg = ref(null)
    estados.set('configuraciones', cfg)
    const { fechaHoy } = useFechaPeru()
    expect(fechaHoy()).toBe('2026-09-15')
    cfg.value = { zonaHoraria: 'Asia/Tokyo' }
    expect(fechaHoy()).toBe('2026-09-16')
  })

  it('una zona que el runtime no conoce cae a Lima en vez de romper', () => {
    estados.set('configuraciones', ref({ zonaHoraria: 'Marte/Olympus' }))
    expect(useFechaPeru().fechaHoy()).toBe('2026-09-15')
  })

  it('fuera del contexto de Nuxt (sin useState) también cae a Lima', () => {
    delete globalThis.useState
    expect(useFechaPeru().fechaHoy()).toBe('2026-09-15')
  })

  it('partesHoy y fechaAyer derivan del mismo hoy', () => {
    estados.set('configuraciones', ref({ zonaHoraria: 'Asia/Tokyo' }))
    const { partesHoy, fechaAyer } = useFechaPeru()
    expect(partesHoy()).toEqual({ anio: 2026, mes: 9, dia: 16 })
    expect(fechaAyer()).toBe('2026-09-15')
  })

  it('la medianoche no sale como hora 24', () => {
    vi.setSystemTime(new Date('2026-09-16T05:00:00Z')) // 00:00 en Lima
    const { ahora } = useFechaPeru()
    expect(ahora()).toEqual({ fecha: '2026-09-16', hora: '00:00' })
  })
})
