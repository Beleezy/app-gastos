import { describe, it, expect } from 'vitest'
import { detectImageMime, assertImagePayload } from '../server/utils/imageMagic.js'

function toBase64(bytes) {
  return Buffer.from(bytes).toString('base64')
}

const JPEG = toBase64([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46])
const PNG = toBase64([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xde, 0xad])
const GIF87 = toBase64([0x47, 0x49, 0x46, 0x38, 0x37, 0x61, 0x10, 0x00])
const WEBP = toBase64([
  0x52, 0x49, 0x46, 0x46, // RIFF
  0x00, 0x00, 0x00, 0x00, // size
  0x57, 0x45, 0x42, 0x50, // WEBP
  0x56, 0x50, 0x38, 0x20,
])
const PDF = toBase64([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e])
const HTML = toBase64([0x3c, 0x21, 0x44, 0x4f, 0x43, 0x54, 0x59, 0x50])

describe('detectImageMime', () => {
  it('reconoce JPEG / PNG / GIF / WEBP', () => {
    expect(detectImageMime(JPEG)).toBe('image/jpeg')
    expect(detectImageMime(PNG)).toBe('image/png')
    expect(detectImageMime(GIF87)).toBe('image/gif')
    expect(detectImageMime(WEBP)).toBe('image/webp')
  })

  it('rechaza PDF y HTML', () => {
    expect(detectImageMime(PDF)).toBeNull()
    expect(detectImageMime(HTML)).toBeNull()
  })

  it('rechaza string vacío o no-string', () => {
    expect(detectImageMime('')).toBeNull()
    expect(detectImageMime(null)).toBeNull()
    expect(detectImageMime(undefined)).toBeNull()
  })
})

describe('assertImagePayload', () => {
  it('acepta dataURI con MIME coherente', () => {
    const r = assertImagePayload(`data:image/jpeg;base64,${JPEG}`)
    expect(r.mimeType).toBe('image/jpeg')
    expect(r.base64).toBe(JPEG)
  })

  it('acepta base64 crudo', () => {
    const r = assertImagePayload(PNG)
    expect(r.mimeType).toBe('image/png')
  })

  it('acepta image/jpg como alias de image/jpeg', () => {
    const r = assertImagePayload(`data:image/jpg;base64,${JPEG}`)
    expect(r.mimeType).toBe('image/jpeg')
  })

  it('rechaza contenido que no es imagen', () => {
    expect(() => assertImagePayload(PDF)).toThrowError(/imagen soportada/)
    expect(() => assertImagePayload(`data:image/jpeg;base64,${PDF}`)).toThrowError(/imagen soportada|coincide/)
  })

  it('rechaza MIME declarado distinto al contenido real', () => {
    expect(() => assertImagePayload(`data:image/png;base64,${JPEG}`)).toThrowError(/coincide/)
  })

  it('rechaza dataURI malformado', () => {
    expect(() => assertImagePayload('data:image/jpeg,no-base64')).toThrowError(/Formato/)
  })

  it('rechaza string vacío', () => {
    expect(() => assertImagePayload('')).toThrowError(/vacía|inválido/)
  })
})
