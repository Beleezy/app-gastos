import crypto from 'node:crypto'

const ALGO = 'aes-256-gcm'
const IV_LEN = 12
const TAG_LEN = 16

function getKey() {
  // En tests caemos al process.env; en producción Nuxt expone runtimeConfig.
  // Esta utilidad se invoca en handlers Nitro donde process.env tiene los valores.
  const keyB64 = process.env.ENCRYPTION_KEY
  if (!keyB64) {
    throw new Error('ENCRYPTION_KEY no está configurada')
  }
  const key = Buffer.from(keyB64, 'base64')
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY debe ser 32 bytes en base64')
  }
  return key
}

export function encrypt(plaintext) {
  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`
}

export function decrypt(payload) {
  const [ivB64, tagB64, ctB64] = payload.split(':')
  if (!ivB64 || !tagB64 || !ctB64) throw new Error('Formato inválido')
  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const ct = Buffer.from(ctB64, 'base64')
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(ct), decipher.final()])
  return plaintext.toString('utf8')
}
