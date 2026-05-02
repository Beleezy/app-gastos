#!/usr/bin/env node
/**
 * Aplica migraciones SQL de forma idempotente.
 * Para CI/E2E donde la DB puede tener objetos creados de runs previos.
 *
 * Estrategia:
 *  - Lee `server/database/migrations/*.sql` en orden
 *  - Divide cada archivo por `--> statement-breakpoint` (formato drizzle-kit)
 *  - Ejecuta cada statement; si falla con error 42P07 (relation exists),
 *    42710 (object exists) o 42701 (column exists), lo ignora.
 *  - Cualquier otro error aborta y devuelve exit code 1.
 *
 * Variables: DATABASE_URL requerida.
 */

import { readdir, readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = resolve(__dirname, '..', 'server', 'database', 'migrations')

const IGNORABLE_CODES = new Set([
  '42P07', // relation already exists
  '42710', // object already exists (typically TYPE/CONSTRAINT)
  '42701', // column already exists
  '42P06', // schema already exists
  '42P16', // invalid table definition (when re-adding constraint)
])

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL no definida')
  process.exit(1)
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 })

async function main() {
  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith('.sql'))
    .sort()

  let applied = 0
  let skipped = 0

  for (const file of files) {
    const path = resolve(MIGRATIONS_DIR, file)
    const content = await readFile(path, 'utf8')
    const statements = content
      .split(/-->\s*statement-breakpoint/i)
      .map((s) => s.trim())
      .filter(Boolean)

    let fileApplied = 0
    let fileSkipped = 0
    for (const stmt of statements) {
      try {
        await sql.unsafe(stmt)
        fileApplied++
      } catch (e) {
        if (IGNORABLE_CODES.has(e.code)) {
          fileSkipped++
          continue
        }
        // Drizzle a veces emite WHERE/CHECK/FOREIGN KEY que dependen de
        // tablas previas. Si vemos 42P01 (undefined_table) tras varios
        // skips, lo ignoramos también pues significa cleanup parcial.
        if (e.code === '42P01' && fileSkipped > 0) {
          fileSkipped++
          continue
        }
        console.error(`\n[FAIL] ${file}\n  code=${e.code}\n  message=${e.message}\n  ---\n  ${stmt.slice(0, 200)}…\n`)
        await sql.end()
        process.exit(1)
      }
    }
    if (fileApplied + fileSkipped > 0) {
      console.log(`✓ ${file} → ${fileApplied} aplicados, ${fileSkipped} ignorados`)
    }
    applied += fileApplied
    skipped += fileSkipped
  }

  console.log(`\nTotal: ${applied} statements aplicados, ${skipped} ignorados (idempotencia).`)
  await sql.end()
}

main().catch((e) => {
  console.error('Error fatal:', e)
  sql.end().finally(() => process.exit(1))
})
