import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger } from '../server/utils/logger.js'

describe('logger', () => {
  let logSpy
  let warnSpy
  let errorSpy

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    logSpy.mockRestore()
    warnSpy.mockRestore()
    errorSpy.mockRestore()
  })

  function lastLogged(spy) {
    const args = spy.mock.calls[spy.mock.calls.length - 1]
    return JSON.parse(args[0])
  }

  it('emite JSON con level y timestamp', () => {
    logger.info('hello', { foo: 'bar' })
    const out = lastLogged(logSpy)
    expect(out.level).toBe('info')
    expect(out.message).toBe('hello')
    expect(out.context.foo).toBe('bar')
    expect(typeof out.ts).toBe('string')
  })

  it('redacta keys sensibles', () => {
    logger.info('config', { apiKey: 'AIzaSyXXXX', password: 'secret', user: 'pepe' })
    const out = lastLogged(logSpy)
    expect(out.context.apiKey).toBe('[REDACTED]')
    expect(out.context.password).toBe('[REDACTED]')
    expect(out.context.user).toBe('pepe')
  })

  it('redacta patrones de api key de Gemini en strings', () => {
    logger.warn('algo con AIzaSy0123456789ABCDEF0123456789ABCDEF012')
    const out = lastLogged(warnSpy)
    expect(out.message).toContain('[REDACTED]')
    expect(out.message).not.toContain('AIzaSy0123456789')
  })

  it('redacta JWT en strings', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTYifQ.signature'
    logger.error(`token: ${jwt}`)
    const out = lastLogged(errorSpy)
    expect(out.message).toContain('[REDACTED]')
    expect(out.message).not.toContain('eyJhbGc')
  })

  it('serializa Error a {name, message}', () => {
    const err = new Error('boom')
    logger.error('falló', { error: err })
    const out = lastLogged(errorSpy)
    expect(out.context.error.name).toBe('Error')
    expect(out.context.error.message).toBe('boom')
  })

  it('redacta connection strings con credenciales (postgres/redis/mysql/mongo)', () => {
    logger.warn('db error: postgresql://admin:s3cret@db.local:5432/app')
    const out = lastLogged(warnSpy)
    expect(out.message).toContain('[REDACTED]')
    expect(out.message).not.toContain('s3cret')
    expect(out.message).not.toContain('admin')
  })

  it('redacta Bearer tokens en strings', () => {
    logger.warn('auth: Bearer abcdefghijklmnopqrstuvwxyz1234567890')
    const out = lastLogged(warnSpy)
    expect(out.message).toContain('[REDACTED]')
    expect(out.message).not.toContain('abcdefghijklmnop')
  })

  it('redacta GitHub PATs', () => {
    logger.warn('token leak: ghp_abcdefghijklmnopqrstuvwxyz0123456789')
    const out = lastLogged(warnSpy)
    expect(out.message).toContain('[REDACTED]')
    expect(out.message).not.toContain('ghp_')
  })
})
