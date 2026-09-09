-- Idempotencia de mutaciones reintentadas, persistida.
--
-- El store vivía en un Map del proceso (server/utils/idempotency.js). El
-- propio archivo reconocía el trade-off: "en despliegues multi-instancia
-- un retry puede llegar a otra instancia y no encontrar el slot → la
-- operación se aplica dos veces". En Vercel eso no es una hipótesis, es
-- el caso normal — y el consumidor es la cola offline, que reintenta
-- justo cuando la red vuelve, que es cuando el usuario tiene varias
-- pestañas/instancias en juego. El síntoma es el peor posible para una
-- app de finanzas: gastos duplicados que el usuario no registró.
--
-- El índice único sobre (usuario_id, metodo, path, clave) es lo que hace
-- la reserva atómica: dos peticiones concurrentes con la misma clave
-- compiten por insertar y solo una gana. La perdedora lee la respuesta de
-- la ganadora en lugar de re-aplicar la operación.
--
-- No se eligió Upstash (que ya existe para rate-limit) porque su driver
-- se degrada EN SILENCIO al Map cuando no está configurado: sería el
-- mismo agujero con más piezas. La BD siempre está.

CREATE TABLE IF NOT EXISTS "idempotency_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "usuario_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
  "clave" varchar(200) NOT NULL,
  "metodo" varchar(10) NOT NULL,
  "path" varchar(500) NOT NULL,
  -- NULL mientras la operación está en vuelo: la fila se inserta ANTES de
  -- ejecutar el handler (para que gane la carrera) y se completa después.
  -- Un retry que encuentra response_json NULL sabe que la original sigue
  -- corriendo y responde 409 en vez de duplicar.
  "response_json" text,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idempotency_keys_lookup_uniq"
  ON "idempotency_keys" ("usuario_id", "metodo", "path", "clave");

-- Para el purgado de expiradas (cron purgar-papelera / job de limpieza).
CREATE INDEX IF NOT EXISTS "idempotency_keys_expires_idx"
  ON "idempotency_keys" ("expires_at");
