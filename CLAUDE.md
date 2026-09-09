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
| [compartido.vue](pages/compartido.vue)                                                             | **Compartido**: visibilidad de gastos hacia otra cuenta (rubros, presupuesto, proyección) + avisos y umbrales del observador                                    | `components/compartido/`, [useCompartido.js](composables/useCompartido.js), `/api/compartido/**`                                                                                |
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

### Compartido — visibilidad de gastos entre usuarios

Un usuario (emisor) le da a otro (receptor) visibilidad sobre parte de sus gastos para que pueda advertirle sobre el ritmo de consumo. **No es gasto compartido ni división de cuentas** — eso es Deudas.

Página [compartido.vue](pages/compartido.vue) con dos pestañas ("Lo que veo" / "Lo que comparto"), `components/compartido/`, [useCompartido.js](composables/useCompartido.js), `/api/compartido/**`, servicios [compartido.service.js](server/services/compartido.service.js) (conexiones y avisos) y [compartidoVista.service.js](server/services/compartidoVista.service.js) (vista y novedades).

Decisiones que hay que respetar al tocar el módulo:

- **Sin espejado.** A diferencia de los vínculos de deudas, no se replican filas: la vista lee los gastos del emisor con el permiso verificado en servidor. El botón "Sincronizar" es un refetch — manda `?fresh=1`, que saltea el `Cache-Control` (sin eso el usuario aprieta y no pasa nada).
- **Guard único.** [server/utils/compartido.js](server/utils/compartido.js) es el ÚNICO lugar autorizado a leer datos de otro usuario: `cargarConexionLegible` (exige ser receptor de una conexión aceptada y no pausada) y `construirFiltroVisibilidad`. Las columnas salen por la whitelist `SELECT_GASTO_COMPARTIDO`; `notas` y `transcripcion_voz` no se comparten nunca. Todo negativo responde 404, no 403, para no confirmar que la conexión existe.
- **Una sola regla de visibilidad, en dos formas.** La canónica es `esGastoVisible` ([shared/compartido/visibilidad.js](shared/compartido/visibilidad.js)); `construirFiltroVisibilidad` es su traducción a SQL para no traer filas de más. Si cambia una, cambia la otra: `tests/compartidoVisibilidad.test.js` fija la tabla de verdad.
- **Conexión unidireccional** A→B en `compartido_conexiones` (una invitación aceptada _es_ la conexión). Visibilidad mutua = dos filas. Índice único parcial: una sola conexión viva por `(emisor, email)`, así que tras rechazar o revocar se puede reinvitar.
- **`gastos.visibilidad`** (`auto` | `compartido` | `privado`) es la excepción por gasto: `privado` gana siempre; `compartido` fuerza visible aunque su categoría no se comparta. Una conexión sin filas en `compartido_categorias` solo muestra los marcados a mano. Se alterna desde el historial de `/registro` (ciclo de tres estados con toast).
- **Alcance parcial ≠ total.** Una categoría que aparece solo porque el emisor marcó un gasto suelto llega con `alcance: 'solo_marcados'` y SIN proyección: mostrar "20 de 600 = 3%" mentiría, porque el receptor no ve todo el rubro.
- **Zona horaria del emisor** para el mes en curso y los días transcurridos ([proyeccion.js](shared/compartido/proyeccion.js)): medir en la del observador hace mentir a la proyección cuando están en husos distintos.
- **Revocar no borra**: `estado='revocada'` conserva el historial de avisos. Los eventos de sistema ("dejó de compartir Comida", "pausó") van en `compartido_avisos` con `tipo='sistema'` y `autor_id` NULL — el cliente no puede fabricarlos (`tipoAvisoSchema` excluye `sistema`).
- **Solo el emisor manda sobre el alcance** (403 si lo intenta el receptor). Un aviso sobre una categoría no compartida o un gasto no visible responde 404: si no, el endpoint sería un oráculo para adivinar ids ajenos.
- **Notificación in-app, no push** (el proyecto eliminó push en la migración 0027): `/api/compartido/novedades` alimenta el badge de navegación, una línea en el dashboard y el banner de [RecordatoriosBanner.vue](components/layout/RecordatoriosBanner.vue). Todos leen del MISMO estado, precargado en [prefetch.client.js](plugins/prefetch.client.js) — no se recalcula por consumidor ni se toca `/api/dashboard`.
- **Toda mutación invalida las lecturas.** Los endpoints responden con `Cache-Control` de 15–60 s, así que un refetch hecho justo después de mutar devuelve el estado ANTERIOR desde la caché del navegador. `useCompartido` mantiene un `epoch` (mismo idiom que `useGastos`) que toda mutación incrementa y que viaja como `_v` en conexiones, avisos, novedades y vista. Sin él: pausas una conexión y sigue diciendo "Activo"; mandas un aviso y no aparece ni recargando.
- **Un 404 de la vista es un estado normal, no un error.** Significa que el emisor pausó o dejó de compartir. [ConexionCard.vue](components/compartido/ConexionCard.vue) lo pinta como "no está compartiendo ahora mismo" y nunca como toast rojo — tanto al cargar como al sincronizar. Ese 404 en vivo manda sobre la copia local de la conexión, que puede llegar cacheada diciendo lo contrario.
- **Ids desde la URL: validar antes de consultar.** Un id que no es UUID llega a Postgres, revienta la query y devuelve un 500 que además filtra el error del driver. El guard usa `esUuid`; los servicios que consultan por id sin pasar por él (aceptar, rechazar, marcar aviso leído) lo llaman a mano.
- **Nada de `Date` dentro de plantillas `sql` crudas.** Interpolarlo lo manda como parámetro sin tipo y postgres.js falla al serializarlo. Usar los operadores de Drizzle (`gt`, `lt`…), que conocen el tipo de la columna. Este bug solo aparecía DESPUÉS de marcar la vista como vista, que es el orden real de uso.
- Conexiones **solo entre cuentas reales**: los perfiles gestionados de familia no invitan ni aceptan, y sus gastos (filas de otro `usuario_id`) no se comparten.

