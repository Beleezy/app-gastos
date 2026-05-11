# Integración con Google Calendar para gastos planificados

**Fecha:** 2026-05-11
**Módulo afectado:** Planificador + Configuraciones
**Tipo:** Feature nueva (integración externa)

## 1. Resumen

Permitir al usuario sincronizar sus `gastos_planificados` con un calendario dedicado en su cuenta de Google Calendar, de modo que reciba recordatorios automáticos los días en que toca pagar. La sincronización es **unidireccional**: la app empuja a Google, pero no recibe cambios desde Google. Se mantiene viva automáticamente con cada operación CRUD sobre planificados, con un botón de "Resincronizar" como escape ante desincronizaciones.

## 2. Decisiones de diseño (resumen)

| Tema | Decisión |
|---|---|
| Nivel de integración | Google Calendar API directa con OAuth propio (no Supabase OAuth) |
| Modo de sync | Híbrido: automático en cada cambio + botón "Resincronizar ahora" |
| Estado pagado | Evento conservado, color verde, prefijo `✅ PAGADO`, recordatorios eliminados, descripción enriquecida |
| Calendario destino | Calendario dedicado creado por la app: "Mis Finanzas — Gastos planificados" |
| Formato del evento | Todo el día, recordatorios configurables (default: día anterior 18:00 + mismo día 09:00) |
| Rango de meses | Mes actual + todos los meses futuros que ya tengan planificados (no backfill de pasado) |
| Persistencia OAuth | Refresh token cifrado (AES-256-GCM) en tabla nueva `google_calendar_conexiones` |
| Vínculo evento↔planificado | Columna nueva `google_event_id` en `gastos_planificados` |

## 3. Arquitectura

### 3.1 Flujo OAuth

El login de la app (Supabase Google OAuth) y la autorización de Calendar son **flujos separados**:

1. Login con Supabase autentica al usuario en la app (scope: `email profile`).
2. Conectar Google Calendar abre un **segundo OAuth flow propio** con un cliente OAuth de Google nativo:
   - Scope: `https://www.googleapis.com/auth/calendar`
   - `access_type=offline` (para obtener refresh token persistente)
   - `prompt=consent` (forzar refresh token nuevo cada vez)
3. Callback intercambia el `code` por `access_token + refresh_token`, cifra el refresh token y lo guarda en `google_calendar_conexiones`.

Justificación: Supabase no persiste el `provider_refresh_token` de Google de forma confiable, y agregar el scope de Calendar al login forzaría reloguear a todos los usuarios. El flujo separado es más limpio y desacopla autenticación de autorización.

### 3.2 Componentes nuevos

**Cliente (composables y componentes):**
- [composables/useGoogleCalendar.js](composables/useGoogleCalendar.js) — wraps llamadas a `/api/integraciones/google/*`, expone `estado`, `conectar()`, `desconectar()`, `resincronizar()`, `actualizarRecordatorios()`.
- [components/configuraciones/IntegracionGoogleCalendar.vue](components/configuraciones/IntegracionGoogleCalendar.vue) — card en pages/configuraciones con los dos estados (desconectado / conectado).
- [components/configuraciones/EditorRecordatorios.vue](components/configuraciones/EditorRecordatorios.vue) — lista editable de recordatorios (hasta 5), cada uno con tipo y hora.

**Servidor:**
- [server/utils/googleCalendar.js](server/utils/googleCalendar.js) — wrapper de Google Calendar API: refresh de access_token, retry con backoff, batch requests, manejo de errores específicos (404, 401/invalid_grant, 429).
- [server/utils/crypto.js](server/utils/crypto.js) — `encrypt(plaintext)` / `decrypt(ciphertext)` con AES-256-GCM. Lee `ENCRYPTION_KEY` de `runtimeConfig`. Falla al arrancar si no está definida.
- [server/utils/planificadorToGcalEvent.js](server/utils/planificadorToGcalEvent.js) — convierte una fila de `gastos_planificados` (+ gasto real si está pagado) al payload de evento de Google Calendar (título, descripción, fecha, color, recordatorios).

