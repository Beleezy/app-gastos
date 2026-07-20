# Bitácora — Implementación del plan de mejoras (julio 2026)

> Registro **paso a paso** de lo ejecutado en la ronda que implementó
> [plan-mejoras-2026-07.md](./plan-mejoras-2026-07.md), para poder repetir
> cualquier parte desde cero. Commits: `fbcf263` (funcional) y `40c086b`
> (formateo Prettier aislado), rama `claude/fable-5-review-improvements-q1n0sf`.

---

## 1. Pipeline de migraciones (§1.1–1.2 del plan)

**Problema:** el deploy no aplicaba migraciones (causa del hotfix `2bb83a7`),
el script ignoraba errores "ya existe" enmascarando aplicaciones parciales, y
había prefijos duplicados (`0005_*` ×2, `0013_*` ×2).

**Pasos ejecutados:**

1. Renombrar duplicados SIN alterar el orden alfabético de aplicación
   (el sufijo letra ordena después del `_` del otro archivo):
   ```bash
   git mv server/database/migrations/0005_vinculos_checkpoints.sql \
          server/database/migrations/0005a_vinculos_checkpoints.sql
   git mv server/database/migrations/0013_tamano_letra.sql \
          server/database/migrations/0013a_tamano_letra.sql
   ```
2. Reescribir `scripts/apply-migrations.mjs` con esta lógica:
   - Tabla de control `_migraciones_aplicadas (archivo pk, hash sha256, aplicada_en)`,
     creada con `CREATE TABLE IF NOT EXISTS` al inicio; `onnotice: () => {}` en
     el cliente `postgres` para silenciar el NOTICE de re-corridas.
   - Archivo ya registrado → skip (WARN si el hash cambió: nunca editar
     migraciones aplicadas).
   - **Bootstrap** (solo si la tabla de control no existía): statement a
     statement ignorando `42P07/42710/42701/42P06/42P16` (+ heurística
     `42P01` tras skips). Necesario incluso en BD limpia porque
     `0005_outgoing_captain_midlands.sql` es un catch-up de drizzle-kit que
     solapa con 0007/0011. Al final, registra TODOS los archivos.
   - Archivo nuevo post-bootstrap → **transacción** (statements + INSERT del
     registro juntos; si algo falla, rollback y exit 1 sin registrar).
   - Excepción: archivo que contiene `CREATE INDEX CONCURRENTLY` no admite
     transacción → se ejecuta statement a statement y se registra solo si
     todos pasan (los statements deben ser re-ejecutables: `IF NOT EXISTS`).
3. Probar contra Postgres real (efímero, como root se necesita un usuario):
   ```bash
   useradd -m pguser
   su pguser -c "initdb -D $DIR/pg/data -U postgres --auth=trust && \
                 pg_ctl -D $DIR/pg/data -o '-p 55432' start"
   psql -h localhost -p 55432 -U postgres -c "CREATE DATABASE gastos_mig_test"
   export DATABASE_URL="postgres://postgres@localhost:55432/gastos_mig_test"
   node scripts/apply-migrations.mjs   # bootstrap: 34 migraciones
   node scripts/apply-migrations.mjs   # re-corrida: 0 aplicadas, 34 skip
   # rollback: migración de prueba que falla en el 2.º statement →
   # el 1.º NO queda aplicado ni el archivo registrado (verificado con psql)
   # re-bootstrap: DROP TABLE _migraciones_aplicadas + re-corrida → OK
   ```
4. Crear `vercel.json`:
   ```json
   { "buildCommand": "npm run db:apply && npm run build" }
   ```
   Con esto **cada deploy aplica migraciones antes de compilar**; si una
   falla, el build aborta y el código nuevo no se despliega.

## 2. Health check con detección de drift (§1.1.3)

En `server/api/health.get.js`, tras el `SELECT 1`:

