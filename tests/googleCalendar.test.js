import { describe, it, expect, vi, beforeEach } from 'vitest'

const fetchMock = vi.fn()
global.fetch = fetchMock

let createGcalClient

beforeEach(async () => {
  fetchMock.mockReset()
  vi.resetModules()
  const mod = await import('../server/utils/googleCalendar.js')
  createGcalClient = mod.createGcalClient
})

function mockJson(body, status = 200) {
  return { ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) }
}

describe('googleCalendar — refresh token', () => {
  it('intercambia refresh_token por access_token', async () => {
    fetchMock.mockResolvedValueOnce(mockJson({ access_token: 'tk-abc', expires_in: 3600 }))
    const client = createGcalClient({ refreshToken: 'rt-1', clientId: 'cid', clientSecret: 'csec' })
    const token = await client.getAccessToken()
    expect(token).toBe('tk-abc')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/token',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('reusa token cacheado hasta que expira', async () => {
    fetchMock.mockResolvedValueOnce(mockJson({ access_token: 'tk-1', expires_in: 3600 }))
    const client = createGcalClient({ refreshToken: 'rt', clientId: 'cid', clientSecret: 'csec' })
    await client.getAccessToken()
    await client.getAccessToken()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('invalid_grant lanza error específico', async () => {
    fetchMock.mockResolvedValueOnce(mockJson({ error: 'invalid_grant' }, 400))
    const client = createGcalClient({ refreshToken: 'rt-bad', clientId: 'cid', clientSecret: 'csec' })
    await expect(client.getAccessToken()).rejects.toThrow(/invalid_grant|token.*expirad/i)
  })
})

describe('googleCalendar — events CRUD', () => {
  it('insertEvent llama events.insert y devuelve el eventId', async () => {
    fetchMock
      .mockResolvedValueOnce(mockJson({ access_token: 'tk', expires_in: 3600 }))
      .mockResolvedValueOnce(mockJson({ id: 'evt-xyz', status: 'confirmed' }))
    const client = createGcalClient({ refreshToken: 'rt', clientId: 'c', clientSecret: 's' })
    const id = await client.insertEvent('cal-1', { summary: 'test' })
    expect(id).toBe('evt-xyz')
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://www.googleapis.com/calendar/v3/calendars/cal-1/events',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('patchEvent recrea evento si Google devuelve 404', async () => {
    fetchMock
      .mockResolvedValueOnce(mockJson({ access_token: 'tk', expires_in: 3600 }))
      .mockResolvedValueOnce(mockJson({ error: { code: 404 } }, 404))  // patch falla
      .mockResolvedValueOnce(mockJson({ id: 'evt-new' }))               // insert exitoso
    const client = createGcalClient({ refreshToken: 'rt', clientId: 'c', clientSecret: 's' })
    const result = await client.patchEvent('cal-1', 'evt-viejo', { summary: 'x' })
    expect(result.id).toBe('evt-new')
    expect(result.recreated).toBe(true)
  })

  it('deleteEvent ignora 404 (idempotente)', async () => {
    fetchMock
      .mockResolvedValueOnce(mockJson({ access_token: 'tk', expires_in: 3600 }))
      .mockResolvedValueOnce(mockJson({ error: { code: 404 } }, 404))
    const client = createGcalClient({ refreshToken: 'rt', clientId: 'c', clientSecret: 's' })
    await expect(client.deleteEvent('cal-1', 'evt-x')).resolves.toBeUndefined()
  })
})

describe('googleCalendar — retry on 429', () => {
  it('reintenta en 429 con backoff y eventualmente lo logra', async () => {
    fetchMock
      .mockResolvedValueOnce(mockJson({ access_token: 'tk', expires_in: 3600 }))
      .mockResolvedValueOnce(mockJson({}, 429))
      .mockResolvedValueOnce(mockJson({}, 429))
      .mockResolvedValueOnce(mockJson({ id: 'evt-x' }))
    const client = createGcalClient({
      refreshToken: 'rt', clientId: 'c', clientSecret: 's',
      sleep: () => Promise.resolve(),
    })
    const id = await client.insertEvent('cal-1', { summary: 'x' })
    expect(id).toBe('evt-x')
  })
})

describe('googleCalendar — calendars', () => {
  it('createCalendar devuelve calendarId', async () => {
    fetchMock
      .mockResolvedValueOnce(mockJson({ access_token: 'tk', expires_in: 3600 }))
      .mockResolvedValueOnce(mockJson({ id: 'cal-new-id', summary: 'Mis Finanzas' }))
    const client = createGcalClient({ refreshToken: 'rt', clientId: 'c', clientSecret: 's' })
    const cal = await client.createCalendar({ summary: 'Mis Finanzas', timeZone: 'America/Lima' })
    expect(cal.id).toBe('cal-new-id')
  })

  it('deleteCalendar funciona', async () => {
    fetchMock
      .mockResolvedValueOnce(mockJson({ access_token: 'tk', expires_in: 3600 }))
      .mockResolvedValueOnce(mockJson({}, 204))
    const client = createGcalClient({ refreshToken: 'rt', clientId: 'c', clientSecret: 's' })
    await expect(client.deleteCalendar('cal-1')).resolves.toBeUndefined()
  })

  it('listEvents pagina automáticamente', async () => {
    fetchMock
      .mockResolvedValueOnce(mockJson({ access_token: 'tk', expires_in: 3600 }))
      .mockResolvedValueOnce(mockJson({ items: [{ id: 'e1' }, { id: 'e2' }], nextPageToken: 'p2' }))
      .mockResolvedValueOnce(mockJson({ items: [{ id: 'e3' }] }))
    const client = createGcalClient({ refreshToken: 'rt', clientId: 'c', clientSecret: 's' })
    const events = await client.listEvents('cal-1')
    expect(events).toHaveLength(3)
    expect(events.map(e => e.id)).toEqual(['e1', 'e2', 'e3'])
  })
})
