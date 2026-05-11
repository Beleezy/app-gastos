import { describe, it, expect, beforeAll } from 'vitest'
import crypto from 'node:crypto'

let encrypt, decrypt

beforeAll(async () => {
  process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
  const mod = await import('../server/utils/crypto.js')
  encrypt = mod.encrypt
  decrypt = mod.decrypt
})

describe('crypto', () => {
  it('encrypt/decrypt roundtrip', () => {
    const plaintext = 'refresh_token_secreto_123'
    const ciphertext = encrypt(plaintext)
    expect(ciphertext).not.toBe(plaintext)
    expect(decrypt(ciphertext)).toBe(plaintext)
  })

  it('cada encrypt produce un ciphertext diferente (IV aleatorio)', () => {
    const c1 = encrypt('hola')
    const c2 = encrypt('hola')
    expect(c1).not.toBe(c2)
    expect(decrypt(c1)).toBe('hola')
    expect(decrypt(c2)).toBe('hola')
  })

  it('decrypt de ciphertext corrupto lanza error', () => {
    const c = encrypt('hola')
    const partes = c.split(':')
    partes[2] = Buffer.from('corrupto').toString('base64')
    expect(() => decrypt(partes.join(':'))).toThrow()
  })
})