Schemas Zod en [compartido.js](shared/schemas/compartido.js); sus límites espejan los CHECK de la migración. Cobertura: `tests/compartido*.test.js` (unit), [compartido.api.spec.js](e2e/api/compartido.api.spec.js) (aislamiento entre cuentas — el grueso es negativo: qué NO se ve) y [compartido.ui.spec.js](e2e/ui/compartido.ui.spec.js).

---

## Base de datos ([schema.js](server/database/schema.js))

Tablas: `usuarios` (espejo de auth.users, + perfiles gestionados con contacto), `intenciones_registro`, `categorias`, `planes_mensuales` (UNIQUE usuario+mes+año), `gastos_planificados`, `gastos` (vínculo 1:1 opcional a planificado), `gastos_futuros`/`_detalles`/`_opciones`, `personas_entidades`, `deudas`, `pagos_deuda`, `configuraciones` (1:1 usuario), `auditoria_vinculos`, `vinculos_checkpoints`, `solicitudes_vinculo`, `ingresos`, `medios_ahorro`, `ahorros`, `metas_ahorro`, `plantillas_mes`, `uso_llm`, `llm_cache`, `google_calendar_conexiones`, `presupuestos_categoria`, `compartido_conexiones`/`compartido_categorias`/`compartido_avisos`.

Soft-delete (`deleted_at`) en gastos, deudas, pagos y personas_entidades — filtrar con `isNull()` en TODA query de lectura.

### Migraciones — REGLAS CRÍTICAS

- Archivos SQL en [migrations/](server/database/migrations/); se aplican con `npm run db:apply` ([apply-migrations.mjs](scripts/apply-migrations.mjs)), que lleva registro en la tabla `_migraciones_aplicadas` (transaccional para archivos nuevos; los que contienen `CREATE INDEX CONCURRENTLY` van fuera de transacción).
- **Las migraciones de producción las aplica GitHub Actions**, no el build: [migrate.yml](.github/workflows/migrate.yml) corre en cada push a `main` (y a mano con `workflow_dispatch`). Es el orden habitual — migrar primero, desplegar después — y aquí es seguro porque las migraciones solo añaden. El job tarda segundos; el build de Vercel, minutos.
- Requiere el secret **`DATABASE_URL`** del repositorio: la cadena del **session pooler** de Supabase, puerto **5432**. No sirve el transaction pooler (6543) porque postgres.js usa prepared statements y pgbouncer en modo transacción no los admite; tampoco la directa `db.<ref>.supabase.co`, que es solo IPv6 y los runners son IPv4. El mismo secret alimenta [db-backup.yml](.github/workflows/db-backup.yml).
- **Producción está detenida en `0019`.** `0020_hardening_indices_checks.sql` crea sus CHECK como `NOT VALID` y luego los `VALIDATE`; ese `VALIDATE` falla con `23514` porque hay filas legacy en `gastos` con `monto <= 0`. Como el archivo no contiene `CREATE INDEX CONCURRENTLY` (solo lo nombra en comentarios), corre dentro de una transacción y revierte entero — no deja nada a medias, pero tampoco deja pasar a `0021`–`0033`. Es un problema de datos, no de esquema: `npm run db:diagnostico` ([diagnostico-invariantes.mjs](scripts/diagnostico-invariantes.mjs)) cuenta las filas que lo bloquean sin imprimir montos ni ids, y el workflow lo ejecuta solo cuando la migración falla.
- Si el workflow falla, la BD queda atrás del código: [health.get.js](server/api/health.get.js) devuelve 503 por drift de columnas centinela. Nunca mergear código que dependa de una columna sin su migración en el mismo PR (causa del hotfix `2bb83a7`).
- Histórico: hasta septiembre de 2026 las migraciones vivían en `vercel.json` (`buildCommand: npm run db:apply && npm run build`). Como la cadena de conexión no llega al paso de Build en Vercel —una variable marcada _Sensitive_ existe solo en runtime—, el script salía con 1, el `&&` cortaba y no se publicó nada durante 51 días. `apply-migrations.mjs` acepta alias (`POSTGRES_URL_NON_POOLING`, `POSTGRES_URL`, `NUXT_DATABASE_URL`, `SUPABASE_DB_URL`) por si alguno sí llega, pero la fuente de verdad ya no es el build.
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

