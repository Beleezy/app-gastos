#!/usr/bin/env node
/**
 * Aplica migraciones SQL con tabla de control (`_migraciones_aplicadas`).
 *
 * Diseño (ver docs/plan-mejoras-2026-07.md §1.1):
 *  - Cada archivo aplicado queda registrado (nombre + hash sha256 + fecha).
 *    En corridas siguientes los archivos registrados se saltan sin tocar la BD.
 *  - Archivo NUEVO → se aplica en una transacción: o entra completo o no entra
 *    (nada de aplicaciones parciales enmascaradas). Excepción: archivos con
 *    `CREATE INDEX CONCURRENTLY` no admiten transacción en Postgres; se
 *    ejecutan statement a statement y solo se registran si TODOS pasan.
 *  - BOOTSTRAP: la primera corrida (la tabla de control no existía) replica el
 *    comportamiento histórico — ignora errores "ya existe" (42P07, 42710,
 *    42701…) por statement — porque tanto la BD de producción como una BD
 *    limpia los producen: `0005_outgoing_captain_midlands.sql` es un catch-up
 *    de drizzle-kit que solapa con migraciones manuales posteriores (0007,
 *    0011). Tras el bootstrap, TODO archivo registrado queda cerrado y los
 *    nuevos se aplican en modo estricto.
 *  - Si el hash de un archivo ya registrado cambió, se avisa con WARN: una
 *    migración aplicada nunca debe editarse; se crea una nueva.
 *
 * Regla de nombres: un prefijo numérico = una migración. Ante conflicto de
 * numeración usar sufijo letra (`0005a_...`) para no alterar el orden.
 *
 * Variables: DATABASE_URL requerida (alias aceptados: POSTGRES_URL_NON_POOLING,
 * POSTGRES_URL, NUXT_DATABASE_URL, SUPABASE_DB_URL — ver ALIAS_URL_BD).
 */

import { readdir, readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { config as loadEnv } from 'dotenv'
import postgres from 'postgres'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: resolve(__dirname, '..', '.env') })
const MIGRATIONS_DIR = resolve(__dirname, '..', 'server', 'database', 'migrations')

const CONTROL_TABLE = '_migraciones_aplicadas'

// Solo en bootstrap: códigos de "el objeto ya existe" que el script
// histórico ignoraba para ser idempotente sin registro.
const BOOTSTRAP_IGNORABLE_CODES = new Set([
  '42P07', // relation already exists
  '42710', // object already exists (TYPE/CONSTRAINT)
  '42701', // column already exists
  '42P06', // schema already exists
  '42P16', // invalid table definition (re-add constraint)
])

// La cadena de conexión no siempre llega con el nombre DATABASE_URL:
//  - Vercel NO expone al paso de Build las variables marcadas como
//    "Sensitive"; ahí solo existen en runtime.
//  - La integración Supabase↔Vercel inyecta los nombres POSTGRES_*.
//  - Nuxt permite sobrescribir runtimeConfig.databaseUrl con NUXT_DATABASE_URL.
// Aceptar los alias evita que el deploy se caiga por el nombre de la variable
// en vez de por un problema real. El orden manda: DATABASE_URL primero.
const ALIAS_URL_BD = [
  'DATABASE_URL',
  'POSTGRES_URL_NON_POOLING',
  'POSTGRES_URL',
  'NUXT_DATABASE_URL',
  'SUPABASE_DB_URL',
]

const origenUrl = ALIAS_URL_BD.find((nombre) => (process.env[nombre] || '').trim())

if (!origenUrl) {
  const enVercel = Boolean(process.env.VERCEL)
  console.error(
    [
      '',
      '[db:apply] Sin cadena de conexión: ninguna de estas variables está definida',
      `           ${ALIAS_URL_BD.join(', ')}`,
      '',
      ...(enVercel
        ? [
            `Este build corre en Vercel (VERCEL_ENV=${process.env.VERCEL_ENV || '?'}).`,
            'Las variables marcadas como "Sensitive" NO se exponen al paso de Build,',
            'solo a runtime. Settings → Environment Variables: DATABASE_URL debe',
            'existir para Production y Preview SIN la marca Sensitive.',
            '',
          ]
        : []),
      'El build se detiene a propósito. Desplegar sin migrar publica código que',
      'apunta a columnas que todavía no existen — es el incidente 2bb83a7.',
      '',
    ].join('\n'),
  )
  process.exit(1)
}

const DATABASE_URL = process.env[origenUrl].trim()

// Solo host:puerto — `new URL().host` deja fuera usuario y contraseña, así que
// el log de build dice contra qué BD se migró sin filtrar credenciales.
function hostDe(url) {
  try {
    return new URL(url).host
  } catch {
    return '(cadena de conexión ilegible)'
  }
}

console.log(
  `[db:apply] destino ${hostDe(DATABASE_URL)}` +
    (origenUrl === 'DATABASE_URL' ? '' : ` (DATABASE_URL ausente; uso ${origenUrl})`),
)

// onnotice vacío: CREATE TABLE IF NOT EXISTS emite NOTICE en cada corrida
// y postgres.js lo imprime como objeto crudo — puro ruido en CI.
const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} })

function splitStatements(content) {
  return content
    .split(/-->\s*statement-breakpoint/i)
    .map((s) => s.trim())
    .filter(Boolean)
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex')
}