**Endpoints API:**
- `POST /api/integraciones/google/oauth-start` → devuelve la URL de autorización de Google con `state` aleatorio firmado.
- `GET  /api/integraciones/google/oauth-callback` → valida `state`, intercambia `code`, cifra refresh_token, crea el calendario dedicado, hace primer push de eventos, redirige a `/configuraciones?gcal=conectado`.
- `GET  /api/integraciones/google` → devuelve estado actual (conectado/desconectado, ultimaSync, ultimoError, recordatoriosConfig, calendarNombre).
- `POST /api/integraciones/google/resync` → diff completo entre estado local y eventos en Google; aplica creates/patches/deletes.
- `PATCH /api/integraciones/google/config` → body: `{ recordatorios: [...] }`. Guarda y re-patchea recordatorios en todos los eventos pendientes.
- `DELETE /api/integraciones/google?borrarCalendario=true|false` → desconecta y opcionalmente borra el calendario en Google.

**Hooks de auto-sync** en endpoints existentes del planificador:
- `POST /api/planificador/gastos` → crea evento (fire-and-forget).
- `PATCH /api/planificador/gastos/:id` → patchea evento.
- `DELETE /api/planificador/gastos/:id` → borra evento.
- `POST /api/planificador/gastos/:id/pagar` (o donde sea que se cree el gasto real ligado) → patchea evento a estado pagado.

Todos estos hooks van **después** del `setResponseStatus` / response, usando `event.context.waitUntil()` si está disponible o un `Promise.resolve().then(...)` simple. Cualquier error se loga (`console.error('[gcal] usuarioId=...', err)`) y se persiste en `googleCalendarConexiones.ultimoError`, pero no afecta la respuesta HTTP del endpoint principal.

### 3.3 Modelo de datos

**Tabla nueva** `google_calendar_conexiones`:

| Columna | Tipo | Nullable | Nota |
|---|---|---|---|
| `id` | uuid PK | no | |
| `usuario_id` | uuid FK → usuarios.id (cascade) | no | UNIQUE — un usuario, una conexión |
| `refresh_token_cifrado` | text | no | AES-256-GCM, formato `iv:tag:ciphertext` (base64) |
| `calendar_id` | varchar(255) | no | ID que devuelve Google al crear el calendario |
| `calendar_nombre` | varchar(255) | no | "Mis Finanzas — Gastos planificados" |
| `recordatorios_config` | jsonb | no | `[{tipo, hora}]` — ver formato abajo |
| `ultima_sync` | timestamp | sí | |
| `ultimo_error` | text | sí | mensaje legible o null |
| `fecha_conexion` | timestamp | no | default now() |
| `updated_at` | timestamp | no | default now() |

`recordatorios_config` formato:
```json
[
  { "tipo": "dia_anterior", "hora": "18:00" },
  { "tipo": "mismo_dia",    "hora": "09:00" }
]
```
- `tipo` ∈ `mismo_dia | dia_anterior | dos_dias_antes | una_semana_antes`
- `hora` en formato `HH:MM` (24h, zona horaria del usuario `America/Lima`)
- Máximo 5 recordatorios.

**Modificación a `gastos_planificados`:**

| Columna | Tipo | Nullable | Nota |
|---|---|---|---|
| `google_event_id` | varchar(255) | sí | ID del evento en Google; null si no se sincronizó aún o si la conexión está rota |

**Migración:** generada con `npm run db:generate`, aplicada con `npm run db:push`.

### 3.4 Formato del evento en Google Calendar

**Estado pendiente:**
- **Título:** `S/ 150.00 · Internet` (formato: `{moneda}{monto formateado} · {concepto}`)
- **Tipo:** todo el día (`start.date` / `end.date`, no `dateTime`)
- **Fecha:** `gastosPlanificados.fechaProbablePago`
- **Color:** default del calendario (azul/9)
- **Descripción:**
  ```
  Pendiente · S/ 150.00
  Categoría: {categoría nombre}

  {notas si las hay}

  Abrir en Mis Finanzas: {APP_URL}/planificador?gasto={id}
  ```
