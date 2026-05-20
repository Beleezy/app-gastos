// Wrapper sobre web-push para envío de notificaciones programadas.
// VAPID keys se cargan desde env. Si están ausentes (dev sin push),
// `send()` es un no-op silencioso para no romper crons.

import webpush from 'web-push'
import { logger } from './logger.js'

let configured = false

function ensureConfigured() {
  if (configured) return true
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com'
  if (!publicKey || !privateKey) {
    logger.warn('VAPID keys ausentes; push notifications deshabilitadas')
    return false
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
  return true
}

/**
 * Envía notificación push a una suscripción. Devuelve { ok, status }.
 * No lanza: la idea es que un fallo en un suscriptor no detenga el lote.
 * Si el endpoint retorna 410 (Gone) la suscripción debería borrarse.
 */
export async function sendPush({ subscription, payload }) {
  if (!ensureConfigured()) return { ok: false, reason: 'no-vapid' }
  try {
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload)
    await webpush.sendNotification(subscription, data, { TTL: 60 * 60 * 24 })
    return { ok: true, status: 201 }
  } catch (e) {
    const status = e?.statusCode || 0
    if (status === 410 || status === 404) {
      return { ok: false, status, gone: true }
    }
    logger.warn('push fallido', { endpoint: subscription?.endpoint?.slice(0, 80), status, message: e?.message })
    return { ok: false, status, message: e?.message }
  }
}
