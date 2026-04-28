import { describe, it, expect } from 'vitest'
import { sugerirPlanPagos } from '../composables/usePlanPagos.js'

describe('sugerirPlanPagos', () => {
  it('devuelve hitos vacíos sin monto válido', () => {
    expect(sugerirPlanPagos({ monto: 0 }).hitos).toEqual([])
    expect(sugerirPlanPagos({ monto: -10 }).hitos).toEqual([])
  })

  it('genera N cuotas iguales y suma exacta', () => {
    const r = sugerirPlanPagos({
      monto: 100,
      fechaInicio: '2026-01-01',
      cuotas: 3,
      frecuencia: 'mensual',
    })
    expect(r.hitos).toHaveLength(3)
    const suma = r.hitos.reduce((a, h) => a + h.monto, 0)
    expect(Math.round(suma * 100) / 100).toBe(100)
  })

  it('último hito ajusta el redondeo (1/3 de 100)', () => {
    const r = sugerirPlanPagos({
      monto: 100,
      fechaInicio: '2026-01-01',
      cuotas: 3,
    })
    expect(r.hitos[0].monto).toBeCloseTo(33.33, 2)
    expect(r.hitos[2].monto).toBeCloseTo(33.34, 2)
  })

  it('sin cuotas pero con vencimiento, calcula N por frecuencia', () => {
    const r = sugerirPlanPagos({
      monto: 300,
      fechaInicio: '2026-01-01',
      fechaVencimiento: '2026-04-01',
      frecuencia: 'mensual',
    })
    expect(r.hitos.length).toBeGreaterThanOrEqual(2)
    expect(r.hitos.length).toBeLessThanOrEqual(4)
  })

  it('frecuencia quincenal usa step de 15 días', () => {
    const r = sugerirPlanPagos({
      monto: 100,
      fechaInicio: '2026-01-01',
      cuotas: 2,
      frecuencia: 'quincenal',
    })
    expect(r.hitos[0].fecha).toBe('2026-01-16')
    expect(r.hitos[1].fecha).toBe('2026-01-31')
  })
})