async function ensureControlTable() {
  const [{ existed }] = await sql`
    SELECT to_regclass(${'public.' + CONTROL_TABLE}) IS NOT NULL AS existed
  `
  await sql`
    CREATE TABLE IF NOT EXISTS "_migraciones_aplicadas" (
      "archivo" text PRIMARY KEY,
      "hash" text NOT NULL,
      "aplicada_en" timestamptz NOT NULL DEFAULT now()
    )
  `
  return existed
}

async function fetchApplied() {
  const rows = await sql`SELECT archivo, hash FROM "_migraciones_aplicadas"`
  return new Map(rows.map((r) => [r.archivo, r.hash]))
}

async function registrar(tx, file, hash) {
  await tx`
    INSERT INTO "_migraciones_aplicadas" ("archivo", "hash")
    VALUES (${file}, ${hash})
  `
}

// Bootstrap: statement a statement, ignorando "ya existe" (más la heurística
// histórica de 42P01 tras skips previos, por statements que referencian
// objetos de un cleanup parcial).
async function applyBootstrap(file, statements) {
  let applied = 0
  let skipped = 0
  for (const stmt of statements) {
    try {
      await sql.unsafe(stmt)
      applied++
    } catch (e) {
      if (BOOTSTRAP_IGNORABLE_CODES.has(e.code) || (e.code === '42P01' && skipped > 0)) {
        skipped++
        continue
      }
      throw Object.assign(e, { failedStatement: stmt })
    }
  }
  return { applied, skipped }
}

// Estricto sin transacción (archivos con CREATE INDEX CONCURRENTLY): cada
// statement debe pasar; el registro se hace al final. Si falla a medias, el
// error aborta el proceso y el archivo NO queda registrado — al corregirlo,
// los statements ya aplicados deben ser re-ejecutables (IF NOT EXISTS).
async function applyNonTransactional(file, statements, hash) {
  for (const stmt of statements) {
    try {
      await sql.unsafe(stmt)
    } catch (e) {
      throw Object.assign(e, { failedStatement: stmt })
    }
  }
  await registrar(sql, file, hash)
  return { applied: statements.length, skipped: 0 }
}

// Estricto transaccional: statements + registro en la misma transacción.
async function applyTransactional(file, statements, hash) {
  await sql.begin(async (tx) => {
    for (const stmt of statements) {
      try {
        await tx.unsafe(stmt)
      } catch (e) {
        throw Object.assign(e, { failedStatement: stmt })
      }
    }
    await registrar(tx, file, hash)
  })
  return { applied: statements.length, skipped: 0 }
}

async function main() {
  const controlExisted = await ensureControlTable()
  const bootstrap = !controlExisted
  if (bootstrap) {
    console.log(
      `Tabla ${CONTROL_TABLE} creada — modo BOOTSTRAP (errores "ya existe" ignorados por esta única vez).`,
    )
  }

  const appliedMap = await fetchApplied()
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort()

  let totalApplied = 0
  let totalSkippedFiles = 0

  for (const file of files) {
    const content = await readFile(resolve(MIGRATIONS_DIR, file), 'utf8')
    const hash = sha256(content)

    if (appliedMap.has(file)) {
      if (appliedMap.get(file) !== hash) {
        console.warn(
          `⚠ WARN: ${file} fue modificado después de aplicarse (hash distinto). ` +
            'Una migración aplicada no debe editarse — crea una migración nueva.',
        )
      }
      totalSkippedFiles++
      continue
    }

    const statements = splitStatements(content)
    if (statements.length === 0) {
      await registrar(sql, file, hash)
      continue
    }

    try {
      let result
      if (bootstrap) {
        result = await applyBootstrap(file, statements)
        await registrar(sql, file, hash)
      } else if (/CREATE\s+INDEX\s+CONCURRENTLY/i.test(content)) {
        result = await applyNonTransactional(file, statements, hash)
      } else {
        result = await applyTransactional(file, statements, hash)
      }
      console.log(`✓ ${file} → ${result.applied} aplicados, ${result.skipped} ignorados`)
      totalApplied++
    } catch (e) {
      console.error(
        `\n[FAIL] ${file}\n  code=${e.code}\n  message=${e.message}\n  ---\n  ${(e.failedStatement || '').slice(0, 200)}…\n`,
      )
      console.error('El archivo NO quedó registrado; la BD no registró la migración como aplicada.')
      await sql.end()
      process.exit(1)
    }
  }

  console.log(
    `\nTotal: ${totalApplied} migraciones aplicadas, ${totalSkippedFiles} ya registradas (skip).`,
  )
  await sql.end()
}

const CODIGOS_CONEXION = new Set([
  'ENOTFOUND',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ECONNRESET',
  'CONNECT_TIMEOUT',
  '28P01', // password de autenticación inválido
  '3D000', // la base de datos no existe
])

main().catch((e) => {
  if (CODIGOS_CONEXION.has(e.code)) {
    console.error(
      `\n[db:apply] No se pudo conectar a ${hostDe(DATABASE_URL)} (code=${e.code}).\n` +
        `           La cadena vino de ${origenUrl}. Revisa que apunte al pooler de\n` +
        '           Supabase y que la red del build tenga salida hacia él.\n',
    )
  } else {
    console.error('Error fatal:', e)
  }
  sql.end().finally(() => process.exit(1))
})
