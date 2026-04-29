import { describe, it, expect } from 'vitest'
import { formatRelativo } from '../composables/useFechaRelativa.js'

const HOY = new Date(2026, 3, 15, 12, 0, 0) // 15 abril 2026, 12:00 local

describe('formatRelativo', () => {
  it('ahora si <1 min', () => {
    const t = new Date(HOY.getTime() - 30_000)
    expect(formatRelativo(t, { ahora: HOY })).toBe('ahora')
  })

  it('minutos pasados', () => {
    const t = new Date(HOY.getTime() - 5 * 60_000)
    expect(formatRelativo(t, { ahora: HOY })).toBe('hace 5 min')
  })

  it('minutos futuros', () => {
    const t = new Date(HOY.getTime() + 5 * 60_000)
    expect(formatRelativo(t, { ahora: HOY })).toBe('en 5 min')
  })

  it('horas pasadas', () => {
    const t = new Date(HOY.getTime() - 3 * 60 * 60_000)
    expect(formatRelativo(t, { ahora: HOY })).toBe('hace 3 h')
  })

  it('ayer / mañana usan dia calendario', () => {
    const ayer = new Date(2026, 3, 14)
    const manana = new Date(2026, 3, 16)
    expect(formatRelativo(ayer, { ahora: HOY })).toBe('ayer')
    expect(formatRelativo(manana, { ahora: HOY })).toBe('mañana')
  })

  it('mismo día con poca diferencia usa minutos', () => {
    const t = new Date(HOY.getTime() - 30_000)
    expect(formatRelativo(t, { ahora: HOY })).toBe('ahora')
  })

  it('días < 7', () => {
    const t = new Date(2026, 3, 12)
    expect(formatRelativo(t, { ahora: HOY })).toBe('hace 3 días')
  })

  it('semanas', () => {
    const t = new Date(2026, 3, 1)
    expect(formatRelativo(t, { ahora: HOY })).toBe('hace 2 semanas')
  })

  it('meses', () => {
    const t = new Date(2026, 0, 15)
    expect(formatRelativo(t, { ahora: HOY })).toBe('hace 3 meses')
  })

  it('años', () => {
    const t = new Date(2024, 3, 15)
    expect(formatRelativo(t, { ahora: HOY })).toBe('hace 2 años')
  })

  it('ISO YYYY-MM-DD aceptado', () => {
    expect(formatRelativo('2026-04-14', { ahora: HOY })).toBe('ayer')
  })

  it('input inválido → string vacío', () => {
    expect(formatRelativo('algo raro', { ahora: HOY })).toBe('')
    expect(formatRelativo(null, { ahora: HOY })).toBe('')
  })
})
