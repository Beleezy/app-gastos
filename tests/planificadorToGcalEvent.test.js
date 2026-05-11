import { describe, it, expect } from 'vitest'
import { buildEvent, recordatorioToMinutes } from '../server/utils/planificadorToGcalEvent.js'

const APP_URL = 'http://localhost:3000'

const baseGasto = {
  id: 'plan-1',
  concepto: 'Internet',
  montoEstimado: 150,
  fechaProbablePago: '2026-05-20',
  estado: 'pendiente',
  notas: null,
  categoriaNombre: 'Servicios',
}

const recordatoriosDefault = [
  { tipo: 'dia_anterior', hora: '18:00' },
  { tipo: 'mismo_dia', hora: '09:00' },
]

describe('recordatorioToMinutes', () => {
  it('dia_anterior 18:00 → 360 min', () => {
    expect(recordatorioToMinutes({ tipo: 'dia_anterior', hora: '18:00' })).toBe(360)
  })
  it('dia_anterior 00:00 → 1440 min', () => {
    expect(recordatorioToMinutes({ tipo: 'dia_anterior', hora: '00:00' })).toBe(1440)
  })
  it('dos_dias_antes 12:00 → 2160 min', () => {
    expect(recordatorioToMinutes({ tipo: 'dos_dias_antes', hora: '12:00' })).toBe(2160)
  })
  it('una_semana_antes 09:00 → 9540 min', () => {
    expect(recordatorioToMinutes({ tipo: 'una_semana_antes', hora: '09:00' })).toBe(9540)
  })
  it('mismo_dia siempre → 0 (hora ignorada por all-day)', () => {
    expect(recordatorioToMinutes({ tipo: 'mismo_dia', hora: '09:00' })).toBe(0)
    expect(recordatorioToMinutes({ tipo: 'mismo_dia', hora: '23:59' })).toBe(0)
  })
})

describe('buildEvent (pendiente)', () => {
  const ev = buildEvent({
    gasto: baseGasto,
    moneda: 'S/',
    recordatorios: recordatoriosDefault,
    appUrl: APP_URL,
  })

  it('título con moneda y concepto', () => {
    expect(ev.summary).toBe('S/ 150.00 · Internet')
  })
  it('evento all-day con start/end correctos', () => {
    expect(ev.start.date).toBe('2026-05-20')
    expect(ev.end.date).toBe('2026-05-21')
    expect(ev.start.dateTime).toBeUndefined()
  })
  it('descripción incluye monto, categoría y link', () => {
    expect(ev.description).toContain('Pendiente · S/ 150.00')
    expect(ev.description).toContain('Categoría: Servicios')
    expect(ev.description).toContain(`${APP_URL}/planificador?gasto=plan-1`)
  })
  it('color por defecto (sin colorId)', () => {
    expect(ev.colorId).toBeUndefined()
  })
  it('recordatorios respetan la config', () => {
    expect(ev.reminders.useDefault).toBe(false)
    expect(ev.reminders.overrides).toEqual([
      { method: 'popup', minutes: 360 },
      { method: 'popup', minutes: 0 },
    ])
  })
})

describe('buildEvent (pagado)', () => {
  const gastoPagado = { ...baseGasto, estado: 'pagado' }
  const gastoReal = { id: 'real-1', fecha: '2026-05-22', monto: 148.5 }
  const ev = buildEvent({
    gasto: gastoPagado,
    gastoReal,
    moneda: 'S/',
    recordatorios: recordatoriosDefault,
    appUrl: APP_URL,
  })

  it('título con prefijo PAGADO', () => {
    expect(ev.summary).toBe('✅ PAGADO · S/ 150.00 · Internet')
  })
  it('colorId 2 (sage/verde)', () => {
    expect(ev.colorId).toBe('2')
  })
  it('sin recordatorios', () => {
    expect(ev.reminders).toEqual({ useDefault: false, overrides: [] })
  })
  it('descripción con fecha de pago y monto real', () => {
    expect(ev.description).toContain('Pagado el 2026-05-22')
    expect(ev.description).toContain('Monto real: S/ 148.50')
    expect(ev.description).toContain(`${APP_URL}/registro?gasto=real-1`)
  })
})

describe('buildEvent (notas y bordes)', () => {
  it('incluye notas cuando existen', () => {
    const ev = buildEvent({
      gasto: { ...baseGasto, notas: 'Pagar antes de las 5pm' },
      moneda: 'S/',
      recordatorios: [],
      appUrl: APP_URL,
    })
    expect(ev.description).toContain('Pagar antes de las 5pm')
  })

  it('end.date = fechaProbable + 1 día (formato all-day Google)', () => {
    const ev = buildEvent({
      gasto: { ...baseGasto, fechaProbablePago: '2026-12-31' },
      moneda: 'S/',
      recordatorios: [],
      appUrl: APP_URL,
    })
    expect(ev.end.date).toBe('2027-01-01')
  })
})
