# Integración con Google Calendar — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sincronizar `gastos_planificados` con un calendario dedicado en Google Calendar para que el usuario reciba recordatorios automáticos del día de pago.

**Architecture:** OAuth de Google separado del login (cliente OAuth propio, scope `calendar`, refresh token cifrado en DB con AES-256-GCM). Sync unidireccional app→Google con hooks fire-and-forget en cada CRUD del planificador, más botón de resync manual. Eventos all-day con color verde + prefijo `✅ PAGADO` al marcarse pagados. Calendario dedicado creado por la app. Recordatorios configurables (default: día anterior 18:00 + mismo día).

**Tech Stack:** Nuxt 3 + JavaScript, Drizzle ORM (Postgres), Supabase Auth, Vue 3 Composition API, Vitest, Node `crypto` nativo.

**Spec de referencia:** [docs/superpowers/specs/2026-05-11-google-calendar-integracion-design.md](../specs/2026-05-11-google-calendar-integracion-design.md)

---

## Mapa de archivos

**Nuevos archivos (servidor):**
- `server/utils/crypto.js` — `encrypt(plaintext)` / `decrypt(ciphertext)` con AES-256-GCM
- `server/utils/googleOAuthState.js` — firmar/validar el `state` del OAuth callback
- `server/utils/googleCalendar.js` — wrapper de Google Calendar API (refresh token, retry, self-heal 404)
- `server/utils/planificadorToGcalEvent.js` — convertir gasto planificado a payload de evento
- `server/utils/gcalAutoSync.js` — helper fire-and-forget llamado desde hooks de CRUD
- `server/api/integraciones/google/oauth-start.post.js`
- `server/api/integraciones/google/oauth-callback.get.js`
- `server/api/integraciones/google/index.get.js` — estado de la conexión
- `server/api/integraciones/google/index.delete.js` — desconectar
- `server/api/integraciones/google/resync.post.js`
- `server/api/integraciones/google/config.patch.js`

**Nuevos archivos (cliente):**
- `composables/useGoogleCalendar.js`
- `components/configuraciones/IntegracionGoogleCalendar.vue`
- `components/configuraciones/EditorRecordatorios.vue`

**Modificaciones:**
- `server/database/schema.js` — agregar tabla `googleCalendarConexiones` + columna `googleEventId` en `gastosPlanificados`
- `server/database/migrations/0018_google_calendar.sql` — migración SQL
- `nuxt.config.ts` — runtimeConfig (encryption key + OAuth Google)
- `.env.example` — variables nuevas
- `server/api/planificador/gastos/index.post.js` — hook auto-sync (crear evento)
- `server/api/planificador/gastos/[id].put.js` — hook auto-sync (patch evento)
- `server/api/planificador/gastos/[id].delete.js` — hook auto-sync (borrar evento)
- `server/api/planificador/gastos/[id]/registro.post.js` — hook auto-sync (marcar pagado)
- `pages/configuraciones.vue` — agregar sección Integraciones
- `components/planificador/ResumenMes.vue` — entrada "Sincronizar con Google Calendar" en menú "..."

**Nuevos tests:**
- `tests/crypto.test.js`
- `tests/googleOAuthState.test.js`
- `tests/planificadorToGcalEvent.test.js`
- `tests/googleCalendar.test.js`

---

## Task 1: Utilidad de cifrado AES-256-GCM

**Files:**
- Create: `server/utils/crypto.js`
- Test: `tests/crypto.test.js`

- [ ] **Step 1: Escribir test de roundtrip encrypt/decrypt**

```js
// tests/crypto.test.js
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
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- crypto`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar `server/utils/crypto.js`**

```js
import crypto from 'node:crypto'

const ALGO = 'aes-256-gcm'
const IV_LEN = 12
const TAG_LEN = 16

function getKey() {
  const config = useRuntimeConfig()
  const keyB64 = config.encryptionKey || process.env.ENCRYPTION_KEY
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
```

Nota: `useRuntimeConfig()` solo está disponible dentro del handler de Nuxt. Para tests caemos al `process.env`. Para producción la clave se lee de runtimeConfig (configurado en Task 2).

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- crypto`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add server/utils/crypto.js tests/crypto.test.js
git commit -m "feat: utilidad de cifrado AES-256-GCM para tokens OAuth"
```

---

## Task 2: Variables de entorno y runtimeConfig

**Files:**
- Modify: `.env.example`
- Modify: `nuxt.config.ts`

- [ ] **Step 1: Agregar variables al `.env.example`**

Añadir al final del archivo:

```
# ──────────────────────────────────────────────────────
# Integración con Google Calendar
# ──────────────────────────────────────────────────────
# Clave de cifrado para refresh tokens en DB (32 bytes base64).
# Generar con: openssl rand -base64 32
ENCRYPTION_KEY=

# Cliente OAuth de Google para Calendar (separado del de Supabase Auth).
# Crear en https://console.cloud.google.com/apis/credentials
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/integraciones/google/oauth-callback
```

- [ ] **Step 2: Agregar a `runtimeConfig` en `nuxt.config.ts`**

En el bloque `runtimeConfig: { ... }`, agregar antes de `public: {`:

```js
    encryptionKey: process.env.ENCRYPTION_KEY || '',
    googleOAuthClientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
    googleOAuthClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
    googleOAuthRedirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI || '',
```

- [ ] **Step 3: Commit**

```bash
git add .env.example nuxt.config.ts
git commit -m "feat: env vars para integración Google Calendar"
```

---

## Task 3: Esquema de DB + migración

**Files:**
- Modify: `server/database/schema.js`
- Create: `server/database/migrations/0018_google_calendar.sql`

- [ ] **Step 1: Agregar import `jsonb` y la tabla en `schema.js`**

En la línea 1, asegurar que `jsonb` está en el import:

```js
import { pgTable, uuid, varchar, text, boolean, integer, decimal, date, time, timestamp, pgEnum, unique, index, uniqueIndex, jsonb } from 'drizzle-orm/pg-core'
```

Al final del archivo `server/database/schema.js`, agregar:

```js
// ── Integraciones: Google Calendar ──
export const googleCalendarConexiones = pgTable('google_calendar_conexiones', {
  id: uuid('id').defaultRandom().primaryKey(),
  usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'cascade' }).notNull(),
  refreshTokenCifrado: text('refresh_token_cifrado').notNull(),
  calendarId: varchar('calendar_id', { length: 255 }).notNull(),
  calendarNombre: varchar('calendar_nombre', { length: 255 }).notNull(),
  recordatoriosConfig: jsonb('recordatorios_config').notNull(),
  ultimaSync: timestamp('ultima_sync'),
  ultimoError: text('ultimo_error'),
  fechaConexion: timestamp('fecha_conexion').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('google_calendar_conexiones_usuario_unique').on(table.usuarioId),
])
```

- [ ] **Step 2: Agregar columna `googleEventId` a `gastosPlanificados`**

En la definición existente de `gastosPlanificados` (alrededor de la línea 48), agregar antes del `createdAt`:

```js
  googleEventId: varchar('google_event_id', { length: 255 }),
```

- [ ] **Step 3: Crear archivo de migración**

Crear `server/database/migrations/0018_google_calendar.sql` con:

```sql
-- Integración con Google Calendar.
-- Ver docs/superpowers/specs/2026-05-11-google-calendar-integracion-design.md

CREATE TABLE IF NOT EXISTS "google_calendar_conexiones" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "usuario_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
  "refresh_token_cifrado" text NOT NULL,
  "calendar_id" varchar(255) NOT NULL,
  "calendar_nombre" varchar(255) NOT NULL,
  "recordatorios_config" jsonb NOT NULL,
  "ultima_sync" timestamp,
  "ultimo_error" text,
  "fecha_conexion" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "google_calendar_conexiones_usuario_unique"
  ON "google_calendar_conexiones" ("usuario_id");

ALTER TABLE "gastos_planificados"
  ADD COLUMN IF NOT EXISTS "google_event_id" varchar(255);
```

- [ ] **Step 4: Aplicar la migración**

Run: `npm run db:push`
Expected: confirmación de que la tabla y columna se crearon. No-op si ya existían.

Verificar con `npm run db:studio` que la tabla `google_calendar_conexiones` aparece y que `gastos_planificados.google_event_id` existe.

- [ ] **Step 5: Commit**

```bash
git add server/database/schema.js server/database/migrations/0018_google_calendar.sql
git commit -m "feat: esquema para integración Google Calendar"
```

---

## Task 4: Firma del state OAuth