- **Recordatorios:** `useDefault: false`, lista construida desde `recordatoriosConfig`. Cada entrada `{tipo, hora}` se traduce a `{ method: 'popup', minutes: N }` donde N son los minutos antes del **inicio del evento**. Como los eventos son `all-day`, Google considera el inicio a las **00:00 del día del evento** en la zona horaria del calendario (`America/Lima`):
  - `dia_anterior` con hora `HH:MM` → `minutes = (24 - H) * 60 - M`. Ej: día anterior 18:00 → `(24-18)*60 = 360` min antes.
  - `dos_dias_antes` con hora `HH:MM` → `minutes = (48 - H) * 60 - M`.
  - `una_semana_antes` con hora `HH:MM` → `minutes = (168 - H) * 60 - M`.
  - `mismo_dia`: la API de Google **no admite offsets negativos** sobre all-day events, así que el campo `hora` se ignora para este tipo y se envía `minutes: 0`. El aviso llegará según la configuración global del usuario en Google Calendar (Settings → Event settings → Default notification → All-day events; por defecto suele ser 9 AM). La UI muestra un tooltip aclarando esto: *"El recordatorio del mismo día llega según la hora global de tu Google Calendar. Para una hora exacta, usa un recordatorio del día anterior."*

**Estado pagado** (al marcar como pagado, patchea el mismo evento):
- **Título:** `✅ PAGADO · S/ 150.00 · Internet`
- **Color:** `colorId: '2'` (Sage/verde en la paleta de Google)
- **Recordatorios:** `useDefault: false, overrides: []` (sin recordatorios)
- **Descripción:**
  ```
  ✅ Pagado el 22/05/2026 · Monto real: S/ 148.50
  Categoría: {categoría nombre}

  {notas si las hay}

  Abrir en Mis Finanzas: {APP_URL}/registro?gasto={id_del_gasto_real}
  ```

## 4. Flujos de usuario

### 4.1 Conectar
1. `Configuraciones → Integraciones → Google Calendar`: tap en "Conectar Google Calendar".
2. `useGoogleCalendar.conectar()` llama a `POST /api/integraciones/google/oauth-start` y abre la URL devuelta en una nueva pestaña (no popup — en mobile/PWA los popups son inconsistentes).
3. Usuario acepta el consent en Google → Google redirige a `/api/integraciones/google/oauth-callback?code=...&state=...`.
4. El callback:
   - Valida el `state` firmado.
   - Intercambia code → tokens.
   - Cifra refresh_token con `ENCRYPTION_KEY`.
   - Llama a `calendars.insert` con `summary: 'Mis Finanzas — Gastos planificados'`, `timeZone: 'America/Lima'`.
   - Guarda fila en `google_calendar_conexiones` con defaults de recordatorios.
   - Lanza primer resync (todos los planificados del mes actual + futuros).
   - Redirige a `/configuraciones?gcal=conectado`.
5. Frontend detecta el query param, muestra toast "Google Calendar conectado · 23 gastos sincronizados".

### 4.2 Sync automático
Cada operación CRUD sobre `gastos_planificados` dispara fire-and-forget:
- **Crear:** llamar `events.insert`, guardar `google_event_id`.
- **Editar:** llamar `events.patch` con los campos cambiados; recalcular título/descripción siempre.
- **Borrar:** llamar `events.delete`. Si el planificado tenía `google_event_id = null`, skip.
- **Pagar:** llamar `events.patch` con el payload de estado pagado.

Si la conexión no existe (`google_calendar_conexiones` vacía para ese usuario), el hook hace skip silencioso.

### 4.3 Resync manual
1. Botón en Configuraciones (`Sincronizar ahora`) o en el menú "..." del ResumenMes del Planificador.
2. `POST /api/integraciones/google/resync`:
   - Lee todos los `gastos_planificados` del usuario con `fecha_probable_pago >= primer día del mes actual`.
   - Llama `events.list` sobre el calendario dedicado (con paginación si hay >250).
   - Construye dos índices: `planificadosPorEventId` y `eventosPorEventId`.
   - **Diff:**
     - Planificados con `google_event_id` que existen en Google → patch si difieren.
     - Planificados con `google_event_id = null` → crear evento, guardar ID.
     - Planificados con `google_event_id` que NO existen en Google → tratar como huérfano local, crear nuevo evento, actualizar ID.
     - Eventos en Google sin planificado correspondiente → borrar de Google.
   - Operaciones se agrupan en **batch requests** de 50.
   - Actualiza `ultimaSync = now()`, `ultimoError = null`.
3. Devuelve `{ creados, actualizados, eliminados }`. Frontend muestra toast.