- Lista `SENTINEL_COLUMNS` = pares `[tabla, columna]` de migraciones
  recientes de las que el código depende (hoy: `personas_entidades.deleted_at`,
  `usuarios.correo_contacto`, `usuarios.telefono`).
- Una sola query a `information_schema.columns` con `(table_name, column_name)
IN (...)`; si falta alguna → `503` con `checks.schema='drift'` (la lista
  `faltantes` solo se expone fuera de producción).
- **Mantenimiento:** al añadir una columna crítica, reemplazar la centinela
  más antigua por la nueva.

## 3. Backup semanal cifrado (§1.3)

`.github/workflows/db-backup.yml`:

- Cron lunes 09:00 UTC + `workflow_dispatch` manual.
- Guard: si faltan secrets, warning y skip (no falla).
- Instala `postgresql-client-17` desde PGDG (pg_dump ≥ versión del server).
- `pg_dump "$DB_URL" --format=custom --no-owner --no-privileges` →
  `gpg --batch --symmetric --cipher-algo AES256` → artifact 90 días.
- Secrets requeridos: `BACKUP_DATABASE_URL` (cadena DIRECTA puerto 5432,
  el pooler de transacción 6543 NO sirve para pg_dump) y `BACKUP_PASSPHRASE`
  (`openssl rand -base64 24`, guardarla fuera del repo).
- Restaurar: `gpg --decrypt ... | pg_restore --clean --if-exists -d "$URL"`.

## 4. Soft-delete de personas restaurado (§2.3)

```bash
git revert --no-commit 2bb83a7   # el hotfix que lo quitó
git revert --quit                # limpiar estado del sequencer
```

Restaura: columna `deletedAt` en schema, migración
`0032_personas_soft_delete.sql` (ALTER + índice, ambos `IF NOT EXISTS`),
filtros `isNull(deletedAt)` en lecturas, soft-delete en DELETE de persona,
restauración en papelera y purga en cron. Verificado aplicando la 0032 en
modo estricto sobre la BD de prueba (columna + índice presentes).

## 5. Limpieza de previews (§2.1)

```bash
git rm -r components/preview components/preview3
git rm pages/preview.vue pages/preview-v3.vue composables/useUiPreview.js \
       replace_colors.cjs docs/ui-redesign-mockup.html
```

Además: quitar de `pages/configuraciones.vue` la sección del toggle
"Vista previa" (template + `useUiPreview()` + `toggleUiPreview` +
`initUiPreview()` en `onMounted`). Verificar cero referencias restantes:
`grep -rn "useUiPreview\|preview-v3\|/preview'" pages/ components/ ...`

## 6. Documentación (§2.2)

- `CLAUDE.md` reescrito al estado real: tabla de 18 módulos con página →
  qué hace → piezas clave, hot paths de captura, vínculos, tablas de BD,
  reglas de migraciones, capa servidor, convenciones cliente, testing/CI.
- `README.md`: sección "Operaciones (producción en free tier)" con deploy/
  migraciones, backups, uptime (UptimeRobot → `/api/health` cada 5 min como
  keep-alive de Supabase free) y Upstash para rate limit distribuido.

## 7. Lint bloqueante (§3.1)

El paso clave: los 655 errores `no-undef` eran auto-imports de Nuxt que el
config no conocía. Solución oficial, no listas manuales:

1. `npm i -D @nuxt/eslint` y añadir `'@nuxt/eslint'` a `modules` en
   `nuxt.config.ts`. En `nuxt prepare` (postinstall) genera
   `.nuxt/eslint.config.mjs` con los globals del proyecto.
2. `eslint.config.mjs` pasa a `import withNuxt from './.nuxt/eslint.config.mjs'`
   y las reglas propias van en `withNuxt({...})`. Ignorar además
   `types/database.types.ts` (generado).