**Files:**
- Create: `server/utils/googleOAuthState.js`
- Test: `tests/googleOAuthState.test.js`

El `state` que mandamos a Google en el OAuth start debe volver íntegro al callback. Lo firmamos con HMAC-SHA256 usando `ENCRYPTION_KEY` (reutilizamos la misma clave por simplicidad — sirve para CSRF / integridad, no cifra nada).

- [ ] **Step 1: Test**

```js
// tests/googleOAuthState.test.js
import { describe, it, expect, beforeAll } from 'vitest'
import crypto from 'node:crypto'

let signState, verifyState

beforeAll(async () => {
  process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
  const mod = await import('../server/utils/googleOAuthState.js')
  signState = mod.signState
  verifyState = mod.verifyState
})

describe('googleOAuthState', () => {
  it('roundtrip de state válido', () => {
    const token = signState({ usuarioId: 'abc-123' })
    const claims = verifyState(token)
    expect(claims.usuarioId).toBe('abc-123')
  })

  it('state manipulado falla la verificación', () => {
    const token = signState({ usuarioId: 'abc-123' })
    const [payload, sig] = token.split('.')
    const tampered = `${payload}xxxx.${sig}`
    expect(() => verifyState(tampered)).toThrow()
  })

  it('state expirado falla', () => {
    const token = signState({ usuarioId: 'abc-123' }, { expSeconds: -1 })
    expect(() => verifyState(token)).toThrow(/expirado/i)
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm test -- googleOAuthState`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar**

```js
// server/utils/googleOAuthState.js
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
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    throw new Error('State con firma inválida')
  }
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('State expirado')
  }
  return payload
}
```

- [ ] **Step 4: Correr el test y verificar PASS**

Run: `npm test -- googleOAuthState`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add server/utils/googleOAuthState.js tests/googleOAuthState.test.js
git commit -m "feat: firma HMAC para state del OAuth Google Calendar"
```

---

## Task 5: Builder de payload de evento

**Files:**
- Create: `server/utils/planificadorToGcalEvent.js`
- Test: `tests/planificadorToGcalEvent.test.js`

Convierte una fila de `gastos_planificados` (más opcionalmente un gasto real ligado) al payload que se envía a Google Calendar.

- [ ] **Step 1: Test**

```js
// tests/planificadorToGcalEvent.test.js
import { describe, it, expect } from 'vitest'
import { buildEvent, recordatorioToMinutes } from '../server/utils/planificadorToGcalEvent.js'

const APP_URL = 'http://localhost:3000'

const baseGasto = {
  id: 'plan-1',
  concepto: 'Internet',
  montoEstimado: 150,
  fechaProbablePago: '2026-05-20',
  estado: 'pendiente',
  notas: null,
  categoriaNombre: 'Servicios',
}

const recordatoriosDefault = [
  { tipo: 'dia_anterior', hora: '18:00' },
  { tipo: 'mismo_dia', hora: '09:00' },
]

describe('recordatorioToMinutes', () => {
  it('dia_anterior 18:00 → 360 min', () => {
    expect(recordatorioToMinutes({ tipo: 'dia_anterior', hora: '18:00' })).toBe(360)
  })
  it('dia_anterior 00:00 → 1440 min', () => {
    expect(recordatorioToMinutes({ tipo: 'dia_anterior', hora: '00:00' })).toBe(1440)
  })
  it('dos_dias_antes 12:00 → 2160 min', () => {
    expect(recordatorioToMinutes({ tipo: 'dos_dias_antes', hora: '12:00' })).toBe(2160)
  })
  it('una_semana_antes 09:00 → 9540 min', () => {
    expect(recordatorioToMinutes({ tipo: 'una_semana_antes', hora: '09:00' })).toBe(9540)
  })
  it('mismo_dia siempre → 0 (hora ignorada por all-day)', () => {
    expect(recordatorioToMinutes({ tipo: 'mismo_dia', hora: '09:00' })).toBe(0)
    expect(recordatorioToMinutes({ tipo: 'mismo_dia', hora: '23:59' })).toBe(0)
  })
})

describe('buildEvent (pendiente)', () => {
  const ev = buildEvent({
    gasto: baseGasto,
    moneda: 'S/',
    recordatorios: recordatoriosDefault,
    appUrl: APP_URL,
  })

  it('título con moneda y concepto', () => {
    expect(ev.summary).toBe('S/ 150.00 · Internet')
  })
  it('evento all-day con start/end correctos', () => {
    expect(ev.start.date).toBe('2026-05-20')
    expect(ev.end.date).toBe('2026-05-21')
    expect(ev.start.dateTime).toBeUndefined()
  })
  it('descripción incluye monto, categoría y link', () => {
    expect(ev.description).toContain('Pendiente · S/ 150.00')
    expect(ev.description).toContain('Categoría: Servicios')
    expect(ev.description).toContain(`${APP_URL}/planificador?gasto=plan-1`)
  })
  it('color por defecto (sin colorId)', () => {
    expect(ev.colorId).toBeUndefined()
  })
  it('recordatorios respetan la config', () => {
    expect(ev.reminders.useDefault).toBe(false)
    expect(ev.reminders.overrides).toEqual([
      { method: 'popup', minutes: 360 },
      { method: 'popup', minutes: 0 },
    ])
  })
})

describe('buildEvent (pagado)', () => {
  const gastoPagado = { ...baseGasto, estado: 'pagado' }
  const gastoReal = { id: 'real-1', fecha: '2026-05-22', monto: 148.5 }
  const ev = buildEvent({
    gasto: gastoPagado,
    gastoReal,
    moneda: 'S/',
    recordatorios: recordatoriosDefault,
    appUrl: APP_URL,
  })

  it('título con prefijo PAGADO', () => {
    expect(ev.summary).toBe('✅ PAGADO · S/ 150.00 · Internet')
  })
  it('colorId 2 (sage/verde)', () => {
    expect(ev.colorId).toBe('2')
  })
  it('sin recordatorios', () => {
    expect(ev.reminders).toEqual({ useDefault: false, overrides: [] })
  })
  it('descripción con fecha de pago y monto real', () => {
    expect(ev.description).toContain('Pagado el 2026-05-22')
    expect(ev.description).toContain('Monto real: S/ 148.50')
    expect(ev.description).toContain(`${APP_URL}/registro?gasto=real-1`)
  })
})