### 4.4 Cambiar configuración de recordatorios
1. En Configuraciones, editar los recordatorios (toggle / agregar / quitar / cambiar hora).
2. Tap en "Guardar" (o auto-guardado con debounce 1s).
3. `PATCH /api/integraciones/google/config` con el nuevo array.
4. Backend guarda el JSON y re-aplica con batch a todos los eventos del calendario que NO tienen prefijo `✅ PAGADO` en el título.
5. Toast: "Recordatorios actualizados · aplicados a 18 eventos pendientes".

### 4.5 Desconectar
1. Botón "Desconectar" → `ConfirmDialog` con dos opciones (no es booleano sí/no, son dos rutas):
   - **"Sí, borrar el calendario en Google también"** → `DELETE /api/integraciones/google?borrarCalendario=true`.
   - **"Solo desconectar (mantener calendario)"** → `DELETE /api/integraciones/google?borrarCalendario=false`.
   - **Cancelar** → cierra el diálogo.
2. Backend:
   - Si `borrarCalendario=true`: llama `calendars.delete` (esto borra todos los eventos).
   - Borra fila de `google_calendar_conexiones`.
   - `UPDATE gastos_planificados SET google_event_id = NULL WHERE usuario_id = ?`.
3. Toast: "Desconectado de Google Calendar".

## 5. UI

### 5.1 Configuraciones

Nueva sección **"Integraciones"** en [pages/configuraciones.vue](pages/configuraciones.vue), debajo de las secciones existentes. Card único por ahora: Google Calendar.

**Estado: desconectado**
```
┌──────────────────────────────────────────┐
│ 📅 Google Calendar                       │
│ Sincroniza tus gastos planificados con   │
│ tu calendario para recibir recordatorios │
│ el día que toca pagar.                   │
│                                          │
│         [Conectar Google Calendar]       │
└──────────────────────────────────────────┘
```

**Estado: conectado**
```
┌──────────────────────────────────────────┐
│ 📅 Google Calendar      ● Conectado      │
│ Calendario: Mis Finanzas — Gastos        │
│ Última sync: hace 3 min                  │
│                                          │
│ Recordatorios:                           │
│  ☑ Día anterior     18 : 00       [🗑]  │
│  ☑ Mismo día        (hora global) ⓘ [🗑]│
│  [ + Agregar recordatorio ]              │
│                                          │
│ [Sincronizar ahora]  [Desconectar]       │
└──────────────────────────────────────────┘
```

Para los recordatorios de tipo `mismo_dia`, el selector de hora se deshabilita y se muestra "hora global" con un ícono ⓘ que abre el tooltip explicativo (ver sección 3.4). Los demás tipos (`dia_anterior`, `dos_dias_antes`, `una_semana_antes`) sí permiten hora personalizada.

**Estado: error**
- Badge `● Error` en rojo, con tooltip mostrando `ultimoError`.
- Si el error es `invalid_grant` (token expirado), banner adicional: "Tu conexión expiró. [Reconectar]".

### 5.2 Planificador

En [components/planificador/ResumenMes.vue](components/planificador/ResumenMes.vue), el menú "..." (que ya tiene "Exportar a Excel") agrega:
- **"Sincronizar con Google Calendar"** — visible solo si está conectado. Tap → llama a `resincronizar()` + toast.

## 6. Manejo de errores y casos borde

### 6.1 Token expirado / revocado (`invalid_grant`)
- Marcar `ultimoError = 'Token expirado, reconecta'`.
- Banner en Configuraciones.
- **No** borrar `google_event_id` locales — al reconectar, se intenta reusar matching por ID.

### 6.2 Rate limiting (HTTP 429)
- Retry con backoff exponencial: 1s, 2s, 4s, 8s (máx 4 intentos).
- Batch requests para syncs grandes (>50 eventos).

### 6.3 Calendario dedicado borrado en Google
- Si `calendars.get(calendarId)` o cualquier operación devuelve `404` sobre el calendar_id:
  - Recrear calendario.
  - `UPDATE gastos_planificados SET google_event_id = NULL WHERE usuario_id = ?`.
  - Re-empujar todos los pendientes.
  - Toast: "Tu calendario fue recreado y resincronizado".

