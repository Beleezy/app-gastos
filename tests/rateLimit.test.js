import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { rateLimit } from '../server/utils/rateLimit.js'
import { _resetStoreForTests } from '../server/utils/rateLimitStore.js'

function makeEvent() {
  return {
    node: { req: { socket: { remoteAddress: '1.2.3.4' } } },
  }
}

describe('rateLimit', () => {
  beforeEach(() => {
    _resetStoreForTests()
    // Garantizamos driver in-memory aunque haya env vars del CI.
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it('permite hasta el límite', async () => {
    const event = makeEvent()
    for (let i = 0; i < 3; i++) {
      await expect(
        rateLimit(event, { key: 'test:permite', limit: 3, windowMs: 60_000, scope: 'ip' }),
      ).resolves.toBeUndefined()
    }
  })

  it('lanza 429 al exceder', async () => {
    const event = makeEvent()
    for (let i = 0; i < 2; i++) {
      await rateLimit(event, { key: 'test:exceso', limit: 2, windowMs: 60_000, scope: 'ip' })
    }
    let err
    try {
      await rateLimit(event, { key: 'test:exceso', limit: 2, windowMs: 60_000, scope: 'ip' })
    } catch (e) {
      err = e
    }
    expect(err).toBeDefined()
    expect(err.statusCode).toBe(429)
  })

  it('separa buckets por usuario', async () => {
    const event = makeEvent()
    for (let i = 0; i < 3; i++) {
      await rateLimit(event, {
        key: 'test:user',
        limit: 3,
        windowMs: 60_000,
        scope: 'user',
        userId: 'user-a',
      })
    }
    await expect(
      rateLimit(event, {
        key: 'test:user',
        limit: 3,
        windowMs: 60_000,
        scope: 'user',
        userId: 'user-b',
      }),
    ).resolves.toBeUndefined()
  })

  it('resetea pasada la ventana', async () => {
    vi.useFakeTimers()
    const event = makeEvent()
    await rateLimit(event, { key: 'test:reset', limit: 1, windowMs: 1000, scope: 'ip' })
    let err
    try {
      await rateLimit(event, { key: 'test:reset', limit: 1, windowMs: 1000, scope: 'ip' })
    } catch (e) {
      err = e
    }
    expect(err?.statusCode).toBe(429)

    vi.advanceTimersByTime(1500)
    await expect(
      rateLimit(event, { key: 'test:reset', limit: 1, windowMs: 1000, scope: 'ip' }),
    ).resolves.toBeUndefined()
    vi.useRealTimers()
  })
})

describe('rateLimit Upstash driver', () => {
  let fetchSpy
  // Estado en memoria que simula el bucket en el "Redis" mock.
  let mockBucket

  beforeEach(() => {
    _resetStoreForTests()
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
    mockBucket = { count: 0, ttlMs: 0 }

    // Stubeamos fetch para emular un store Redis ideal. El pipeline
    // recibe [INCR k] [EXPIRE k ttl NX] [PTTL k]. Devolvemos el count
    // incrementado y un PTTL en ms.
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url, init) => {
      const body = JSON.parse(init.body)
      const cmds = body
      const out = []
      for (const cmd of cmds) {
        const op = cmd[0]
        if (op === 'INCR') {
          mockBucket.count += 1
          out.push({ result: mockBucket.count })
        } else if (op === 'EXPIRE') {
          if (mockBucket.ttlMs === 0) {
            mockBucket.ttlMs = parseInt(cmd[2], 10) * 1000
          }
          out.push({ result: 1 })
        } else if (op === 'PTTL') {
          out.push({ result: mockBucket.ttlMs || -1 })
        } else {
          out.push({ result: null })
        }
      }
      return {
        ok: true,
        async json() {
          return out
        },
        async text() {
          return JSON.stringify(out)
        },
      }
    })
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    _resetStoreForTests()
  })

  it('usa fetch a /pipeline contra Upstash con Bearer auth', async () => {
    const event = makeEvent()
    await rateLimit(event, { key: 'test:upstash', limit: 5, windowMs: 60_000, scope: 'ip' })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe('https://fake.upstash.io/pipeline')
    expect(init.headers.Authorization).toBe('Bearer fake-token')
    expect(init.headers['Content-Type']).toBe('application/json')
    const cmds = JSON.parse(init.body)
    expect(cmds[0][0]).toBe('INCR')
    expect(cmds[1]).toEqual(['EXPIRE', expect.any(String), '60', 'NX'])
    expect(cmds[2][0]).toBe('PTTL')
  })

  it('rate limita correctamente con Upstash mockeado', async () => {
    const event = makeEvent()
    await rateLimit(event, { key: 'test:upstash2', limit: 2, windowMs: 60_000, scope: 'ip' })
    await rateLimit(event, { key: 'test:upstash2', limit: 2, windowMs: 60_000, scope: 'ip' })
    let err
    try {
      await rateLimit(event, { key: 'test:upstash2', limit: 2, windowMs: 60_000, scope: 'ip' })
    } catch (e) {
      err = e
    }
    expect(err?.statusCode).toBe(429)
  })

  it('fail-open si Upstash devuelve 5xx', async () => {
    fetchSpy.mockImplementationOnce(async () => ({
      ok: false,
      status: 503,
      async text() {
        return 'service unavailable'
      },
    }))
    const event = makeEvent()
    // No debe lanzar — fail-open: el request pasa con count=1.
    await expect(
      rateLimit(event, { key: 'test:upstash3', limit: 5, windowMs: 60_000, scope: 'ip' }),
    ).resolves.toBeUndefined()
  })
})