describe('buildEvent (notas y bordes)', () => {
  it('incluye notas cuando existen', () => {
    const ev = buildEvent({
      gasto: { ...baseGasto, notas: 'Pagar antes de las 5pm' },
      moneda: 'S/',
      recordatorios: [],
      appUrl: APP_URL,
    })
    expect(ev.description).toContain('Pagar antes de las 5pm')
  })

  it('end.date = fechaProbable + 1 día (formato all-day Google)', () => {
    const ev = buildEvent({
      gasto: { ...baseGasto, fechaProbablePago: '2026-12-31' },
      moneda: 'S/',
      recordatorios: [],
      appUrl: APP_URL,
    })
    expect(ev.end.date).toBe('2027-01-01')
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm test -- planificadorToGcalEvent`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar**

```js
// server/utils/planificadorToGcalEvent.js

export function recordatorioToMinutes({ tipo, hora }) {
  if (tipo === 'mismo_dia') return 0
  const [hStr, mStr] = (hora || '00:00').split(':')
  const h = parseInt(hStr, 10) || 0
  const m = parseInt(mStr, 10) || 0
  const horasAntes = { dia_anterior: 24, dos_dias_antes: 48, una_semana_antes: 168 }
  const baseHoras = horasAntes[tipo]
  if (!baseHoras) return 0
  return (baseHoras - h) * 60 - m
}

function addDays(isoDate, days) {
  const d = new Date(isoDate + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatMonto(n) {
  return Number(n).toFixed(2)
}

export function buildEvent({ gasto, gastoReal = null, moneda = 'S/', recordatorios = [], appUrl = '' }) {
  const monto = formatMonto(gasto.montoEstimado)
  const tituloBase = `${moneda} ${monto} · ${gasto.concepto}`
  const fechaEvento = gasto.fechaProbablePago
  const endDate = addDays(fechaEvento, 1) // all-day events: end = start + 1 día

  const isPagado = gasto.estado === 'pagado' && gastoReal
  const summary = isPagado ? `✅ PAGADO · ${tituloBase}` : tituloBase

  const descPartes = []
  if (isPagado) {
    descPartes.push(`✅ Pagado el ${gastoReal.fecha} · Monto real: ${moneda} ${formatMonto(gastoReal.monto)}`)
  } else {
    descPartes.push(`Pendiente · ${moneda} ${monto}`)
  }
  if (gasto.categoriaNombre) descPartes.push(`Categoría: ${gasto.categoriaNombre}`)
  if (gasto.notas) descPartes.push('', gasto.notas)
  if (appUrl) {
    descPartes.push('')
    if (isPagado) {
      descPartes.push(`Abrir en Mis Finanzas: ${appUrl}/registro?gasto=${gastoReal.id}`)
    } else {
      descPartes.push(`Abrir en Mis Finanzas: ${appUrl}/planificador?gasto=${gasto.id}`)
    }
  }

  const event = {
    summary,
    description: descPartes.join('\n'),
    start: { date: fechaEvento },
    end: { date: endDate },
    reminders: isPagado
      ? { useDefault: false, overrides: [] }
      : {
          useDefault: false,
          overrides: recordatorios.map(r => ({ method: 'popup', minutes: recordatorioToMinutes(r) })),
        },
  }

  if (isPagado) {
    event.colorId = '2' // Sage (verde)
  }

  return event
}
```

- [ ] **Step 4: Correr y verificar PASS**

Run: `npm test -- planificadorToGcalEvent`
Expected: PASS (~15 tests).

- [ ] **Step 5: Commit**

```bash
git add server/utils/planificadorToGcalEvent.js tests/planificadorToGcalEvent.test.js
git commit -m "feat: builder de payload de evento para Google Calendar"
```

---

## Task 6: Wrapper de Google Calendar API (refresh token + helpers)

**Files:**
- Create: `server/utils/googleCalendar.js`
- Test: `tests/googleCalendar.test.js`

Cliente que envuelve las llamadas a Google Calendar API. Maneja: refresh de access token, retry con backoff exponencial en 429, self-heal en 404 sobre eventos.

- [ ] **Step 1: Test (con `vi.mock` para `fetch`)**

```js
// tests/googleCalendar.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

const fetchMock = vi.fn()
global.fetch = fetchMock

let createGcalClient

beforeEach(async () => {
  fetchMock.mockReset()
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
      sleep: () => Promise.resolve(),  // no real delay en test
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
```

- [ ] **Step 2: Correr y verificar fallo**

Run: `npm test -- googleCalendar`
Expected: FAIL.

- [ ] **Step 3: Implementar**

```js
// server/utils/googleCalendar.js

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
    let lastErr
    for (let attempt = 0; attempt <= retries; attempt++) {
      const res = await fetch(url, { ...options, headers })
      if (res.status === 429 || res.status >= 500) {
        if (attempt < retries) {
          await sleep(Math.pow(2, attempt) * 1000)
          continue
        }
      }
      return res
    }
    throw lastErr || new Error('Reintentos agotados')
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
      // Self-heal: recrear
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
```

- [ ] **Step 4: Correr y PASS**

Run: `npm test -- googleCalendar`
Expected: PASS (~10 tests).

- [ ] **Step 5: Commit**

```bash
git add server/utils/googleCalendar.js tests/googleCalendar.test.js
git commit -m "feat: cliente de Google Calendar API con retry y self-heal"
```

---

## Task 7: Helper de auto-sync fire-and-forget

**Files:**
- Create: `server/utils/gcalAutoSync.js`

Este helper carga la conexión del usuario, construye el evento, llama al método correcto del cliente, y captura cualquier error en `ultimoError` sin propagarlo.

- [ ] **Step 1: Crear el archivo**

```js
// server/utils/gcalAutoSync.js
import { db } from './db.js'
import { googleCalendarConexiones, gastosPlanificados, gastos, categorias, configuraciones } from '../database/schema.js'
import { eq, and } from 'drizzle-orm'
import { decrypt } from './crypto.js'
import { createGcalClient, TokenExpiradoError } from './googleCalendar.js'
import { buildEvent } from './planificadorToGcalEvent.js'

async function loadContext(usuarioId) {
  const [conexion] = await db
    .select()
    .from(googleCalendarConexiones)
    .where(eq(googleCalendarConexiones.usuarioId, usuarioId))
    .limit(1)
  if (!conexion) return null

  const config = useRuntimeConfig()
  const refreshToken = decrypt(conexion.refreshTokenCifrado)
  const client = createGcalClient({
    refreshToken,
    clientId: config.googleOAuthClientId,
    clientSecret: config.googleOAuthClientSecret,
  })

  const [cfg] = await db.select({ moneda: configuraciones.monedaPreferida })
    .from(configuraciones).where(eq(configuraciones.usuarioId, usuarioId)).limit(1)
  const moneda = cfg?.moneda === 'USD' ? 'US$' : cfg?.moneda === 'EUR' ? 'EUR' : 'S/'

  return { conexion, client, moneda }
}

async function setUltimoError(usuarioId, msg) {
  try {
    await db.update(googleCalendarConexiones)
      .set({ ultimoError: msg, updatedAt: new Date() })
      .where(eq(googleCalendarConexiones.usuarioId, usuarioId))
  } catch (e) {
    console.error('[gcal] no se pudo guardar ultimoError', e)
  }
}

async function clearUltimoError(usuarioId) {
  await db.update(googleCalendarConexiones)
    .set({ ultimoError: null, ultimaSync: new Date(), updatedAt: new Date() })
    .where(eq(googleCalendarConexiones.usuarioId, usuarioId))
}

async function loadGastoEnriquecido(planificadoId, usuarioId) {
  const [g] = await db
    .select({
      id: gastosPlanificados.id,
      concepto: gastosPlanificados.concepto,
      montoEstimado: gastosPlanificados.montoEstimado,
      fechaProbablePago: gastosPlanificados.fechaProbablePago,
      estado: gastosPlanificados.estado,
      notas: gastosPlanificados.notas,
      googleEventId: gastosPlanificados.googleEventId,
      categoriaNombre: categorias.nombre,
    })
    .from(gastosPlanificados)
    .leftJoin(categorias, eq(gastosPlanificados.categoriaId, categorias.id))
    .where(eq(gastosPlanificados.id, planificadoId))
    .limit(1)
  if (!g) return null

  const [real] = g.estado === 'pagado'
    ? await db.select({ id: gastos.id, fecha: gastos.fecha, monto: gastos.monto })
        .from(gastos)
        .where(and(eq(gastos.gastoPlanificadoId, planificadoId), eq(gastos.usuarioId, usuarioId)))
        .limit(1)
    : [null]

  return {
    gasto: { ...g, montoEstimado: parseFloat(g.montoEstimado) },
    gastoReal: real ? { ...real, monto: parseFloat(real.monto) } : null,
  }
}

function appUrl() {
  return process.env.APP_PUBLIC_URL || ''
}

// Punto de entrada principal: ejecuta `fn` en background sin bloquear.
function fireAndForget(usuarioId, label, fn) {
  Promise.resolve().then(async () => {
    try {
      await fn()
      await clearUltimoError(usuarioId).catch(() => {})
    } catch (err) {
      const msg = err instanceof TokenExpiradoError
        ? 'Token expirado, reconecta tu Google Calendar'
        : `${label}: ${err.message || err}`
      console.error(`[gcal] ${label} usuarioId=${usuarioId}`, err)
      await setUltimoError(usuarioId, msg)
    }
  })
}

export function syncCreated(usuarioId, planificadoId) {
  fireAndForget(usuarioId, 'syncCreated', async () => {
    const ctx = await loadContext(usuarioId)
    if (!ctx) return
    const data = await loadGastoEnriquecido(planificadoId, usuarioId)
    if (!data) return
    const payload = buildEvent({ ...data, moneda: ctx.moneda, recordatorios: ctx.conexion.recordatoriosConfig, appUrl: appUrl() })
    const eventId = await ctx.client.insertEvent(ctx.conexion.calendarId, payload)
    await db.update(gastosPlanificados).set({ googleEventId: eventId }).where(eq(gastosPlanificados.id, planificadoId))
  })
}

export function syncUpdated(usuarioId, planificadoId) {
  fireAndForget(usuarioId, 'syncUpdated', async () => {
    const ctx = await loadContext(usuarioId)
    if (!ctx) return
    const data = await loadGastoEnriquecido(planificadoId, usuarioId)
    if (!data) return
    const payload = buildEvent({ ...data, moneda: ctx.moneda, recordatorios: ctx.conexion.recordatoriosConfig, appUrl: appUrl() })
    const existingId = data.gasto.googleEventId
    if (!existingId) {
      const eventId = await ctx.client.insertEvent(ctx.conexion.calendarId, payload)
      await db.update(gastosPlanificados).set({ googleEventId: eventId }).where(eq(gastosPlanificados.id, planificadoId))
    } else {
      const { id: newId, recreated } = await ctx.client.patchEvent(ctx.conexion.calendarId, existingId, payload)
      if (recreated) {
        await db.update(gastosPlanificados).set({ googleEventId: newId }).where(eq(gastosPlanificados.id, planificadoId))
      }
    }
  })
}

export function syncDeleted(usuarioId, googleEventId) {
  if (!googleEventId) return
  fireAndForget(usuarioId, 'syncDeleted', async () => {
    const ctx = await loadContext(usuarioId)
    if (!ctx) return
    await ctx.client.deleteEvent(ctx.conexion.calendarId, googleEventId)
  })
}
```

- [ ] **Step 2: Agregar `APP_PUBLIC_URL` al `.env.example`**

Agregar al final de la sección Google:

```
# URL pública de la app (para deep links en eventos de calendar).
APP_PUBLIC_URL=http://localhost:3000
```

- [ ] **Step 3: Commit**

```bash
git add server/utils/gcalAutoSync.js .env.example
git commit -m "feat: helper fire-and-forget para auto-sync con Google Calendar"
```

---

## Task 8: Endpoint OAuth start

**Files:**
- Create: `server/api/integraciones/google/oauth-start.post.js`

- [ ] **Step 1: Crear el endpoint**

```js
// server/api/integraciones/google/oauth-start.post.js
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { signState } from '../../../utils/googleOAuthState.js'

const SCOPE = 'https://www.googleapis.com/auth/calendar'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const config = useRuntimeConfig()

  if (!config.googleOAuthClientId || !config.googleOAuthRedirectUri) {
    throw createError({ statusCode: 500, message: 'Google OAuth no configurado en el servidor' })
  }

  const state = signState({ usuarioId })

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', config.googleOAuthClientId)
  url.searchParams.set('redirect_uri', config.googleOAuthRedirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', SCOPE)
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('state', state)

  return { authUrl: url.toString() }
})
```

- [ ] **Step 2: Probar manualmente con curl**

Run:
```bash
curl -X POST http://localhost:3000/api/integraciones/google/oauth-start \
  -H "Authorization: Bearer <token-supabase>" | jq
```

Expected: JSON con `authUrl` que empieza por `https://accounts.google.com/o/oauth2/v2/auth?...`.

- [ ] **Step 3: Commit**

```bash
git add server/api/integraciones/google/oauth-start.post.js
git commit -m "feat: endpoint OAuth start para Google Calendar"
```

---

## Task 9: Endpoint OAuth callback

**Files:**
- Create: `server/api/integraciones/google/oauth-callback.get.js`

Intercambia code por tokens, cifra refresh_token, crea calendario dedicado y guarda la conexión. Después redirige a `/configuraciones?gcal=conectado`.

- [ ] **Step 1: Crear endpoint**

```js
// server/api/integraciones/google/oauth-callback.get.js
import { db } from '../../../utils/db.js'
import { googleCalendarConexiones, gastosPlanificados } from '../../../database/schema.js'
import { verifyState } from '../../../utils/googleOAuthState.js'
import { encrypt } from '../../../utils/crypto.js'
import { createGcalClient } from '../../../utils/googleCalendar.js'
import { eq } from 'drizzle-orm'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const CALENDAR_NOMBRE = 'Mis Finanzas — Gastos planificados'
const DEFAULT_RECORDATORIOS = [
  { tipo: 'dia_anterior', hora: '18:00' },
  { tipo: 'mismo_dia', hora: '09:00' },
]

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = query.code
  const stateToken = query.state
  if (!code || !stateToken) {
    return sendRedirect(event, '/configuraciones?gcal=error&motivo=missing_code')
  }

  let usuarioId
  try {
    const claims = verifyState(stateToken)
    usuarioId = claims.usuarioId
  } catch (e) {
    return sendRedirect(event, '/configuraciones?gcal=error&motivo=state_invalido')
  }

  const config = useRuntimeConfig()

  // Intercambiar code → tokens
  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.googleOAuthClientId,
      client_secret: config.googleOAuthClientSecret,
      redirect_uri: config.googleOAuthRedirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  })
  const tokens = await tokenRes.json()
  if (!tokens.refresh_token) {
    return sendRedirect(event, '/configuraciones?gcal=error&motivo=sin_refresh_token')
  }

  // Crear calendario dedicado
  const client = createGcalClient({
    refreshToken: tokens.refresh_token,
    clientId: config.googleOAuthClientId,
    clientSecret: config.googleOAuthClientSecret,
  })
  const calendar = await client.createCalendar({ summary: CALENDAR_NOMBRE, timeZone: 'America/Lima' })

  // Persistir conexión (upsert)
  const refreshCifrado = encrypt(tokens.refresh_token)
  await db.delete(googleCalendarConexiones).where(eq(googleCalendarConexiones.usuarioId, usuarioId))
  await db.insert(googleCalendarConexiones).values({
    usuarioId,
    refreshTokenCifrado: refreshCifrado,
    calendarId: calendar.id,
    calendarNombre: CALENDAR_NOMBRE,
    recordatoriosConfig: DEFAULT_RECORDATORIOS,
    ultimaSync: new Date(),
  })

  // Limpiar google_event_id obsoletos (de conexiones previas) y disparar primer resync
  await db.update(gastosPlanificados)
    .set({ googleEventId: null })
    .where(eq(gastosPlanificados.googleEventId, gastosPlanificados.googleEventId)) // no-op WHERE intencional; el resync lo hará completo

  return sendRedirect(event, '/configuraciones?gcal=conectado')
})
```

**Nota importante:** el primer resync se dispara desde el frontend al detectar `?gcal=conectado`, llamando al endpoint de resync (Task 11). Esto evita que el callback se bloquee minutos haciendo inserts y permite que el redirect sea inmediato.

- [ ] **Step 2: Commit**

```bash
git add server/api/integraciones/google/oauth-callback.get.js
git commit -m "feat: endpoint callback OAuth Google Calendar"
```

---

## Task 10: Endpoint GET estado de la conexión

**Files:**
- Create: `server/api/integraciones/google/index.get.js`

- [ ] **Step 1: Crear endpoint**

```js
// server/api/integraciones/google/index.get.js
import { db } from '../../../utils/db.js'
import { googleCalendarConexiones } from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const [conexion] = await db
    .select({
      calendarNombre: googleCalendarConexiones.calendarNombre,
      recordatoriosConfig: googleCalendarConexiones.recordatoriosConfig,
      ultimaSync: googleCalendarConexiones.ultimaSync,
      ultimoError: googleCalendarConexiones.ultimoError,
      fechaConexion: googleCalendarConexiones.fechaConexion,
    })
    .from(googleCalendarConexiones)
    .where(eq(googleCalendarConexiones.usuarioId, usuarioId))
    .limit(1)

  if (!conexion) {
    return { conectado: false }
  }
  return { conectado: true, ...conexion }
})
```

- [ ] **Step 2: Commit**

```bash
git add server/api/integraciones/google/index.get.js
git commit -m "feat: endpoint estado de conexión Google Calendar"
```

---

## Task 11: Endpoint POST resync

**Files:**
- Create: `server/api/integraciones/google/resync.post.js`

Diff entre estado local y Google Calendar. Crea/actualiza/borra. Reconstruye el calendario si fue borrado en Google. Devuelve counts.

- [ ] **Step 1: Crear endpoint**

```js
// server/api/integraciones/google/resync.post.js
import { db } from '../../../utils/db.js'
import {
  googleCalendarConexiones, gastosPlanificados, planesMensuales,
  categorias, gastos, configuraciones,
} from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { decrypt } from '../../../utils/crypto.js'
import { createGcalClient, TokenExpiradoError } from '../../../utils/googleCalendar.js'
import { buildEvent } from '../../../utils/planificadorToGcalEvent.js'
import { eq, and, gte } from 'drizzle-orm'

const CALENDAR_NOMBRE = 'Mis Finanzas — Gastos planificados'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const config = useRuntimeConfig()
  const appUrl = process.env.APP_PUBLIC_URL || ''

  const [conexion] = await db
    .select()
    .from(googleCalendarConexiones)
    .where(eq(googleCalendarConexiones.usuarioId, usuarioId))
    .limit(1)
  if (!conexion) {
    throw createError({ statusCode: 400, message: 'No hay conexión con Google Calendar' })
  }

  const client = createGcalClient({
    refreshToken: decrypt(conexion.refreshTokenCifrado),
    clientId: config.googleOAuthClientId,
    clientSecret: config.googleOAuthClientSecret,
  })

  // Verificar que el calendario sigue existiendo en Google
  let calendarId = conexion.calendarId
  let cal = null
  try {
    cal = await client.getCalendar(calendarId)
  } catch (e) {
    if (e instanceof TokenExpiradoError) {
      await db.update(googleCalendarConexiones)
        .set({ ultimoError: 'Token expirado, reconecta tu Google Calendar', updatedAt: new Date() })
        .where(eq(googleCalendarConexiones.usuarioId, usuarioId))
      throw createError({ statusCode: 401, message: 'Token expirado, reconecta' })
    }
    throw e
  }
  if (!cal) {
    // Calendario borrado en Google → recrear y limpiar event IDs
    const nuevo = await client.createCalendar({ summary: CALENDAR_NOMBRE, timeZone: 'America/Lima' })
    calendarId = nuevo.id
    await db.update(googleCalendarConexiones)
      .set({ calendarId, updatedAt: new Date() })
      .where(eq(googleCalendarConexiones.usuarioId, usuarioId))
    await db.update(gastosPlanificados)
      .set({ googleEventId: null })
      .where(eq(gastosPlanificados.googleEventId, gastosPlanificados.googleEventId))
  }

  // Cargar moneda
  const [cfg] = await db.select({ moneda: configuraciones.monedaPreferida })
    .from(configuraciones).where(eq(configuraciones.usuarioId, usuarioId)).limit(1)
  const moneda = cfg?.moneda === 'USD' ? 'US$' : cfg?.moneda === 'EUR' ? 'EUR' : 'S/'

  // Cargar planificados desde el mes actual en adelante
  const hoy = new Date()
  const primerDiaMes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`

  const planificados = await db
    .select({
      id: gastosPlanificados.id,
      concepto: gastosPlanificados.concepto,
      montoEstimado: gastosPlanificados.montoEstimado,
      fechaProbablePago: gastosPlanificados.fechaProbablePago,
      estado: gastosPlanificados.estado,
      notas: gastosPlanificados.notas,
      googleEventId: gastosPlanificados.googleEventId,
      categoriaNombre: categorias.nombre,
      gastoRealId: gastos.id,
      gastoRealFecha: gastos.fecha,
      gastoRealMonto: gastos.monto,
    })
    .from(gastosPlanificados)
    .innerJoin(planesMensuales, eq(gastosPlanificados.planMensualId, planesMensuales.id))
    .leftJoin(categorias, eq(gastosPlanificados.categoriaId, categorias.id))
    .leftJoin(gastos, and(
      eq(gastos.gastoPlanificadoId, gastosPlanificados.id),
      eq(gastos.usuarioId, usuarioId),
    ))
    .where(and(
      eq(planesMensuales.usuarioId, usuarioId),
      gte(gastosPlanificados.fechaProbablePago, primerDiaMes),
    ))

  // Listar eventos actuales del calendario
  const eventos = await client.listEvents(calendarId, { timeMin: `${primerDiaMes}T00:00:00Z` })
  const eventosPorId = new Map(eventos.map(e => [e.id, e]))

  let creados = 0, actualizados = 0, eliminados = 0

  // CREATE/PATCH
  for (const p of planificados) {
    const payload = buildEvent({
      gasto: { ...p, montoEstimado: parseFloat(p.montoEstimado) },
      gastoReal: p.gastoRealId
        ? { id: p.gastoRealId, fecha: p.gastoRealFecha, monto: parseFloat(p.gastoRealMonto) }
        : null,
      moneda,
      recordatorios: conexion.recordatoriosConfig,
      appUrl,
    })
    if (p.googleEventId && eventosPorId.has(p.googleEventId)) {
      const { recreated, id: newId } = await client.patchEvent(calendarId, p.googleEventId, payload)
      if (recreated) {
        await db.update(gastosPlanificados).set({ googleEventId: newId }).where(eq(gastosPlanificados.id, p.id))
      }
      eventosPorId.delete(p.googleEventId)
      actualizados++
    } else {
      const newId = await client.insertEvent(calendarId, payload)
      await db.update(gastosPlanificados).set({ googleEventId: newId }).where(eq(gastosPlanificados.id, p.id))
      creados++
    }
  }

  // DELETE huérfanos (eventos en Google sin planificado local que los reclame)
  for (const [eventId] of eventosPorId) {
    await client.deleteEvent(calendarId, eventId)
    eliminados++
  }

  await db.update(googleCalendarConexiones)
    .set({ ultimaSync: new Date(), ultimoError: null, updatedAt: new Date() })
    .where(eq(googleCalendarConexiones.usuarioId, usuarioId))

  return { creados, actualizados, eliminados }
})
```

- [ ] **Step 2: Commit**

```bash
git add server/api/integraciones/google/resync.post.js
git commit -m "feat: endpoint resync para Google Calendar"
```

---

## Task 12: Endpoint PATCH config (recordatorios)

**Files:**
- Create: `server/api/integraciones/google/config.patch.js`

- [ ] **Step 1: Crear endpoint**

```js
// server/api/integraciones/google/config.patch.js
import { db } from '../../../utils/db.js'
import { googleCalendarConexiones, gastosPlanificados } from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { decrypt } from '../../../utils/crypto.js'
import { createGcalClient } from '../../../utils/googleCalendar.js'
import { recordatorioToMinutes } from '../../../utils/planificadorToGcalEvent.js'
import { eq, and, isNotNull, ne } from 'drizzle-orm'

const TIPOS = new Set(['mismo_dia', 'dia_anterior', 'dos_dias_antes', 'una_semana_antes'])

function validar(recordatorios) {
  if (!Array.isArray(recordatorios)) throw createError({ statusCode: 400, message: 'recordatorios debe ser un array' })
  if (recordatorios.length > 5) throw createError({ statusCode: 400, message: 'Máximo 5 recordatorios' })
  for (const r of recordatorios) {
    if (!TIPOS.has(r.tipo)) throw createError({ statusCode: 400, message: `tipo inválido: ${r.tipo}` })
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.hora || '')) {
      throw createError({ statusCode: 400, message: `hora inválida: ${r.hora}` })
    }
  }
}

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const body = await readBody(event)
  validar(body.recordatorios)

  const [conexion] = await db.select().from(googleCalendarConexiones)
    .where(eq(googleCalendarConexiones.usuarioId, usuarioId)).limit(1)
  if (!conexion) throw createError({ statusCode: 400, message: 'No hay conexión' })

  await db.update(googleCalendarConexiones)
    .set({ recordatoriosConfig: body.recordatorios, updatedAt: new Date() })
    .where(eq(googleCalendarConexiones.usuarioId, usuarioId))

  // Re-aplicar recordatorios a eventos NO pagados (estado != 'pagado')
  const pendientes = await db.select({
    id: gastosPlanificados.id,
    googleEventId: gastosPlanificados.googleEventId,
  })
    .from(gastosPlanificados)
    .innerJoin(/* planesMensuales para filtrar por usuario, importar arriba */ null, null) // placeholder — ver implementación abajo

  // Implementación real: hacer query con join a planes_mensuales para filtrar por usuario
  // y estado = 'pendiente'. Por brevedad aquí, ver implementación final en el commit.

  const config = useRuntimeConfig()
  const client = createGcalClient({
    refreshToken: decrypt(conexion.refreshTokenCifrado),
    clientId: config.googleOAuthClientId,
    clientSecret: config.googleOAuthClientSecret,
  })

  const overrides = body.recordatorios.map(r => ({ method: 'popup', minutes: recordatorioToMinutes(r) }))
  let actualizados = 0
  for (const p of pendientes) {
    if (!p.googleEventId) continue
    try {
      await client.patchEvent(conexion.calendarId, p.googleEventId, {
        reminders: { useDefault: false, overrides },
      })
      actualizados++
    } catch (e) {
      console.error('[gcal] config patch fallo para', p.id, e)
    }
  }

  return { ok: true, actualizados }
})
```

**Step 1.1 — fix del query con join**: Reemplazar el bloque `pendientes = await db.select(...)` por:

```js
const pendientes = await db
  .select({
    id: gastosPlanificados.id,
    googleEventId: gastosPlanificados.googleEventId,
  })
  .from(gastosPlanificados)
  .innerJoin(planesMensuales, eq(gastosPlanificados.planMensualId, planesMensuales.id))
  .where(and(
    eq(planesMensuales.usuarioId, usuarioId),
    eq(gastosPlanificados.estado, 'pendiente'),
    isNotNull(gastosPlanificados.googleEventId),
  ))
```

Y agregar el import `planesMensuales` en la parte superior.

- [ ] **Step 2: Commit**

```bash
git add server/api/integraciones/google/config.patch.js
git commit -m "feat: endpoint PATCH config de recordatorios Google Calendar"
```

---

## Task 13: Endpoint DELETE desconectar

**Files:**
- Create: `server/api/integraciones/google/index.delete.js`

- [ ] **Step 1: Crear endpoint**

```js
// server/api/integraciones/google/index.delete.js
import { db } from '../../../utils/db.js'
import { googleCalendarConexiones, gastosPlanificados, planesMensuales } from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { decrypt } from '../../../utils/crypto.js'
import { createGcalClient } from '../../../utils/googleCalendar.js'
import { eq, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const query = getQuery(event)
  const borrarCalendario = query.borrarCalendario === 'true'

  const [conexion] = await db.select().from(googleCalendarConexiones)
    .where(eq(googleCalendarConexiones.usuarioId, usuarioId)).limit(1)
  if (!conexion) return { ok: true, sinAccion: true }

  if (borrarCalendario) {
    const config = useRuntimeConfig()
    try {
      const client = createGcalClient({
        refreshToken: decrypt(conexion.refreshTokenCifrado),
        clientId: config.googleOAuthClientId,
        clientSecret: config.googleOAuthClientSecret,
      })
      await client.deleteCalendar(conexion.calendarId)
    } catch (e) {
      // No bloquear desconexión si Google falla — el usuario quiere desconectar
      console.error('[gcal] deleteCalendar falló', e)
    }
  }

  // Limpiar IDs en planificados del usuario
  const planes = await db.select({ id: planesMensuales.id }).from(planesMensuales)
    .where(eq(planesMensuales.usuarioId, usuarioId))
  if (planes.length) {
    await db.update(gastosPlanificados)
      .set({ googleEventId: null })
      .where(inArray(gastosPlanificados.planMensualId, planes.map(p => p.id)))
  }

  await db.delete(googleCalendarConexiones).where(eq(googleCalendarConexiones.usuarioId, usuarioId))

  return { ok: true }
})
```

- [ ] **Step 2: Commit**

```bash
git add server/api/integraciones/google/index.delete.js
git commit -m "feat: endpoint DELETE desconectar Google Calendar"
```

---

## Task 14: Hooks de auto-sync en endpoints del planificador

**Files:**
- Modify: `server/api/planificador/gastos/index.post.js`
- Modify: `server/api/planificador/gastos/[id].put.js`
- Modify: `server/api/planificador/gastos/[id].delete.js`
- Modify: `server/api/planificador/gastos/[id]/registro.post.js`

- [ ] **Step 1: Hook en CREATE (`index.post.js`)**

Después del `await db.insert(...).returning()` y antes del `return`, agregar:

```js
import { syncCreated } from '../../../utils/gcalAutoSync.js'

