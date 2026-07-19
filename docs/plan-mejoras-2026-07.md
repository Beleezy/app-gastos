# Plan de Mejoras — Julio 2026 (revisión exhaustiva)

> Revisión de tech lead sobre el estado real del código a julio 2026, posterior a los 40+ sprints
> de `planifica.md`. Cada propuesta incluye **veredicto de viabilidad** bajo dos restricciones
> explícitas: **infraestructura gratuita** (Vercel free, Supabase free, Gemini free tier, GitHub
> Actions free) y **uso personal** (un usuario principal + allowlist, sin metas de escala).
>
> Convenciones: Severidad 🔴 Crítico · 🟠 Alto · 🟡 Medio · 🟢 Bajo — Esfuerzo **S** (≤ 0.5 d) ·
> **M** (0.5–2 d) · **L** (2–5 d) — Veredicto ✅ Hacer · 🕐 Hacer después · ❌ Descartada.

---

## 0. Diagnóstico general

La base está **muy por encima de la media** para un proyecto personal: capa de servicios con
handlers delgados, Zod compartido cliente↔servidor, rate limiting con driver Upstash opcional,
CSP activa + política estricta en Report-Only, logger con redacción, mitigación de prompt
injection con delimitadores + sanitización (`llmSafety.js`), caché y cuotas LLM, soft-delete con
papelera, ~50 suites unit + Playwright (api/ui/visual), OpenAPI generado y CI en Actions. El
`planifica.md` original está esencialmente **ejecutado**.

Los problemas que quedan no son de features: son de **fiabilidad operativa** (el único incidente
real de producción vino de ahí), **higiene del repo** y **deuda de mantenimiento**. Este plan
prioriza eso.

### Resumen ejecutivo

| # | Mejora | Sev. | Esf. | Veredicto |
|---|--------|------|------|-----------|
| 1.1 | Pipeline de migraciones con tabla de control + deploy | 🔴 | M | ✅ |
| 1.2 | Normalizar numeración de migraciones duplicadas | 🔴 | S | ✅ |
| 1.3 | Backup automático de la BD (Supabase free no incluye) | 🔴 | S | ✅ |
| 1.4 | Keep-alive Supabase + uptime monitor externo | 🟠 | S | ✅ |
| 2.1 | Eliminar código muerto de previews (V1/V3/V5) | 🟠 | S | ✅ |
| 2.2 | Actualizar CLAUDE.md al estado real | 🟠 | S | ✅ |
| 2.3 | Restaurar soft-delete de `personas_entidades` (revertido en hotfix) | 🟠 | M | ✅ |
| 3.1 | Promover lint a check bloqueante | 🟡 | M | ✅ |
| 3.2 | Job E2E smoke en CI de PRs | 🟡 | S | ✅ |
| 3.3 | Dependabot/npm audit programado | 🟡 | S | ✅ |
| 4.1 | Permitir zoom (quitar `user-scalable=no`) | 🟡 | S | ✅ |
| 4.2 | Self-host de la fuente Inter | 🟡 | S | ✅ |
| 4.3 | Refactor incremental de componentes >600 líneas | 🟡 | L | 🕐 |
| 5.1 | CSP estricta con nonce en header activo | 🟡 | L | 🕐 |
| — | Migración a TypeScript, RLS total, Sentry pago, Redis dedicado, multi-tenant | — | XL | ❌ |

---

## 1. Fiabilidad operativa (P0 — aquí estuvo el único incidente real)

### 1.1 Pipeline de migraciones con tabla de control 🔴 (M) — ✅ HACER

**Evidencia.** El hotfix `2bb83a7` tumbó Deudas en producción: la ronda 2 añadió `deleted_at` a
`personas_entidades` (migración 0032), el código la referenciaba, pero **el deploy de Vercel solo
ejecuta `nuxt build` y nunca aplica migraciones**. Hubo que revertir la feature completa. Además:

- El journal de Drizzle (`meta/_journal.json`) solo registra hasta la migración `0005`; las
  0006–0031 son SQL manuales fuera del tracking de drizzle-kit.
- `scripts/apply-migrations.mjs` es "idempotente" ignorando códigos de error (`42P07`, `42701`…),
  lo cual **enmascara aplicaciones parciales**: si una migración de 5 statements falla en el 3.º
  por otra causa, los 2 primeros quedan aplicados y no hay registro de en qué estado quedó.

