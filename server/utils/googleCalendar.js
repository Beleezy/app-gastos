const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const API_BASE = 'https://www.googleapis.com/calendar/v3'

class TokenExpiradoError extends Error {
  constructor() { super('invalid_grant: refresh token expirado o revocado') }
}

export function createGcalClient({ refreshToken, clientId, clientSecret, sleep = (ms) => new Promise(r => setTimeout(r, ms)) }) {
  let cachedToken = null
  let cachedExpMs = 0

  async function getAccessToken() {
    if (cachedToken && Date.now() < cachedExpMs - 30_000) return cachedToken
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    })
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    const data = await res.json()
    if (!res.ok || data.error === 'invalid_grant') {
      throw new TokenExpiradoError()
    }
    if (!data.access_token) {
      throw new Error(`Refresh falló: ${JSON.stringify(data)}`)
    }
    cachedToken = data.access_token
    cachedExpMs = Date.now() + (data.expires_in * 1000)
    return cachedToken
  }

  async function authedFetch(url, options = {}, { retries = 4 } = {}) {
    const token = await getAccessToken()
    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
    for (let attempt = 0; attempt <= retries; attempt++) {
      const res = await fetch(url, { ...options, headers })
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        await sleep(Math.pow(2, attempt) * 1000)
        continue
      }
      return res
    }
    throw new Error('Reintentos agotados')
  }

  // ── Calendars ──
  async function createCalendar({ summary, timeZone = 'America/Lima' }) {
    const res = await authedFetch(`${API_BASE}/calendars`, {
      method: 'POST',
      body: JSON.stringify({ summary, timeZone }),
    })
    if (!res.ok) throw new Error(`createCalendar falló: ${await res.text()}`)
    return res.json()
  }

  async function deleteCalendar(calendarId) {
    const res = await authedFetch(`${API_BASE}/calendars/${encodeURIComponent(calendarId)}`, { method: 'DELETE' })
    if (!res.ok && res.status !== 404 && res.status !== 410) {
      throw new Error(`deleteCalendar falló: ${await res.text()}`)
    }
  }

  async function getCalendar(calendarId) {
    const res = await authedFetch(`${API_BASE}/calendars/${encodeURIComponent(calendarId)}`)
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`getCalendar falló: ${await res.text()}`)
    return res.json()
  }

  // ── Events ──
  async function insertEvent(calendarId, eventPayload) {
    const res = await authedFetch(`${API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: 'POST',
      body: JSON.stringify(eventPayload),
    })
    if (!res.ok) throw new Error(`insertEvent falló (${res.status}): ${await res.text()}`)
    const data = await res.json()
    return data.id
  }

  async function patchEvent(calendarId, eventId, eventPayload) {
    const res = await authedFetch(
      `${API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: 'PATCH', body: JSON.stringify(eventPayload) }
    )
    if (res.status === 404) {
      // Self-heal: recrear el evento
      const newId = await insertEvent(calendarId, eventPayload)
      return { id: newId, recreated: true }
    }
    if (!res.ok) throw new Error(`patchEvent falló (${res.status}): ${await res.text()}`)
    const data = await res.json()
    return { id: data.id, recreated: false }
  }

  async function deleteEvent(calendarId, eventId) {
    const res = await authedFetch(
      `${API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: 'DELETE' }
    )
    if (!res.ok && res.status !== 404 && res.status !== 410) {
      throw new Error(`deleteEvent falló: ${await res.text()}`)
    }
  }

  async function listEvents(calendarId, { timeMin } = {}) {
    const all = []
    let pageToken = null
    do {
      const params = new URLSearchParams({ maxResults: '250', singleEvents: 'true' })
      if (timeMin) params.set('timeMin', timeMin)
      if (pageToken) params.set('pageToken', pageToken)
      const res = await authedFetch(`${API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params}`)
      if (!res.ok) throw new Error(`listEvents falló: ${await res.text()}`)
      const data = await res.json()
      all.push(...(data.items || []))
      pageToken = data.nextPageToken
    } while (pageToken)
    return all
  }

  return {
    getAccessToken,
    createCalendar, deleteCalendar, getCalendar,
    insertEvent, patchEvent, deleteEvent, listEvents,
  }
}

export { TokenExpiradoError }