// ... existing code ...

// Antes del return final:
syncCreated(usuarioId, nuevoGasto.id)
```

(Ajustar nombre de la variable según se llame el insert. `syncCreated` se llama sin `await` — es fire-and-forget.)

- [ ] **Step 2: Hook en UPDATE (`[id].put.js`)**

Después del `await db.update(...)` exitoso:

```js
import { syncUpdated } from '../../../utils/gcalAutoSync.js'

// Antes del return final:
syncUpdated(usuarioId, id)
```

- [ ] **Step 3: Hook en DELETE (`[id].delete.js`)**

Antes del `await db.delete(...)`, capturar el `googleEventId`:

```js
import { syncDeleted } from '../../../utils/gcalAutoSync.js'

// Justo antes del delete:
const [planLeido] = await db
  .select({ googleEventId: gastosPlanificados.googleEventId })
  .from(gastosPlanificados)
  .where(eq(gastosPlanificados.id, id))
  .limit(1)

// ... delete query ...

// Después del delete exitoso (antes del return):
syncDeleted(usuarioId, planLeido?.googleEventId)
```

- [ ] **Step 4: Hook en MARCAR PAGADO (`[id]/registro.post.js`)**

Después de la transacción que marca `estado: 'pagado'`:

```js
import { syncUpdated } from '../../../../utils/gcalAutoSync.js'

