# Sistema de Finanzas Personales

PWA mobile-first de finanzas personales construida con **Nuxt 3 + Vue 3 (Composition API)**, Tailwind, Drizzle ORM sobre **PostgreSQL (Supabase)**, autenticación Supabase y service worker vía `@vite-pwa/nuxt`.

Moneda por defecto: **Soles peruanos (S/)** — locale `es-PE`, zona horaria `America/Lima`.

## Módulos principales

- **Planificador** — presupuesto mensual, gastos planeados, recurrencia, calendario y "gastos futuros" (jerarquía 3 niveles para decisiones de compra).
- **Registro** — captura por **voz** (Web Speech + LLM), **foto** (multimodal LLM) y **manual**; historial diario, gráficas y filtros.
- **Deudas** — "Me deben / Yo debo" agrupadas por persona/entidad, pagos parciales, sistema de **vínculos** entre cuentas con espejado de deudas.

Más detalle de la arquitectura en [`CLAUDE.md`](./CLAUDE.md) y plan estratégico en [`planifica.md`](./planifica.md).

---

## Setup

Requisitos: Node 20+, npm.

```bash
npm install
cp .env.example .env  # rellenar las variables de abajo
npm run dev           # http://localhost:3000
```

### Variables de entorno

Críticas (la app no arranca correctamente sin estas):

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | PostgreSQL (Supabase) connection string. |
| `SUPABASE_URL` | URL del proyecto Supabase. |
| `SUPABASE_ANON_KEY` | Public anon key (cliente). |

Recomendadas (algunas features quedan deshabilitadas si faltan):

| Variable | Para qué sirve |
|---|---|
| `GEMINI_API_KEY` | Endpoints de voz/foto (`/api/voz/parse*`). |
| `GEMINI_MODEL` | Lista de modelos separados por `;` (fallback). Default `gemini-3.1-flash-lite-preview;gemini-2.5-flash`. |
| `GEMINI_MAX_RETRIES` | Reintentos por modelo. Default `3`. |
| `GEMINI_RATE_LIMITS` | Cuotas por modelo (RPM/RPD), formato `modelo=RPM/RPD;…`. |
| `LLM_QUOTA_MENSUAL_USUARIO` | Tope mensual de peticiones IA por usuario. Default `500`. Lanza 429 cuando se alcanza. |
| `LLM_CACHE_TTL_SECONDS` | TTL del caché de respuestas LLM por hash de input. Default `21600` (6h). |
| `CRON_SECRET` | Secreto compartido para endpoints `/api/cron/*` (expirar solicitudes, purgar caché LLM). |
| `SUPABASE_SERVICE_ROLE_KEY` | Operaciones server-side privilegiadas. |

El plugin `server/plugins/01.assert-env.js` valida estas al arrancar y loguea WARN/ERROR si falta alguna.

---

## Scripts

| Script | Acción |
|---|---|
| `npm run dev` | Servidor de desarrollo. |
| `npm run build` | Build de producción. |
| `npm run preview` | Preview local del build. |
| `npm test` | Suite Vitest (unit). |
| `npm run test:watch` | Vitest en modo watch. |
| `npm run test:coverage` | Cobertura con `@vitest/coverage-v8`. |
| `npm run lint` | ESLint flat config. |
| `npm run lint:fix` | ESLint con `--fix`. |
| `npm run format` | Prettier `--write`. |
| `npm run format:check` | Prettier verificación. |
| `npm run db:generate` | Generar migración Drizzle. |
| `npm run db:push` | Aplicar schema a la DB. |
| `npm run db:studio` | Drizzle Studio (UI). |
| `npm run db:seed` | Cargar datos iniciales. |
| `npm run db:seed:test` | Seed datos de prueba. |

---

## Convenciones de código

- **Stack:** Nuxt 3 + JavaScript (no TS en composables/componentes), Vue 3 Composition API, Tailwind, Drizzle, Supabase Auth, `@vite-pwa/nuxt`.
- **Schemas Zod compartidos:** `shared/schemas/*` se importan tanto en cliente (validación de form en vivo con `useForm`) como en servidor (`validateBody` en handlers).
- **Server services:** la lógica de negocio vive en `server/services/*.service.js` y los handlers `server/api/**` son delgados (auth + validate + delegación).
- **Logger seguro:** usar `logger` de `server/utils/logger.js` (redacta tokens, JWT, api keys de Gemini). Evitar `console.error` con cuerpos completos de respuesta de APIs.
- **Rate limit:** endpoints LLM y de creación masiva usan helpers de `server/utils/rateLimit.js`.
- **Modales:** `BaseBottomSheet` y `ConfirmDialog` ya integran focus trap (`useFocusTrap`) + `aria-modal`. Mantener el patrón al añadir nuevos.
- **Mobile-first:** diseñar para 360–412 px; tap targets mínimos 44 × 44 px usando `min-h-[44px]` o la clase utility `.tap-target`.

---

## Testing

```bash
npm test            # corre todos los specs en tests/
npm run test:watch  # modo watch durante desarrollo
```

Cobertura por dominio:

- `tests/llmSafety.test.js` — sanitización de input + validación de respuestas LLM.
- `tests/schemas.test.js` — schemas Zod (gastos, deudas, planificador).
- `tests/logger.test.js` — redacción de campos y patrones sensibles.
- `tests/rateLimit.test.js` — buckets por usuario/IP, ventanas, 429.
- `tests/useDraftManager.test.js` — máquina de estados de drafts.
- `tests/useForm.test.js` — validación de form en tiempo real.
- `tests/reminderText.test.js` — builder de mensaje WhatsApp.

---

## CI

`.github/workflows/ci.yml` corre en cada push/PR:

1. **test** — `npm test`.
2. **build** — `nuxt build` (verifica que el bundle compila).

Variables de Supabase se setean a placeholders en CI para no exigir credenciales reales.

---

## Hot paths a conocer

- **Captura por voz**: `composables/useVoiceRecognition.js` → `composables/useLLMParser.js` → `/api/voz/parse` → `ConfirmacionVoz.vue`.
- **Captura por foto**: `BotonCamara.vue` → `composables/usePhotoDraft.js` → `/api/voz/parse-image`.
- **Captura manual**: `FormGastoManual.vue` → `composables/useGastos.js` → `/api/gastos`.
- **Crear deuda**: `FormDeuda.vue` → `useDeudas.js` → `/api/deudas` (servicio `crearGasto` análogo a venir en `services/deudas.service.js`).
- **Pagar deuda**: `FormPago.vue` o `FormPagoGlobal.vue` → `/api/deudas/pagos*`.

---

## Licencia

ISC.
