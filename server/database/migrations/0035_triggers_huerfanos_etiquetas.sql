-- Triggers huérfanos de un submódulo que ya no existe.
--
-- 0026 creó las tablas "etiquetas"/"etiquetas_asign" y dos triggers
-- AFTER DELETE —sobre "gastos" y sobre "gastos_planificados"— que limpiaban
-- las asignaciones al borrar una fila. 0027 (racionalización) eliminó las
-- tablas pero NO los triggers ni la función: plpgsql resuelve los nombres
-- de tabla en tiempo de ejecución, así que el DROP TABLE no falló y los
-- triggers quedaron vivos apuntando a una tabla inexistente.
--
-- Consecuencia: TODO DELETE físico de una fila de "gastos" o de
-- "gastos_planificados" falla con `relation "etiquetas_asign" does not
-- exist`. Eso incluye eliminar un gasto planificado desde la UI, quitar la
-- recurrencia de un planificado (borra los meses futuros), la purga de la
-- papelera y el borrado de un perfil gestionado (cascada a sus gastos).
-- Lo destapó la suite E2E de esta ronda al borrar un planificado pagado.
--
-- Idempotente y transaccional: solo quita lo que sobra.

DROP TRIGGER IF EXISTS "etq_asign_limpiar_gasto" ON "gastos";--> statement-breakpoint
DROP TRIGGER IF EXISTS "etq_asign_limpiar_planif" ON "gastos_planificados";--> statement-breakpoint
DROP FUNCTION IF EXISTS "etiquetas_asign_limpiar"();