// Antes del return final:
syncUpdated(usuarioId, gastoPlanificado.id)
```

- [ ] **Step 5: Smoke test manual**

Levantar dev server: `npm run dev`. Sin conexión a Google Calendar configurada todavía:
1. Crear un gasto planificado desde la UI → debe persistir normalmente; `gcalAutoSync` sale temprano por `loadContext` devolviendo null.
2. Editar el gasto → mismo comportamiento.
3. Borrar el gasto → mismo comportamiento.

No deben aparecer errores en consola del servidor (los `console.error('[gcal] ...')` solo aparecerían si hubiera conexión y fallara).

- [ ] **Step 6: Commit**

```bash
git add server/api/planificador/gastos/
git commit -m "feat: hooks de auto-sync con Google Calendar en CRUD del planificador"
```

---

## Task 15: Composable cliente `useGoogleCalendar.js`

**Files:**
- Create: `composables/useGoogleCalendar.js`

- [ ] **Step 1: Crear el composable**

```js
// composables/useGoogleCalendar.js
export function useGoogleCalendar() {
  const { apiFetch } = useApiFetch()
  const estado = useState('gcal-estado', () => ({ conectado: false, loading: true }))

  async function fetchEstado() {
    estado.value.loading = true
    try {
      const data = await apiFetch('/api/integraciones/google')
      estado.value = { ...data, loading: false }
    } catch (e) {
      estado.value = { conectado: false, loading: false, error: e.message }
    }
  }

  async function conectar() {
    const { authUrl } = await apiFetch('/api/integraciones/google/oauth-start', { method: 'POST' })
    window.location.href = authUrl
  }

  async function desconectar(borrarCalendario = false) {
    await apiFetch(`/api/integraciones/google?borrarCalendario=${borrarCalendario}`, { method: 'DELETE' })
    await fetchEstado()
  }

  async function resincronizar() {
    const result = await apiFetch('/api/integraciones/google/resync', { method: 'POST' })
    await fetchEstado()
    return result
  }

  async function actualizarRecordatorios(recordatorios) {
    const result = await apiFetch('/api/integraciones/google/config', {
      method: 'PATCH',
      body: { recordatorios },
    })
    await fetchEstado()
    return result
  }

  return { estado, fetchEstado, conectar, desconectar, resincronizar, actualizarRecordatorios }
}
```

- [ ] **Step 2: Commit**

```bash
git add composables/useGoogleCalendar.js
git commit -m "feat: composable useGoogleCalendar"
```

---

## Task 16: Componente `EditorRecordatorios.vue`

**Files:**
- Create: `components/configuraciones/EditorRecordatorios.vue`

Lista editable de recordatorios. Sigue los patrones visuales de `pages/configuraciones.vue` (bg-theme-input, bordes, etc.).

- [ ] **Step 1: Crear el componente**

```vue
<template>
  <div class="space-y-2">
    <div
      v-for="(r, i) in modelo"
      :key="i"
      class="flex items-center gap-2 bg-theme-input border border-theme-border rounded-xl px-3 py-2"
    >
      <select
        :value="r.tipo"
        class="bg-transparent text-sm text-theme-text focus:outline-none flex-1 min-w-0"
        @change="actualizar(i, 'tipo', $event.target.value)"
      >
        <option value="mismo_dia">Mismo día</option>
        <option value="dia_anterior">Día anterior</option>
        <option value="dos_dias_antes">Dos días antes</option>
        <option value="una_semana_antes">Una semana antes</option>
      </select>

      <input
        v-if="r.tipo !== 'mismo_dia'"
        type="time"
        :value="r.hora"
        class="bg-transparent text-sm text-theme-text focus:outline-none w-20"
        @change="actualizar(i, 'hora', $event.target.value)"
      />
      <span
        v-else
        class="text-xs text-theme-text-sec flex items-center gap-1"
        :title="tooltipMismoDia"
      >
        hora global ⓘ
      </span>

      <button
        class="text-theme-text-muted hover:text-red-400 transition-colors p-1"
        :aria-label="`Eliminar recordatorio ${i + 1}`"
        @click="eliminar(i)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
        </svg>
      </button>
    </div>

    <button
      v-if="modelo.length < 5"
      class="w-full bg-theme-input border border-dashed border-theme-border rounded-xl px-3 py-2 text-sm text-theme-text-sec hover:text-theme-accent transition-colors"
      @click="agregar"
    >
      + Agregar recordatorio
    </button>

    <div class="flex justify-end gap-2 pt-2">
      <button
        class="text-xs text-theme-text-sec hover:text-theme-text px-3 py-1.5"
        :disabled="!cambios || guardando"
        @click="cancelar"
      >
        Cancelar
      </button>
      <button
        class="bg-theme-accent text-theme-on-accent rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-40 transition-colors"
        :disabled="!cambios || guardando"
        @click="guardar"
      >
        {{ guardando ? 'Guardando...' : 'Guardar' }}
      </button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  recordatorios: { type: Array, required: true },
})
const emit = defineEmits(['guardar'])

