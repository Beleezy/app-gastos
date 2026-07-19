# Sistema de Finanzas Personales — Guía del Proyecto

PWA mobile-first de finanzas personales en **Nuxt (JS) + Vue 3 Composition API**, con Tailwind 4, Pinia, Drizzle ORM sobre **PostgreSQL (Supabase)**, autenticación Supabase Auth y PWA vía `@vite-pwa/nuxt`. Moneda por defecto: **Soles peruanos (S/)**, locale `es-PE`, zona horaria `America/Lima`.

> **Regla de mantenimiento:** al cerrar una ronda de trabajo que añada/quite módulos, tablas o convenciones, actualizar este archivo. Es la documentación operativa que usan las sesiones de IA — si miente, cada sesión futura paga el costo.

Navegación: [BottomNav.vue](components/layout/BottomNav.vue) (móvil) + [SideNav.vue](components/layout/SideNav.vue)/[MobileDrawer.vue](components/layout/MobileDrawer.vue) ("Más") dan acceso a los módulos.

---

## Módulos

| Página                                                                                             | Qué hace                                                                                                                                                        | Piezas clave                                                                                                                                                                    |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [index.vue](pages/index.vue)                                                                       | **Dashboard** home: resumen consolidado de gastos, deudas, plan, ahorros, ingresos y futuros en 1 request                                                       | `/api/dashboard` (queries paralelas)                                                                                                                                            |
| [planificador.vue](pages/planificador.vue)                                                         | Presupuesto mensual, gastos planeados (CRUD, recurrencia vía `recurrente_grupo_id`, estado pendiente/pagado), duplicar mes, presupuestos por categoría          | `components/planificador/`, [usePlanificador.js](composables/usePlanificador.js), `/api/planificador`, [SelectorPlantillas.vue](components/planificador/SelectorPlantillas.vue) |
| [registro.vue](pages/registro.vue)                                                                 | Registro real de gastos por **voz / foto / manual** (`metodo_registro`), historial diario/semanal, stats, filtros, quick-add, bulk edit                         | `components/registro/`, [useGastos.js](composables/useGastos.js), `/api/gastos` (+`bulk`, `conceptos`, `resumen`, `detectar-duplicados`)                                        |
| [deudas.vue](pages/deudas.vue)                                                                     | "Me deben / Yo debo" por persona/entidad, pagos parciales y globales, merge de duplicados, PDF/Excel, registro por voz, **vínculos entre cuentas** con espejado | `components/deudas/`, [useDeudas.js](composables/useDeudas.js), [useVinculos.js](composables/useVinculos.js), `/api/deudas/**`                                                  |
| [ahorros.vue](pages/ahorros.vue)                                                                   | Ahorros por medio (cuenta/banco), metas, gráfico mensual, vista 6 meses                                                                                         | `components/ahorros/`, [useAhorros.js](composables/useAhorros.js), `/api/ahorros/**`                                                                                            |
| [ingresos.vue](pages/ingresos.vue)                                                                 | Ingresos del mes; alimenta saldo neto del dashboard                                                                                                             | [FormIngreso.vue](components/ingresos/FormIngreso.vue), [useIngresos.js](composables/useIngresos.js), `/api/ingresos`                                                           |
| [futuros.vue](pages/futuros.vue)                                                                   | Gastos futuros (deseos aún no decididos): jerarquía `gastos_futuros` → `_detalles` (estado_decision) → `_opciones` (alternativas con precios/scoring)           | `components/futuros/`, [useGastosFuturos.js](composables/useGastosFuturos.js), [useOpcionesScoring.js](composables/useOpcionesScoring.js), `/api/planificador/futuros`          |
| [calendario.vue](pages/calendario.vue)                                                             | Vista calendario de planificados/gastos                                                                                                                         | [CalendarioMensual.vue](components/planificador/CalendarioMensual.vue)                                                                                                          |
| [metricas.vue](pages/metricas.vue)                                                                 | Histórico y recurrentes                                                                                                                                         | `/api/metricas/*`                                                                                                                                                               |
| [reportes.vue](pages/reportes.vue)                                                                 | Reportes/exportaciones                                                                                                                                          | [useReportes.js](composables/useReportes.js)                                                                                                                                    |
| [papelera.vue](pages/papelera.vue)                                                                 | Soft-delete: restaurar/purgar gastos, deudas, pagos y personas (`deleted_at`)                                                                                   | `/api/papelera/*`, [softDelete.js](server/utils/softDelete.js), cron `purgar-papelera`                                                                                          |
| [familia.vue](pages/familia.vue)                                                                   | **Perfiles gestionados** (familiares sin cuenta propia): crear/editar perfiles, cambiar de perfil activo                                                        | [usePerfiles.js](composables/usePerfiles.js), [usePerfilModo.js](composables/usePerfilModo.js), `/api/perfiles`, [PerfilContextBar.vue](components/layout/PerfilContextBar.vue) |
| [categorias.vue](pages/categorias.vue)                                                             | Categorías predefinidas globales (`usuario_id` NULL) + personalizadas                                                                                           | `/api/categorias`                                                                                                                                                               |
| [configuraciones.vue](pages/configuraciones.vue)                                                   | Perfil, presupuesto default, moneda, ciclo, tema/acento/daltónico/tamaño letra, recordatorios, Google Calendar, uso LLM, panel superadmin                       | `components/configuraciones/`                                                                                                                                                   |
| [login.vue](pages/login.vue), `auth/`, [dev-login.vue](pages/dev-login.vue)                        | Supabase Auth (PKCE); dev-login solo con `DEV_AUTH_BYPASS` fuera de prod                                                                                        | [useAuth.js](composables/useAuth.js), `middleware/auth.global.js`                                                                                                               |
| [control-acceso.vue](pages/control-acceso.vue), [acceso-pendiente.vue](pages/acceso-pendiente.vue) | Allowlist por email controlada por superadmin (`SUPERADMIN_EMAIL`)                                                                                              | `/api/acceso`, `/api/superadmin`, `middleware/acceso.global.js`                                                                                                                 |
| [share.vue](pages/share.vue)                                                                       | Share Target API de la PWA (recibir texto/imagen de otras apps)                                                                                                 | manifest en `nuxt.config.ts`                                                                                                                                                    |

