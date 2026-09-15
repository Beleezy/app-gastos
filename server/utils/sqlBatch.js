// Actualizar N filas con N valores distintos en UN solo UPDATE.
//
// Drizzle no expone `UPDATE ... FROM (VALUES ...)`, y la alternativa —un
// UPDATE por fila con `await` dentro de un `for`— ya se encontró cuatro
// veces en esta base (siempre dentro de transacciones, alargando los
// locks). El patrón vivo es un `CASE <columna> WHEN id THEN valor ... END`
// acotado con `WHERE id IN (...)`. Los valores van parametrizados por
// Drizzle, no concatenados.

import { sql } from 'drizzle-orm'

/**
 * Expresión `CASE <columna> WHEN a THEN b ... END` para columnas uuid.
 *
 * @param {import('drizzle-orm').Column} columna la columna que se compara
 * @param {Array<[string, string]>} pares [valorActual, valorNuevo]
 */
export function caseUuidPorId(columna, pares) {
  const ramas = sql.join(
    pares.map(([desde, hasta]) => sql`WHEN ${desde}::uuid THEN ${hasta}::uuid`),
    sql` `,
  )
  return sql`CASE ${columna} ${ramas} END`
}
