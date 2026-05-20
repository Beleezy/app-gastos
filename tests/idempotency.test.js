import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  tryIdempotentReplay,
  rememberIdempotent,
  __resetIdempotencyStore,
} from '../server/utils/idempotency.js'

// Stubs de los globales que Nuxt/Nitro auto-importan.
beforeEach(() => {
  __resetIdempotencyStore()
  globalThis.getRequestHeader = vi.fn((event, name) => event.headers?.[name.toLowerCase()])
  globalThis.setResponseHeader = vi.fn()
})

function evt(headers = {}, overrides = {}) {
  return { method: 'POST', path: '/api/gastos', headers, ...overrides }
}

describe('idempotency helper', () => {
  it('devuelve null si no hay header Idempotency-Key', () => {
    expect(tryIdempotentReplay(evt(), 'u1')).toBe(null)
  })

  it('devuelve null en el primer hit con un nuevo key', () => {
    const e = evt({ 'idempotency-key': 'k1' })
    expect(tryIdempotentReplay(e, 'u1')).toBe(null)
  })

  it('devuelve la respuesta cacheada en el segundo hit con el mismo key', () => {
    const e1 = evt({ 'idempotency-key': 'k1' })
    expect(tryIdempotentReplay(e1, 'u1')).toBe(null)
    rememberIdempotent(e1, 'u1', { ok: true, id: 42 })

    const e2 = evt({ 'idempotency-key': 'k1' })
    expect(tryIdempotentReplay(e2, 'u1')).toEqual({ ok: true, id: 42 })
  })

  it('aísla por usuario: misma key de otro usuario no devuelve la respuesta', () => {
    const e1 = evt({ 'idempotency-key': 'k1' })
    rememberIdempotent(e1, 'u1', { ok: true })
    const e2 = evt({ 'idempotency-key': 'k1' })
    expect(tryIdempotentReplay(e2, 'u2')).toBe(null)
  })

  it('aísla por método: POST y DELETE con el mismo key no colisionan', () => {
    const ePost = evt({ 'idempotency-key': 'k1' }, { method: 'POST' })
    rememberIdempotent(ePost, 'u1', { ok: 'post' })
    const eDel = evt({ 'idempotency-key': 'k1' }, { method: 'DELETE' })
    expect(tryIdempotentReplay(eDel, 'u1')).toBe(null)
  })

  it('emite header X-Idempotent-Replay al servir desde cache', () => {
    const e1 = evt({ 'idempotency-key': 'k1' })
    rememberIdempotent(e1, 'u1', { ok: true })
    const e2 = evt({ 'idempotency-key': 'k1' })
    tryIdempotentReplay(e2, 'u1')
    expect(globalThis.setResponseHeader).toHaveBeenCalledWith(e2, 'X-Idempotent-Replay', 'true')
  })
})