### Captura por voz/foto (hot path)

- Voz: [useVoiceRecognition.js](composables/useVoiceRecognition.js) (Web Speech) → `/api/voz/parse` o `parse-stream` (SSE) → Gemini parsea a JSON estricto → [ConfirmacionVoz.vue](components/registro/ConfirmacionVoz.vue) para editar/confirmar → `/api/gastos/bulk`.
- Foto: [BotonCamara.vue](components/registro/BotonCamara.vue) → `/api/voz/parse-image` (multimodal, valida magic bytes en [imageMagic.js](server/utils/imageMagic.js)).
- Drafts persistentes ante recargas: [useDraftManager.js](composables/useDraftManager.js) + [useVoiceDraft.js](composables/useVoiceDraft.js)/[usePhotoDraft.js](composables/usePhotoDraft.js). Deudas por voz: [useVoiceDeuda.js](composables/useVoiceDeuda.js).
- Servidor: sanitización + delimitadores anti prompt-injection ([llmSafety.js](server/utils/llmSafety.js)), caché por hash ([llmCache.js](server/utils/llmCache.js)), cuota mensual por usuario ([usoLlm.js](server/utils/usoLlm.js)), fallback de modelos ([geminiModels.js](server/utils/geminiModels.js)).

### Vínculos entre usuarios (deudas)

Una `persona_entidad` puede vincularse al usuario real de otra cuenta (`vinculado_usuario_id`, `vinculo_par_id`): solicitudes por email (`solicitudes_vinculo`), espejado de deudas/pagos (`vinculo_deuda_id`/`vinculo_pago_id`), checkpoints comparables (`vinculos_checkpoints`) y auditoría (`auditoria_vinculos`). API en `/api/deudas/vinculos`; helpers en [vinculos.js](server/utils/vinculos.js).

---

## Base de datos ([schema.js](server/database/schema.js))

Tablas: `usuarios` (espejo de auth.users, + perfiles gestionados con contacto), `intenciones_registro`, `categorias`, `planes_mensuales` (UNIQUE usuario+mes+año), `gastos_planificados`, `gastos` (vínculo 1:1 opcional a planificado), `gastos_futuros`/`_detalles`/`_opciones`, `personas_entidades`, `deudas`, `pagos_deuda`, `configuraciones` (1:1 usuario), `auditoria_vinculos`, `vinculos_checkpoints`, `solicitudes_vinculo`, `ingresos`, `medios_ahorro`, `ahorros`, `metas_ahorro`, `plantillas_mes`, `uso_llm`, `llm_cache`, `google_calendar_conexiones`, `presupuestos_categoria`.

Soft-delete (`deleted_at`) en gastos, deudas, pagos y personas_entidades — filtrar con `isNull()` en TODA query de lectura.

### Migraciones — REGLAS CRÍTICAS

- Archivos SQL en [migrations/](server/database/migrations/); se aplican con `npm run db:apply` ([apply-migrations.mjs](scripts/apply-migrations.mjs)), que lleva registro en la tabla `_migraciones_aplicadas` (transaccional para archivos nuevos; los que contienen `CREATE INDEX CONCURRENTLY` van fuera de transacción).
- **El deploy SÍ aplica migraciones**: `vercel.json` define `buildCommand: npm run db:apply && npm run build`. Nunca mergear código que dependa de una columna sin su migración en el mismo PR (causa del hotfix `2bb83a7`).
- Un prefijo numérico = una migración; ante conflicto usar sufijo letra (`0005a_...`). No editar migraciones ya aplicadas — crear una nueva.
- Al añadir una columna crítica, actualizar las columnas centinela de [health.get.js](server/api/health.get.js) (check de drift → 503).

---

## Capa servidor

