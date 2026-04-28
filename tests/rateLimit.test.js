import { describe, it, expect, vi } from 'vitest'
import { rateLimit } from '../server/utils/rateLimit.js'

function makeEvent() {
  return {
    node: { req: { socket: { remoteAddress: '1.2.3.4' } } },
  }
}

describe('rateLimit', () => {
  it('permite hasta el límite', () => {
    const event = makeEvent()
    for (let i = 0; i < 3; i++) {
      expect(() =>
        rateLimit(event, { key: 'test:permite', limit: 3, windowMs: 60_000, scope: 'ip' }),
      ).not.toThrow()
    }
  })

  it('lanza 429 al exceder', () => {
    const event = makeEvent()
    for (let i = 0; i < 2; i++) {
      rateLimit(event, { key: 'test:exceso', limit: 2, windowMs: 60_000, scope: 'ip' })
    }
    let err
    try {
      rateLimit(event, { key: 'test:exceso', limit: 2, windowMs: 60_000, scope: 'ip' })
    } catch (e) {
      err = e
    }
    expect(err).toBeDefined()
    expect(err.statusCode).toBe(429)
  })

  it('separa buckets por usuario', () => {
    const event = makeEvent()
    for (let i = 0; i < 3; i++) {
      rateLimit(event, {
        key: 'test:user',
        limit: 3,
        windowMs: 60_000,
        scope: 'user',
        userId: 'user-a',
      })
    }
    expect(() =>
      rateLimit(event, {
        key: 'test:user',
        limit: 3,
        windowMs: 60_000,
        scope: 'user',
        userId: 'user-b',
      }),
    ).not.toThrow()
  })

  it('resetea pasada la ventana', () => {
    vi.useFakeTimers()
    const event = makeEvent()
    rateLimit(event, { key: 'test:reset', limit: 1, windowMs: 1000, scope: 'ip' })
    let err
    try {
      rateLimit(event, { key: 'test:reset', limit: 1, windowMs: 1000, scope: 'ip' })
    } catch (e) {
      err = e
    }
    expect(err?.statusCode).toBe(429)

    vi.advanceTimersByTime(1500)
    expect(() =>
      rateLimit(event, { key: 'test:reset', limit: 1, windowMs: 1000, scope: 'ip' }),
    ).not.toThrow()
    vi.useRealTimers()
  })
})