## Dependencias

`package.json` declara **`overrides`** para mantener el árbol libre de vulnerabilidades altas sin esperar a que los paquetes de arriba publiquen:

- `vite: ^8.2.0` — el árbol arrastraba un vite 7.3.3 en la raíz (advisories de `server.fs.deny` y `launch-editor`) solo por inercia del lockfile: todos sus consumidores admiten `>=6`. Unificar en vite 8 deja una sola copia deduplicada.
- `vite-plugin-pwa: ^1.3.0` — la versión que traía `@vite-pwa/nuxt` tenía un peer que excluía vite 8 y forzaba conservar el vite viejo.

Queda aceptada una vulnerabilidad **moderada**: `uuid <11.1.1` vía `exceljs`. Su único arreglo es bajar exceljs a 3.4.0 (downgrade mayor que rompe el export a Excel) y la ruta afectada no se usa. Por eso el umbral de la auditoría es `high`; está documentado en [security-audit.yml](.github/workflows/security-audit.yml).

Al tocar `overrides`, revalidar con `npm ci` + `npm run build` + la suite E2E completa: son paquetes del toolchain de build, no librerías de aplicación.

## Testing y CI

- Unit: `npm test` (Vitest, `tests/*.test.js` — lógica pura extraída de composables/utils).
- E2E: Playwright (`e2e/`) con page objects; proyectos `smoke | api | mobile | desktop | visual`; auth bypass con `DEV_AUTH_BYPASS=1` + token; Postgres efímera en CI.
- Workflows: `ci.yml` (unit + lint + build), `e2e.yml` (PRs y main), `e2e-visual-baseline.yml`, `migrate.yml` (migraciones de producción en cada push a `main`), `db-backup.yml` (dump semanal cifrado). Los dos últimos fallan en rojo si les falta su secret: un backup o una migración que no ocurre no puede reportarse en verde.

## Estructura

```
pages/          index(dashboard) · planificador · registro · deudas · ahorros · ingresos · futuros
                calendario · metricas · reportes · papelera · familia · compartido · categorias
                configuraciones
                informacion · login · auth/ · dev-login · control-acceso · acceso-pendiente · share
components/     layout/ · shared/ · planificador/ · registro/ · deudas/ · ahorros/ · ingresos/
                futuros/ · compartido/ · configuraciones/ · onboarding/
composables/    ~90 archivos — useGastos · useDeudas · usePlanificador · useAhorros · useIngresos
                useVinculos · usePerfiles · useLLMParser · useDraftManager · useApiFetch · useTheme ...
stores/         usuario · plantillas (Pinia)
shared/schemas/ Zod compartido cliente↔servidor
shared/compartido/ regla de visibilidad y proyección (lógica pura, sin BD)
server/api/     gastos · deudas · planificador · ahorros · ingresos · futuros · categorias
                configuraciones · perfiles · metricas · papelera · voz · integraciones/google
                acceso · superadmin · cron · dashboard · health · csp-report · errors
server/services/  lógica de negocio (9 servicios)
server/utils/     30 helpers (auth, rate limit, LLM, crypto, fechas, soft delete, ...)
server/database/  schema.js · migrations/ · seeds
e2e/ · tests/     Playwright · Vitest
```
