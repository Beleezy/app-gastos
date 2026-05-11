import crypto from 'node:crypto'

function getKey() {
  const keyB64 = process.env.ENCRYPTION_KEY
  if (!keyB64) throw new Error('ENCRYPTION_KEY no configurada')
  return Buffer.from(keyB64, 'base64')
}

export function signState(claims, { expSeconds = 600 } = {}) {
  const payload = {
    ...claims,
    nonce: crypto.randomBytes(8).toString('hex'),
    exp: Math.floor(Date.now() / 1000) + expSeconds,
  }
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', getKey()).update(payloadB64).digest('base64url')
  return `${payloadB64}.${sig}`
}

export function verifyState(token) {
  const [payloadB64, sig] = (token || '').split('.')
  if (!payloadB64 || !sig) throw new Error('State malformado')
  const expectedSig = crypto.createHmac('sha256', getKey()).update(payloadB64).digest('base64url')
  const sigBuf = Buffer.from(sig)
  const expectedBuf = Buffer.from(expectedSig)
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    throw new Error('State con firma inválida')
  }
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('State expirado')
  }
  return payload
}