**Propuesta.**
1. Añadir tabla `_migraciones_aplicadas (archivo text pk, hash text, aplicada_en timestamptz)`.
   `apply-migrations.mjs` pasa a: saltar archivos ya registrados → ejecutar cada archivo nuevo
   dentro de una transacción → registrar al confirmar. Los códigos ignorables se conservan solo
   como *bootstrap* la primera vez (BD existente sin tabla de control).
2. Ejecutar migraciones en el deploy: en Vercel, Build Command =
   `npm run db:apply && npm run build` (la build ya tiene `DATABASE_URL`). Con la tabla de
   control, correr esto en cada build es barato y seguro. Alternativa equivalente: job de
   GitHub Actions en push a `main` que corre `db:apply` antes de que Vercel despliegue.
3. Extender `/api/health` (solo fuera de prod, o bajo `CRON_SECRET`) con un check de *drift*:
   comparar `SELECT column_name FROM information_schema.columns` contra 3–4 columnas centinela
   recientes del schema. El smoke E2E post-deploy lo consume.

**Por qué es viable:** cero costo, ~1 día, y elimina la clase entera de incidente que ya ocurrió
una vez. Es la mejora con mejor ratio riesgo-eliminado/esfuerzo de todo el plan.

### 1.2 Normalizar numeración de migraciones 🔴 (S) — ✅ HACER

Existen prefijos duplicados: `0005_vinculos_checkpoints.sql` vs `0005_outgoing_captain_midlands.sql`
y `0013_modo_daltonico.sql` vs `0013_tamano_letra.sql`. `apply-migrations.mjs` ordena por nombre
de archivo, así que el orden relativo entre duplicados es alfabético-accidental. Hoy funciona de
casualidad; con la tabla de control de 1.1 el nombre pasa a ser clave primaria, así que hay que
sanear antes: renombrar los duplicados a sufijos únicos (`0005a_…`) en el mismo PR que 1.1,
registrando ambos nombres en el bootstrap. Regla nueva en README: un prefijo = una migración.

### 1.3 Backup automático de la BD 🔴 (S) — ✅ HACER

Supabase free **no incluye backups** (los daily backups son de Pro). Toda la información
financiera personal vive en esa BD; un borrado accidental, una migración destructiva o la
purga del proyecto por inactividad la pierde entera.

**Propuesta.** Workflow de GitHub Actions programado (semanal, cron) que corre `pg_dump`
contra `DATABASE_URL` (secret del repo) y sube el dump **cifrado** (con `gpg --symmetric` y una
passphrase en secrets) como artifact (retención 90 días) — opcionalmente un segundo job mensual
que lo commitea a un repo privado dedicado para retención indefinida. Costo: cero. Esfuerzo:
medio día. Es la póliza de seguro más barata disponible.

### 1.4 Keep-alive + uptime monitor 🟠 (S) — ✅ HACER

Supabase free **pausa el proyecto tras ~7 días sin actividad**; al pausarse, la app entera queda
caída hasta restaurarlo a mano. `/api/health` ya hace `SELECT 1` contra la BD, así que basta un
monitor externo gratuito (UptimeRobot free: ping cada 5 min) apuntando a `/api/health`:

- Mantiene el proyecto Supabase activo (el ping toca la BD).
- Da alerta por email si la app o la BD se caen — hoy no hay ninguna alerta y el incidente del
  hotfix se descubrió usando la app.

Complemento: el workflow de backup de 1.3 también genera actividad semanal como red de respaldo.

---

## 2. Higiene del repo y deuda del último ciclo (P1)

### 2.1 Eliminar código muerto de previews 🟠 (S) — ✅ HACER

