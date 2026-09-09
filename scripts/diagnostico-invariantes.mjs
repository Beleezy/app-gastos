#!/usr/bin/env node
/**
 * Cuenta las filas que violan las invariantes monetarias de
 * `0020_hardening_indices_checks.sql`, sin modificar nada.
 *
 * Existe porque esa migración crea las constraints como NOT VALID y después
 * las VALIDATE: si una fila legacy las viola, la migración falla y la cadena
 * entera se detiene ahí. Postgres solo nombra la constraint, no cuántas filas
 * ni de qué forma, y a la BD de producción no se llega desde otro sitio que no
 * sea un runner de CI.
 *
 * SOLO CUENTA. No imprime montos, ids, conceptos ni fechas: el repositorio es
 * público y los logs de Actions también. Los números bastan para decidir.
 *
 * Se adapta al esquema que encuentre — producción puede estar varias
 * migraciones por detrás, así que ni las tablas ni `deleted_at` se dan por
 * supuestas.
 */

import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'
import postgres from 'postgres'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: resolve(__dirname, '..', '.env') })

const ALIAS_URL_BD = [
  'DATABASE_URL',
  'POSTGRES_URL_NON_POOLING',
  'POSTGRES_URL',
  'NUXT_DATABASE_URL',
  'SUPABASE_DB_URL',
]

const origenUrl = ALIAS_URL_BD.find((nombre) => (process.env[nombre] || '').trim())
if (!origenUrl) {
  console.error('[diagnostico] Sin cadena de conexión. Nada que revisar.')
  process.exit(1)
}

const sql = postgres(process.env[origenUrl].trim(), { max: 1, onnotice: () => {} })

// Una entrada por constraint de 0020: qué tabla, qué exige y cómo se desglosa
// lo que la incumple. Los desgloses son los que cambian la decisión: una fila
// en cero puede ser un registro real; una negativa suele ser un signo invertido.
const INVARIANTES = [
  {
    constraint: 'gastos_monto_positivo',
    tabla: 'gastos',
    exige: 'monto > 0',
    viola: 'monto <= 0',
    desglose: { 'monto = 0': 'monto = 0', 'monto < 0': 'monto < 0' },
  },
  {
    constraint: 'pagos_deuda_monto_positivo',
    tabla: 'pagos_deuda',
    exige: 'monto_pagado > 0',
    viola: 'monto_pagado <= 0',
    desglose: { 'monto_pagado = 0': 'monto_pagado = 0', 'monto_pagado < 0': 'monto_pagado < 0' },
  },
  {
    constraint: 'deudas_montos_positivos',
    tabla: 'deudas',
    exige: 'monto_original > 0 y 0 <= monto_pendiente <= monto_original',
    viola:
      'NOT (monto_original > 0 AND monto_pendiente >= 0 AND monto_pendiente <= monto_original)',
    desglose: {
      'original <= 0': 'monto_original <= 0',
      'pendiente < 0': 'monto_pendiente < 0',
      'pendiente > original': 'monto_pendiente > monto_original',
    },
  },
  {
    constraint: 'ahorros_monto_positivo',
    tabla: 'ahorros',
    exige: 'monto > 0',
    viola: 'monto <= 0',
    desglose: { 'monto = 0': 'monto = 0', 'monto < 0': 'monto < 0' },
  },
  {
    constraint: 'gastos_planificados_monto_positivo',
    tabla: 'gastos_planificados',
    exige: 'monto_estimado > 0',
    viola: 'monto_estimado <= 0',
    desglose: { 'estimado = 0': 'monto_estimado = 0', 'estimado < 0': 'monto_estimado < 0' },
  },
]

async function existe(tabla) {
  const [row] = await sql`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ${tabla}
  `
  return Boolean(row)
}

async function tieneSoftDelete(tabla) {
  const [row] = await sql`
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${tabla} AND column_name = 'deleted_at'
  `
  return Boolean(row)
}

async function main() {
  console.log(`[diagnostico] leyendo ${new URL(process.env[origenUrl].trim()).host}\n`)

  let totalViolaciones = 0
  let tablasRevisadas = 0

  for (const inv of INVARIANTES) {
    if (!(await existe(inv.tabla))) {
      console.log(`— ${inv.tabla}: la tabla no existe en este esquema, se omite.`)
      continue
    }

    tablasRevisadas++
    const soft = await tieneSoftDelete(inv.tabla)
    const partes = [
      `count(*) AS total`,
      ...Object.entries(inv.desglose).map(
        ([, cond], i) => `count(*) FILTER (WHERE ${cond}) AS d${i}`,
      ),
      soft ? `count(*) FILTER (WHERE deleted_at IS NOT NULL) AS borradas` : `0 AS borradas`,
    ]

    // sql.unsafe y no una plantilla: tabla y condiciones vienen de esta misma
    // constante, no de entrada externa, y son fragmentos SQL, no valores.
    const [row] = await sql.unsafe(
      `SELECT ${partes.join(', ')} FROM "${inv.tabla}" WHERE ${inv.viola}`,
    )

    const total = Number(row.total)
    totalViolaciones += total

    if (total === 0) {
      console.log(`✓ ${inv.constraint} — 0 filas incumplen (${inv.exige})`)
      continue
    }

    const claves = Object.keys(inv.desglose)
    const detalle = claves.map((k, i) => `${k}: ${row[`d${i}`]}`).join(', ')
    console.log(`✗ ${inv.constraint} — ${total} fila(s) incumplen (${inv.exige})`)
    console.log(`    desglose: ${detalle}`)
    const borradas = Number(row.borradas)
    const vivas = total - borradas
    console.log(
      soft
        ? `    de esas, ${borradas} ${borradas === 1 ? 'está' : 'están'} en la papelera y ` +
            `${vivas} ${vivas === 1 ? 'viva' : 'vivas'}`
        : `    (esta tabla todavía no tiene deleted_at en este esquema)`,
    )
  }

  if (tablasRevisadas === 0) {
    console.log('\n[diagnostico] No había ninguna de las tablas: nada que concluir.')
  } else if (totalViolaciones === 0) {
    console.log('\n[diagnostico] Ninguna invariante incumplida: 0020 debería validar sin problema.')
  } else {
    console.log(
      `\n[diagnostico] ${totalViolaciones} fila(s) bloquean 0020. Hay que decidir qué hacer con ellas antes de re-aplicar.`,
    )
  }

  await sql.end()
}

main().catch((e) => {
  console.error('[diagnostico] Error:', e.message)
  sql.end().finally(() => process.exit(1))
})
