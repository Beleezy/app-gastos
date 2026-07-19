// Validación de magic bytes (file signatures) para inputs declarados
// como imagen. Si el dataURI dice `image/jpeg` pero el contenido es PDF
// o un payload arbitrario, lo rechazamos antes de mandarlo al LLM.
//
// Defensa-en-profundidad: el LLM ignora la mayoría de payloads no
// visuales, pero validar localmente
// - evita gastar tokens en payloads obviamente fraudulentos
// - cierra superficie a futuras integraciones que confíen en el MIME
// - documenta explícitamente qué formatos aceptamos.

const SIGNATURES = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF87a / GIF89a
  {
    mime: 'image/webp',
    bytes: [0x52, 0x49, 0x46, 0x46],
    offset: 0,
    secondary: { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 },
  },
  { mime: 'image/heic', bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 },
  { mime: 'image/heif', bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 },
]

function matchSignature(buf, sig) {
  const offset = sig.offset || 0
  for (let i = 0; i < sig.bytes.length; i++) {
    if (buf[offset + i] !== sig.bytes[i]) return false
  }
  if (sig.secondary) {
    for (let i = 0; i < sig.secondary.bytes.length; i++) {
      if (buf[sig.secondary.offset + i] !== sig.secondary.bytes[i]) return false
    }
  }
  return true
}

/**
 * Detecta el MIME real comparando con los magic bytes. Devuelve el
 * MIME detectado (image/jpeg | image/png | ...) o null si no coincide.
 *
 * @param {string} base64 - base64 puro (sin prefijo data:).
 */
export function detectImageMime(base64) {
  if (typeof base64 !== 'string' || base64.length === 0) return null
  // Decodificamos solo los primeros 16 bytes (~22 chars base64) — suficiente
  // para cualquiera de los magics anteriores.
  let head
  try {
    head = Buffer.from(base64.slice(0, 32), 'base64')
  } catch {
    return null
  }
  for (const sig of SIGNATURES) {
    if (matchSignature(head, sig)) return sig.mime
  }
  return null
}

/**
 * Valida que un dataURI / base64 corresponde a una imagen soportada.
 * Lanza 400 si no.
 *
 * @returns {{ mimeType: string, base64: string }} MIME real y base64 puro.
 */
export function assertImagePayload(input) {
  let base64 = input
  let claimedMime = null

  if (typeof input !== 'string' || input.length === 0) {
    throw createError({ statusCode: 400, message: 'Imagen vacía o tipo inválido' })
  }

  if (input.startsWith('data:')) {
    const match = input.match(/^data:(image\/[\w+.-]+);base64,(.+)$/)
    if (!match) {
      throw createError({ statusCode: 400, message: 'Formato de imagen inválido' })
    }
    claimedMime = match[1].toLowerCase()
    base64 = match[2]
  }

  const realMime = detectImageMime(base64)
  if (!realMime) {
    throw createError({
      statusCode: 400,
      message: 'El contenido no es una imagen soportada (JPEG, PNG, GIF, WEBP, HEIC).',
    })
  }

  // Si el cliente declara MIME, debe coincidir (relajamos heic/heif que
  // comparten signature, y jpeg/jpg como alias).
  if (claimedMime && claimedMime !== realMime) {
    const aliases = {
      'image/jpg': 'image/jpeg',
      'image/heic': 'image/heif',
      'image/heif': 'image/heic',
    }
    if (aliases[claimedMime] !== realMime) {
      throw createError({
        statusCode: 400,
        message: 'El MIME declarado no coincide con el contenido real',
      })
    }
  }

  return { mimeType: realMime, base64 }
}