El ciclo de rediseño (PRs #62–#65) dejó **tres generaciones de vistas previas** en el repo:
`components/preview/` (15 componentes, 136 KB), `components/preview3/` (15 componentes, 120 KB),
`pages/preview.vue`, `pages/preview-v3.vue`, más `replace_colors.cjs` en la raíz y
`docs/ui-redesign-mockup.html`. El diseño ganador (V4) ya está aplicado a los componentes reales.

Mantenerlos tiene costo real: 30 componentes en auto-import de Nuxt, dos rutas navegables en
producción que muestran datos simulados, ruido en cada búsqueda/refactor global (los previews
duplican nombres como `Money.vue`, `PageHeader.vue`), y confusión para cualquier sesión de IA
futura. **Todo está en el historial de git** — borrar es reversible por definición. Borrar
también `pages/dev-login.vue` de la build de producción si no está ya condicionado por entorno
(verificar; si se usa en E2E, excluirlo vía `routeRules`/flag en lugar de mantenerlo público).

### 2.2 Actualizar CLAUDE.md 🟠 (S) — ✅ HACER

El CLAUDE.md describe 3 módulos; la app real tiene **más del doble**: ahorros, ingresos, cuentas,
perfiles gestionados/familia, plantillas de mes, dashboard consolidado, métricas, reportes,
papelera, calendario, push, Google Calendar, control de acceso por allowlist, stores Pinia,
`shared/schemas`, capa `server/services`, `server/utils` (30 helpers), E2E con page objects.

Para un proyecto que se desarrolla principalmente con agentes de IA, el CLAUDE.md **es** la
documentación operativa: cada sesión que arranca con el mapa desactualizado re-explora el repo
(lento) o asume estructura que ya no existe (errores). Reescribirlo al estado real y añadir la
regla de mantenerlo al cierre de cada ronda. Aprovechar para actualizar el "Hot paths" del
README (tiene una frase inacabada: *"análogo a venir en services/deudas.service.js"*).

### 2.3 Restaurar soft-delete de personas 🟠 (M) — ✅ HACER (después de 1.1)

El hotfix revirtió una feature terminada (papelera para `personas_entidades`) por culpa del
pipeline, no del código. Con 1.1 y 1.2 en su lugar: re-crear la migración `deleted_at` con
número nuevo, re-aplicar el código revertido (está en el historial: revert de `2bb83a7`),
y verificar con el smoke post-deploy. Es la validación de fuego real del nuevo pipeline.

---

## 3. Calidad continua (P1–P2)

### 3.1 Lint bloqueante 🟡 (M) — ✅ HACER

El job de ESLint corre con `continue-on-error: true` por "errores legacy". Un lint no bloqueante
tiende a cero valor: nadie mira un check amarillo. Plan: una pasada `lint:fix` + limpieza manual
del resto (el grueso suele ser autofixable), y en el mismo PR quitar `continue-on-error`. Si
quedan reglas conflictivas, degradarlas explícitamente en `eslint.config.mjs` con comentario, no
dejar el job entero en modo decorativo.

### 3.2 E2E smoke en CI de PRs 🟡 (S) — ✅ HACER

Existe suite Playwright completa y un workflow `e2e.yml`, pero el CI de PRs solo corre unit +
build. El incidente del hotfix (500 en `/api/deudas`) lo habría detectado un smoke con BD
migrada desde cero. Añadir al `ci.yml` un job con Postgres de servicio (contenedor
`postgres:15`), `db:apply` + seed y `test:e2e:smoke`. Minutos de Actions: gratis en repo
privado hasta 2.000/mes — un smoke de ~3 min por PR cabe de sobra. Esto además prueba las
migraciones contra BD limpia en cada PR (refuerza 1.1).

### 3.3 Dependencias vigiladas 🟡 (S) — ✅ HACER

Activar Dependabot (config `dependabot.yml`, agrupando updates menores en un PR semanal) y
añadir `npm audit --audit-level=high` como job programado semanal (ya existe el script
`security:audit`, solo no lo corre nadie). Para una app financiera expuesta a internet, es lo
mínimo; costo cero.

---

## 4. UX / Performance (P2 — el grueso ya está hecho)

### 4.1 Permitir zoom 🟡 (S) — ✅ HACER

El viewport lleva `maximum-scale=1, user-scalable=no`. Eso viola WCAG 1.4.4 (resize text) y es
hostil justo para el caso de uso que motivó la ronda "texto grande": quien necesita letra grande
también necesita pellizcar para ampliar un gráfico o un número. iOS moderno ya ignora la
directiva, Android la respeta — es decir, hoy castiga solo a Android. Quitar ambas; el layout es
responsive y no depende de bloquear zoom. (El doble-tap-zoom accidental se controla con
`touch-action: manipulation` en los botones, no bloqueando el zoom global.)

### 4.2 Self-host de Inter 🟡 (S) — ✅ HACER

Hoy la fuente viene de Google Fonts con el hack `media="print"` para no bloquear render — señal
de que ya dolió (comentario: "1–3 s de splash blanco en PWA Android"). Self-hostear los 2–3
pesos realmente usados como woff2 en `public/fonts/` + `font-display: swap` elimina: 2
preconnects, un third-party completo, la dependencia de red externa en una PWA offline-first, y
las directivas `fonts.googleapis/gstatic` de la CSP (superficie menor). El precache del SW la
deja disponible offline desde la segunda visita.

### 4.3 Componentes gigantes 🟡 (L) — 🕐 DESPUÉS, incremental

`futuros/Lista.vue` (1.398 líneas), `pages/registro.vue` (805), `DetallePersona.vue` (764),
`ListaGastosPlaneados.vue` (681), `HistorialDiario.vue` (671). Son los archivos donde más cuesta
hacer cambios sin romper algo. **No** hacer un big-bang de refactor (alto riesgo, cero valor
visible): aplicar regla boy-scout — cuando una ronda toque uno de estos archivos, extraer
primero el sub-bloque afectado a componente/composable con test. `futuros/Lista.vue` es el
único candidato a refactor dedicado si Futuros va a recibir features pronto.

---

## 5. Seguridad (P2 — la base ya es sólida)

### 5.1 CSP estricta en header activo 🟡 (L) — 🕐 DESPUÉS

La política estricta con nonce ya existe en Report-Only con telemetría a `/api/csp-report`; la
activa mantiene `unsafe-inline` porque Nuxt/PWA inyectan scripts inline sin nonce. Migrarla
exige plugin SSR que propague nonce a todos los inline — trabajo fino con riesgo de romper
hidratación. Con allowlist de acceso, un solo usuario real y la Report-Only vigilando, el
retorno inmediato es bajo. Mantener en backlog; revisar reportes CSP acumulados antes de
intentarlo. **Sí hacer ahora** (S, en el PR de 3.3): revisar que `/api/csp-report` tenga tope
de tamaño de body y límite de retención para que no pueda inflar la BD/logs.

### 5.2 Ya cubierto — no re-trabajar

Auditoría confirmó que ya existen (no proponer de nuevo en futuras rondas): rate limit por
IP + usuario con driver Upstash; sanitización y delimitación de input LLM + validación Zod de
la respuesta; cuota mensual LLM por usuario con UI de consumo; redacción de secretos en logs;
`assertOwner` contra IDOR + suite `seguridad.api.spec.js`; headers completos (HSTS, COOP,
CORP, Permissions-Policy); CORS con allowlist; cifrado de refresh tokens de Google (AES);
`X-Cron-Secret` en crons; bypass de dev auth excluido del bundle de producción.

**Acción de configuración (no de código), S:** si el deploy de producción está en Vercel y las
env `UPSTASH_REDIS_REST_URL/TOKEN` no están configuradas, crear la instancia free de Upstash y
setearlas — el código ya la soporta y sin ella el rate limit es por-instancia (bypasseable en
serverless). Verificar en el dashboard de Vercel; es un checkbox pendiente, no un desarrollo.

---

## 6. Descartadas (y por qué, para no reevaluarlas cada ronda)

| Idea | Por qué se descarta |
|---|---|
| **Migrar a TypeScript** | Reescritura XL sobre ~200 archivos JS estables. Zod compartido + tests ya dan el grueso del valor de contratos. Para uso personal, el costo/beneficio es claramente negativo. |
| **RLS de Supabase como capa de autorización** | La app accede por Drizzle con conexión directa (rol postgres), no por PostgREST: RLS no aplicaría al tráfico real sin rehacer la capa de datos. `assertOwner` + filtros por `usuario_id` + tests IDOR cumplen esa función. |
| **Sentry / observabilidad SaaS** | Ya hay `useErrorReporter` + `/api/errors` + logger estructurado. El free tier de Sentry añade otro third-party y cuota que vigilar para un solo usuario. UptimeRobot (1.4) cubre la alerta que de verdad falta. |
| **Redis/cola dedicada, SSR caching avanzado** | Un usuario. El dashboard consolidado + SWR del SW ya dejaron el TTI donde debe estar. |
| **Multi-tenancy / monetización / landing** | Fuera del objetivo declarado (uso personal con allowlist). |
| **Migrar de Web Speech API a STT de pago** | El flujo voz→LLM ya tiene confirmación manual que absorbe errores de transcripción. Gemini free + caché + cuotas mantienen costo cero. |

---

## 7. Orden de ejecución sugerido

1. **Ronda A — Operaciones (P0):** 1.2 → 1.1 → 1.3 → 1.4 (+ config Upstash de 5.2).
   *Resultado: la clase de incidente del hotfix queda extinta; hay backups y alertas.*
2. **Ronda B — Higiene:** 2.1 → 2.2 → 3.3 → 4.1.
   *Resultado: repo limpio, docs fieles, dependencias vigiladas. Todo S, un día en total.*
3. **Ronda C — Validación del pipeline:** 2.3 (restaurar soft-delete personas) + 3.2 (smoke en CI).
4. **Ronda D — Calidad:** 3.1 (lint bloqueante) → 4.2 (fuentes).
5. **Backlog vivo:** 4.3 y 5.1 según se toquen las áreas.