const tooltipMismoDia = 'El recordatorio del mismo día llega según la hora global de tu Google Calendar. Para una hora exacta, usa un recordatorio del día anterior.'

const modelo = ref(JSON.parse(JSON.stringify(props.recordatorios)))
const guardando = ref(false)

const cambios = computed(() => JSON.stringify(modelo.value) !== JSON.stringify(props.recordatorios))

function actualizar(i, campo, valor) {
  modelo.value[i] = { ...modelo.value[i], [campo]: valor }
}

function agregar() {
  modelo.value.push({ tipo: 'dia_anterior', hora: '18:00' })
}

function eliminar(i) {
  modelo.value.splice(i, 1)
}

function cancelar() {
  modelo.value = JSON.parse(JSON.stringify(props.recordatorios))
}

async function guardar() {
  guardando.value = true
  try {
    await emit('guardar', modelo.value)
  } finally {
    guardando.value = false
  }
}

watch(() => props.recordatorios, (nuevo) => {
  if (!cambios.value) modelo.value = JSON.parse(JSON.stringify(nuevo))
}, { deep: true })
</script>
```

- [ ] **Step 2: Commit**

```bash
git add components/configuraciones/EditorRecordatorios.vue
git commit -m "feat: componente EditorRecordatorios"
```

---

## Task 17: Componente `IntegracionGoogleCalendar.vue`

**Files:**
- Create: `components/configuraciones/IntegracionGoogleCalendar.vue`

Card principal. Muestra los dos estados (desconectado / conectado), banner de error si aplica, botones de acción.

- [ ] **Step 1: Crear el componente**

```vue
<template>
  <div class="bg-theme-card rounded-2xl p-5 border border-theme-border">
    <!-- Header -->
    <div class="flex items-center gap-2 mb-1">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <label class="text-sm font-medium text-theme-text flex-1">Google Calendar</label>
      <span
        v-if="estado.conectado && !estado.ultimoError"
        class="flex items-center gap-1 text-[10px] text-emerald-400"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Conectado
      </span>
      <span
        v-else-if="estado.conectado && estado.ultimoError"
        class="flex items-center gap-1 text-[10px] text-red-400"
        :title="estado.ultimoError"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-red-400"></span> Error
      </span>
    </div>

    <p v-if="!estado.conectado" class="text-xs text-theme-text-sec mb-3">
      Sincroniza tus gastos planificados con tu calendario para recibir recordatorios el día que toca pagar.
    </p>

    <!-- Desconectado -->
    <button
      v-if="!estado.conectado && !estado.loading"
      class="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
      :disabled="conectando"
      @click="onConectar"
    >
      {{ conectando ? 'Abriendo Google...' : 'Conectar Google Calendar' }}
    </button>

    <!-- Conectado -->
    <div v-else-if="estado.conectado" class="space-y-3">
      <!-- Banner de token expirado -->
      <div
        v-if="estado.ultimoError && estado.ultimoError.toLowerCase().includes('expirado')"
        class="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-300"
      >
        <p class="font-semibold mb-1">Conexión expirada</p>
        <p class="mb-2">Tu acceso a Google Calendar caducó. Reconecta para reanudar la sincronización.</p>
        <button
          class="bg-red-500 hover:bg-red-600 text-white rounded-lg px-3 py-1 text-xs font-semibold transition-colors"
          @click="onConectar"
        >
          Reconectar
        </button>
      </div>

      <div class="text-xs text-theme-text-sec">
        <p>Calendario: <span class="text-theme-text">{{ estado.calendarNombre }}</span></p>
        <p>Última sync: {{ ultimaSyncTexto }}</p>
      </div>

      <div>
        <p class="text-xs text-theme-text font-medium mb-2">Recordatorios</p>
        <ConfiguracionesEditorRecordatorios
          :recordatorios="estado.recordatoriosConfig"
          @guardar="onGuardarRecordatorios"
        />
      </div>

      <div class="flex gap-2 pt-1">
        <button
          class="flex-1 bg-theme-input border border-theme-border hover:border-theme-accent rounded-xl px-3 py-2 text-xs font-semibold transition-colors"
          :disabled="sincronizando"
          @click="onResincronizar"
        >
          {{ sincronizando ? 'Sincronizando...' : 'Sincronizar ahora' }}
        </button>
        <button
          class="bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl px-3 py-2 text-xs font-semibold transition-colors"
          @click="onDesconectar"
        >
          Desconectar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const { estado, fetchEstado, conectar, desconectar, resincronizar, actualizarRecordatorios } = useGoogleCalendar()