### 6.4 Evento individual borrado en Google
- Si `events.patch(eventId)` o `events.delete(eventId)` devuelve `404`:
  - Tratar como inexistente. Si era un patch, crear evento nuevo y actualizar `google_event_id`. Si era un delete, skip.

### 6.5 Offline
- Reusar [composables/useOnlineStatus.js](composables/useOnlineStatus.js): si está offline, skip el fire-and-forget en cliente. Servidor: si `fetch` a Google falla con error de red, loguear, set `ultimoError`, no reintentar.
- **No** implementar cola de operaciones offline. El resync manual cubre este caso.

### 6.6 Concurrencia
- Sin lockeo. Google maneja IDs. La última escritura gana.

### 6.7 Cascada de borrado de usuario
- FK con `onDelete: cascade` borra `google_calendar_conexiones`.
- El calendario en Google queda huérfano (no podemos llamar a API sin el refresh token, que se borró con la fila).

### 6.8 Falla al cifrar/descifrar (clave inválida)
- Si `decrypt()` falla al leer un refresh token, tratar como conexión rota: `ultimoError = 'Credenciales corruptas, reconecta'` y mostrar reconectar.

## 7. Seguridad

- **Refresh tokens cifrados en reposo** con AES-256-GCM. Clave en `ENCRYPTION_KEY` (32 bytes, base64), nunca en código.
- **OAuth `state` firmado** con HMAC-SHA256 sobre `{ usuarioId, nonce, exp }` y validado en callback. Expira en 10 minutos.
- **`client_secret`** solo en servidor (`runtimeConfig.googleOAuthClientSecret`), nunca expuesto al cliente.
- **Endpoints autenticados**: todos los `/api/integraciones/google/*` excepto `oauth-callback` requieren sesión Supabase válida (vía [server/utils/getUsuario.js](server/utils/getUsuario.js)). El callback valida via `state`.
- **CSRF en callback**: el `state` firmado lo previene.

## 8. Variables de entorno nuevas

En `.env.example`:
```
# Cifrado de refresh tokens (32 bytes base64)
ENCRYPTION_KEY=

# OAuth Google Calendar (cliente OAuth separado del de Supabase Auth)
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/integraciones/google/oauth-callback
```

En `nuxt.config.ts` → `runtimeConfig`:
```js
encryptionKey: process.env.ENCRYPTION_KEY || '',
googleOAuthClientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
googleOAuthClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
googleOAuthRedirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI || '',
```

Failsafe: al arrancar el servidor, si la app detecta una conexión existente pero `ENCRYPTION_KEY` está vacía, lanza error crítico para evitar corromper datos.

## 9. Out of scope (v1)

Lo siguiente NO entra en esta entrega — se deja para iteraciones futuras si surge necesidad:

- Sync bidireccional (cambios hechos en Google Calendar → reflejados en la app).
- Backfill de meses pasados.
- Múltiples calendarios destino o calendario seleccionable.
- Sincronización de `gastos_futuros` (los deseos/decisiones pendientes) al calendario.
- Push notifications de Google Calendar webhooks.
- Cola persistente de operaciones offline.
- Log estructurado de operaciones para auditoría.
- Soporte para otros proveedores (Apple Calendar, Outlook).

## 10. Testing

- **Unit**: `crypto.js` (encrypt/decrypt roundtrip, falla con clave inválida), `planificadorToGcalEvent.js` (estados pendiente vs pagado, recordatorios bien calculados, descripción correcta).
- **Integration (con Google API mock)**: flujo OAuth completo, sync con planificados nuevos/editados/borrados/pagados, manejo de 404/429/invalid_grant.
- **E2E manual**: conectar con cuenta de Google real (sandbox), crear 3 planificados, marcar uno pagado, editar fecha, desconectar.

## 11. Plan de rollout

1. Migración DB (`google_calendar_conexiones` + columna en `gastos_planificados`).
2. Servicio `crypto.js` + tests.
3. Servicio `googleCalendar.js` + tests con mock.
4. Endpoints OAuth (start + callback).
5. Endpoint resync + hooks de auto-sync en CRUD existente.
6. UI Configuraciones (card + editor de recordatorios).
7. Entrada en menú "..." del Planificador.
8. Endpoint config + UI editor de recordatorios.
9. Endpoint desconexión + ConfirmDialog.
10. Manejo de errores y banners.
11. Pruebas E2E con cuenta real.