3. Reglas ajustadas con criterio (no silenciadas a ciegas):
   - `no-empty: ['error', { allowEmptyCatch: true }]` — `catch {}` es guard
     deliberado en esta base.
   - `@typescript-eslint/no-unused-vars: warn` con prefijo `_` y
     `caughtErrors: 'none'` — misma política incremental que ya tenía
     `no-unused-vars`.
   - `import/first: off` solo en `tests/**` (patrón vi.mock).
4. `npm run lint:fix` + fixes manuales de lo que quedó (46): regexes de
   invisibles con escapes `\uXXXX` en `llmSafety.js`/`sqlSafe.js`, NBSP/BOM
   escapados en `useCurrency`/`useExportCsv`, `no-useless-assignment` en
   3 archivos, escapes innecesarios en 2 regexes, disable-comments puntuales
   (fixture de Playwright, `delete` dinámico, `@ts-ignore` de nuxt.config).
5. **Bug real encontrado por el lint:** `server/utils/recurrente.js` usaba
   la tabla `gastos` sin importarla → ReferenceError al borrar recurrencias
   futuras. Fix: añadirla al import del schema.
6. `ci.yml`: quitar `continue-on-error` de ESLint y Prettier.
7. Prettier: `npm run format` sobre toda la base (330 archivos) en un
   **commit separado** para que el diff funcional siga siendo revisable.

## 8. CI/CD extra (§3.2–3.3)

- `e2e.yml`: matriz `[smoke, api, mobile, desktop]` (antes sin smoke).
- `.github/dependabot.yml`: npm semanal agrupando minor+patch en 1 PR
  (máx. 3 abiertos), majors individuales; github-actions mensual.
- `.github/workflows/security-audit.yml`: `npm audit --audit-level=high
--omit=dev` semanal + manual (sin `npm ci`, audit lee el lockfile).

## 9. UX / seguridad (§4.1–4.2, 5.1 parcial)

- **Zoom:** viewport queda `width=device-width, initial-scale=1` (sin
  `maximum-scale`/`user-scalable`); en `main.css` → `touch-action:
manipulation` sobre `button, a, input, select, textarea, [role='button']`
  para evitar el double-tap-zoom accidental sin bloquear el pinch.
- **Inter auto-hospedada:**
  1. Descargar la variable (300–700) desde Google Fonts con UA de Chrome:
     `curl 'https://fonts.googleapis.com/css2?family=Inter:wght@300..700&display=swap'`
     → extraer URLs woff2 de los bloques `/* latin */` y `/* latin-ext */` →
     guardar en `public/fonts/inter-var-latin{,-ext}.woff2` (48+84 KB).
  2. `@font-face` al inicio de `main.css` con `font-weight: 300 700`,
     `font-display: swap` y los `unicode-range` copiados de Google (así
     latin-ext solo se descarga si hace falta).
  3. `nuxt.config.ts`: quitar link CSS de Google Fonts y sus 2 preconnect;
     añadir `<link rel="preload" as="font">` del woff2 latin.
  4. Workbox: quitar la regla runtime de `fonts.gstatic.com`; añadir `woff2`
     a `globPatterns` (precache, disponible offline).
  5. CSP (`00.security-headers.js`): `style-src` y `font-src` sin los
     orígenes de Google.
- **csp-report:** techo `MAX_BODY_BYTES = 32 KB` (rechazo por
  `content-length` antes de parsear) y `MAX_REPORTS = 10` por request.

## 10. Verificación final

```bash
npm test          # 386 tests, 46 archivos — verde
npm run lint      # 0 errores (115 warnings, no bloquean)
npm run format:check  # limpio
SUPABASE_URL=http://localhost SUPABASE_ANON_KEY=placeholder npm run build  # OK
# + fonts presentes en .output/public/fonts y en el precache del SW
```

## Pendiente manual (fuera del repo)

1. Secrets `BACKUP_DATABASE_URL` + `BACKUP_PASSPHRASE` en GitHub Actions y
   primera corrida manual de "DB Backup".
2. Monitor de UptimeRobot → `https://<app>/api/health` cada 5 min.
3. `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` en Vercel.