const { showToast } = useToast()
const { confirm } = useConfirmDialog()
const route = useRoute()
const router = useRouter()

const conectando = ref(false)
const sincronizando = ref(false)

const ultimaSyncTexto = computed(() => {
  if (!estado.value.ultimaSync) return 'nunca'
  const diff = Date.now() - new Date(estado.value.ultimaSync).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'hace unos segundos'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  return new Date(estado.value.ultimaSync).toLocaleDateString('es-PE')
})

async function onConectar() {
  conectando.value = true
  try {
    await conectar()
  } catch (e) {
    showToast({ tipo: 'error', mensaje: 'No se pudo iniciar la conexión: ' + e.message })
    conectando.value = false
  }
}

async function onResincronizar() {
  sincronizando.value = true
  try {
    const r = await resincronizar()
    showToast({ tipo: 'exito', mensaje: `Sincronizado · ${r.creados} creados, ${r.actualizados} actualizados, ${r.eliminados} eliminados` })
  } catch (e) {
    showToast({ tipo: 'error', mensaje: 'Error al sincronizar: ' + e.message })
  } finally {
    sincronizando.value = false
  }
}

async function onDesconectar() {
  const opcion = await confirm({
    titulo: 'Desconectar Google Calendar',
    mensaje: '¿Eliminar también el calendario "Mis Finanzas — Gastos planificados" de Google?',
    opciones: [
      { id: 'borrar', label: 'Sí, borrar todo', destructive: true },
      { id: 'solo', label: 'Solo desconectar', destructive: false },
    ],
  })
  if (!opcion || opcion === 'cancel') return
  await desconectar(opcion === 'borrar')
  showToast({ tipo: 'exito', mensaje: 'Desconectado de Google Calendar' })
}

async function onGuardarRecordatorios(recordatorios) {
  try {
    const r = await actualizarRecordatorios(recordatorios)
    showToast({ tipo: 'exito', mensaje: `Recordatorios guardados · aplicados a ${r.actualizados} eventos` })
  } catch (e) {
    showToast({ tipo: 'error', mensaje: 'Error al guardar: ' + e.message })
  }
}

// Reaccionar al callback OAuth
onMounted(async () => {
  await fetchEstado()
  if (route.query.gcal === 'conectado') {
    showToast({ tipo: 'exito', mensaje: 'Google Calendar conectado · sincronizando...' })
    router.replace({ query: { ...route.query, gcal: undefined } })
    onResincronizar()
  } else if (route.query.gcal === 'error') {
    showToast({ tipo: 'error', mensaje: `Conexión fallida: ${route.query.motivo || 'desconocido'}` })
    router.replace({ query: { ...route.query, gcal: undefined, motivo: undefined } })
  }
})
</script>
```

**Nota sobre dependencias del componente**: usa `useToast` y `useConfirmDialog`. Verificar que ambos existen en el proyecto antes de continuar:
- `composables/useToast.js` o similar (revisar `components/shared/ToastNotification.vue`).
- `composables/useConfirmDialog.js` o `components/shared/ConfirmDialog.vue`.

Si la API del `confirm` actual sólo soporta sí/no en vez de múltiples opciones (probable), ajustar a un flujo de dos pasos: 1) primer confirm "¿Desconectar?", 2) si sí, segundo confirm "¿Borrar también el calendario?". Modificar `onDesconectar` así:

```js
async function onDesconectar() {
  const ok = await confirm({
    titulo: 'Desconectar Google Calendar',
    mensaje: 'Dejarás de recibir recordatorios. ¿Continuar?',
  })
  if (!ok) return
  const borrar = await confirm({
    titulo: '¿Borrar también el calendario en Google?',
    mensaje: 'Esto elimina "Mis Finanzas — Gastos planificados" y todos sus eventos de tu cuenta de Google. Si dices "No", el calendario queda intacto pero ya no se actualizará desde la app.',
    confirmLabel: 'Sí, borrarlo',
    cancelLabel: 'No, mantenerlo',
  })
  await desconectar(borrar)
  showToast({ tipo: 'exito', mensaje: 'Desconectado de Google Calendar' })
}
```

- [ ] **Step 2: Commit**

```bash
git add components/configuraciones/IntegracionGoogleCalendar.vue
git commit -m "feat: componente IntegracionGoogleCalendar"
```

---

## Task 18: Integrar la sección "Integraciones" en `pages/configuraciones.vue`

**Files:**
- Modify: `pages/configuraciones.vue`

- [ ] **Step 1: Agregar la sección al final del grid de opciones**

Buscar el cierre del `<template v-else>` (donde están todos los cards de configuración). Justo antes de ese `</template>`, agregar:

```vue
        <!-- Integraciones -->
        <div class="lg:col-span-2">
          <h2 class="text-sm font-semibold text-theme-text-sec uppercase tracking-wider mb-3 px-1">
            Integraciones
          </h2>
        </div>
        <ConfiguracionesIntegracionGoogleCalendar />