- **Handlers delgados** en `server/api/**`: auth (`getUsuarioFromEvent`) + validación + delegar a `server/services/*.service.js` (gastos, deudas, pagos, ingresos, planificador, plantillasMes, perfiles).
- **Validación:** schemas Zod compartidos en `shared/schemas/*` — se usan en servidor (`validateBody` de [validate.js](server/utils/validate.js)) y en cliente (validación en vivo con `useFormField`).
- **Middleware** (orden): security-headers (CSP activa + estricta en Report-Only → `/api/csp-report`) · CORS allowlist · request-log · bypass E2E/dev · rate-limit global por IP ([rateLimit.js](server/utils/rateLimit.js), driver memoria o Upstash).
- **Ownership:** [assertOwner.js](server/utils/assertOwner.js) contra IDOR; suite [seguridad.api.spec.js](e2e/api/seguridad.api.spec.js).
- **Logger:** [logger.js](server/utils/logger.js) redacta tokens/keys — nunca `console.error` con cuerpos crudos.
- **Cron** (`/api/cron/*`, header `X-Cron-Secret`): expirar solicitudes, purgar caché LLM, purgar papelera.
- **Integración Google Calendar:** OAuth propio, refresh tokens cifrados AES ([crypto.js](server/utils/crypto.js)), sync de planificados ([gcalAutoSync.js](server/utils/gcalAutoSync.js)).

## Convenciones cliente

- **Stack:** JavaScript (no TS) en composables/componentes; Pinia en [stores/](stores/) (usuario, plantillas).
- **Fetch autenticado:** siempre `useApiFetch()` (plugin [fetch.js](plugins/fetch.js) inyecta token Supabase).
- **UI compartida:** `components/shared/` — `BaseBottomSheet`, `ConfirmDialog`, `MonthSelector`, `SkeletonLoader`, `ToastNotification`, `VirtualList`, `Money`, `EmptyState`, `Chip`, FABs. Modales con focus trap + `aria-modal` integrados; botón atrás cierra modal ([useModalLayer.js](composables/useModalLayer.js) + [useModalBack.js](composables/useModalBack.js)).
- **Offline/PWA:** cola de sincronización ([useSyncQueue.js](composables/useSyncQueue.js) + [SyncQueueBadge.vue](components/layout/SyncQueueBadge.vue)), banner offline, update prompt opt-in ([usePwaUpdate.js](composables/usePwaUpdate.js)); runtime caching SWR/NetworkFirst en `nuxt.config.ts`.
- **UX móvil:** 360–412 px, tap targets ≥ 44 px (`.tap-target`), haptics, pull-to-refresh, swipe de mes, long-press, drag & drop. Onboarding: [TourOverlay.vue](components/onboarding/TourOverlay.vue).
- **Temas:** [useTheme.js](composables/useTheme.js) — dark/light + acentos + daltónico + tamaño letra; script inline en head aplica clases pre-hidratación (no tocar sin entender el flicker que evita).
- **Formato:** [useFormatters.js](composables/useFormatters.js)/[useCurrency.js](composables/useCurrency.js) respetan locale y `moneda_preferida`. Fechas de negocio en zona del usuario: [useFechaPeru.js](composables/useFechaPeru.js), [dateLocal.js](server/utils/dateLocal.js).
- **Exportación:** Excel ([useExportExcel.js](composables/useExportExcel.js), exceljs), PDF (jspdf, `useDeudaPdf`/`useHistorialPdf`), CSV. Libs pesadas via `await import()` (chunks separados).

## Testing y CI

- Unit: `npm test` (Vitest, `tests/*.test.js` — lógica pura extraída de composables/utils).
- E2E: Playwright (`e2e/`) con page objects; proyectos `smoke | api | mobile | desktop | visual`; auth bypass con `DEV_AUTH_BYPASS=1` + token; Postgres efímera en CI.
- Workflows: `ci.yml` (unit + lint + build), `e2e.yml` (PRs y main), `e2e-visual-baseline.yml`, `db-backup.yml` (dump semanal cifrado).

## Estructura

```
pages/          index(dashboard) · planificador · registro · deudas · ahorros · ingresos · futuros
                calendario · metricas · reportes · papelera · familia · categorias · configuraciones
                informacion · login · auth/ · dev-login · control-acceso · acceso-pendiente · share
components/     layout/ · shared/ · planificador/ · registro/ · deudas/ · ahorros/ · ingresos/
                futuros/ · configuraciones/ · onboarding/
composables/    ~90 archivos — useGastos · useDeudas · usePlanificador · useAhorros · useIngresos
                useVinculos · usePerfiles · useLLMParser · useDraftManager · useApiFetch · useTheme ...
stores/         usuario · plantillas (Pinia)
shared/schemas/ Zod compartido cliente↔servidor
server/api/     gastos · deudas · planificador · ahorros · ingresos · futuros · categorias
                configuraciones · perfiles · metricas · papelera · voz · integraciones/google
                acceso · superadmin · cron · dashboard · health · csp-report · errors
server/services/  lógica de negocio (7 servicios)
server/utils/     30 helpers (auth, rate limit, LLM, crypto, fechas, soft delete, ...)
server/database/  schema.js · migrations/ · seeds
e2e/ · tests/     Playwright · Vitest
```