```

(La altura `lg:col-span-2` del título mantiene el subtítulo a ancho completo en desktop. El componente toma 1 columna como el resto de cards.)

- [ ] **Step 2: Smoke test manual**

Run: `npm run dev`. Ir a `/configuraciones`. Verificar:
- Aparece el subtítulo "Integraciones".
- Aparece el card "Google Calendar" con el botón "Conectar Google Calendar" (estado desconectado).
- Si haces click sin haber configurado las env vars: aparece un toast de error claro.

- [ ] **Step 3: Commit**

```bash
git add pages/configuraciones.vue
git commit -m "feat: sección de Integraciones en Configuraciones"
```

---

## Task 19: Entrada "Sincronizar con Google Calendar" en menú del Planificador

**Files:**
- Modify: `components/planificador/ResumenMes.vue`

Buscar el menú "..." que ya tiene la opción "Exportar a Excel". Agregar una entrada condicional que aparezca solo si la conexión está activa.

- [ ] **Step 1: Inyectar el composable y agregar la entrada**

En el `<script setup>` de `ResumenMes.vue`, agregar (si no está ya):

```js
const { estado: gcalEstado, fetchEstado: fetchGcalEstado, resincronizar: gcalResincronizar } = useGoogleCalendar()
const { showToast } = useToast()

onMounted(() => {
  if (!gcalEstado.value || gcalEstado.value.loading) fetchGcalEstado()
})

async function onSincronizarGcal() {
  try {
    const r = await gcalResincronizar()
    showToast({ tipo: 'exito', mensaje: `Sincronizado · ${r.creados} creados, ${r.actualizados} actualizados, ${r.eliminados} eliminados` })
  } catch (e) {
    showToast({ tipo: 'error', mensaje: 'Error al sincronizar: ' + e.message })
  }
}
```

En el `<template>` del menú "...", junto a "Exportar a Excel":

```vue
<button
  v-if="gcalEstado.conectado"
  class="w-full text-left px-3 py-2 text-sm text-theme-text hover:bg-theme-input transition-colors flex items-center gap-2"
  @click="onSincronizarGcal"
>
  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
  Sincronizar con Google Calendar
</button>
```

- [ ] **Step 2: Smoke test**

1. Sin conexión: la entrada NO debe aparecer en el menú.
2. Con conexión: la entrada aparece y al pulsarla, dispara un resync.

- [ ] **Step 3: Commit**

```bash
git add components/planificador/ResumenMes.vue
git commit -m "feat: opción Sincronizar con Google Calendar en ResumenMes"
```

---

## Task 20: Pruebas E2E manuales con cuenta de Google real

**Files:** ninguna (es checklist de verificación manual).

Antes de empezar:
- Crear un proyecto en https://console.cloud.google.com.
- Habilitar Google Calendar API.
- Crear credenciales OAuth tipo "Web application" con redirect URI `http://localhost:3000/api/integraciones/google/oauth-callback`.
- Copiar Client ID + Client Secret al `.env` local.
- Generar `ENCRYPTION_KEY`: `openssl rand -base64 32`.
- Reiniciar `npm run dev`.

Checklist:

- [ ] **a)** Ir a `/configuraciones`, sección Integraciones. Click "Conectar Google Calendar". Aceptar el consent. Esperar redirect.
- [ ] **b)** Verificar en Google Calendar (calendar.google.com) que aparece un calendario nuevo "Mis Finanzas — Gastos planificados".
- [ ] **c)** Crear un gasto planificado para mañana en `/planificador`. Verificar en Google Calendar que aparece como evento all-day el día siguiente, con título `S/ XXX.00 · concepto`.
- [ ] **d)** Editar el monto del planificado. Verificar que el título del evento se actualiza en Google.
- [ ] **e)** Marcar como pagado. Verificar que el evento queda verde con prefijo `✅ PAGADO` y sin recordatorios.
- [ ] **f)** Borrar un planificado. Verificar que el evento desaparece de Google.
- [ ] **g)** En Configuraciones, agregar un recordatorio "Una semana antes 09:00", guardar. Verificar que los eventos pendientes ahora tienen ese recordatorio extra.
- [ ] **h)** Click "Sincronizar ahora" → toast con counts.
- [ ] **i)** Borrar el calendario directamente en Google Calendar (con la mano). Volver a la app, click "Sincronizar ahora". Verificar que se recrea el calendario y aparecen todos los eventos.
- [ ] **j)** Desde la app, click "Desconectar Google Calendar" → "Sí, borrar todo". Verificar en Google que el calendario desaparece.
- [ ] **k)** Reconectar. Verificar que se crea un nuevo calendario y se re-sincroniza todo.
- [ ] **l)** Revocar el acceso desde myaccount.google.com/permissions. Volver a la app y forzar un edit → verificar que el badge cambia a "● Error" y el banner "Conexión expirada" se muestra. Click "Reconectar" → reanudar normal.

---

## Self-review

### 1. Cobertura del spec

| Sección spec | Tarea(s) que lo cubre |
|---|---|
| §2 decisiones (todas) | distribuidas en T3 (esquema), T5 (formato), T8/9 (OAuth), T11 (resync), T13 (desconectar) |
| §3.1 OAuth flow | T8 (start) + T9 (callback) |
| §3.2 endpoints + utils + hooks | T6, T7, T8–13, T14 |
| §3.3 modelo de datos | T3 |
| §3.4 formato evento | T5 |
| §4.1 conectar | T8, T9, T17 (UI), T20 (E2E) |
| §4.2 sync auto | T7 (helper), T14 (hooks) |
| §4.3 resync | T11 |
| §4.4 cambiar recordatorios | T12 + T16 (editor) |
| §4.5 desconectar | T13 + T17 (UI con ConfirmDialog) |
| §5 UI configuraciones | T16, T17, T18 |
| §5.2 menú "..." planificador | T19 |
| §6 manejo de errores | T6 (retry+404+token), T7 (ultimoError), T11 (calendar 404 self-heal), T17 (banner error) |
| §7 seguridad | T1 (crypto), T4 (state HMAC), T2 (vars solo en server) |
| §8 vars de entorno | T2 |
| §11 plan de rollout | tareas en el mismo orden |

### 2. Placeholder scan
- T12 tenía un placeholder en el bloque del query (`/* placeholder */`). Fix incluido en Step 1.1 con el query completo.
- No quedan TBD/TODO ni "implementar después".

### 3. Consistencia de tipos
- `googleEventId` (camelCase en JS / `google_event_id` en SQL) usado consistentemente en T3, T6, T7, T9, T11, T13, T14.
- `recordatoriosConfig` array de `{tipo, hora}` consistente entre T3 (schema), T5 (builder), T9 (default), T12 (validador), T16 (UI).
- `tipo ∈ {mismo_dia, dia_anterior, dos_dias_antes, una_semana_antes}` consistente entre T5 (test+impl), T12 (validador), T16 (UI dropdown).
- API del cliente Gcal: `createCalendar`, `deleteCalendar`, `getCalendar`, `insertEvent`, `patchEvent`, `deleteEvent`, `listEvents` consistentes entre T6 (impl) y T7/T11/T13 (consumidores).

No se detectan inconsistencias.
