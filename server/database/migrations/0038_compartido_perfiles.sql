-- Compartido + perfiles de familia: qué perfiles gestionados incluye una
-- conexión.
--
-- Hasta ahora solo se compartían los gastos de la cuenta real del emisor;
-- los de sus perfiles gestionados (filas de otro usuario_id) nunca salían.
-- Ahora el emisor elige, conexión por conexión, qué perfiles entran. Sin
-- filas aquí el comportamiento es el de siempre: solo la cuenta principal.
--
-- FK a usuarios con cascada: borrar el perfil lo quita de todas las
-- conexiones sin dejar ids colgando.
--
-- Aditiva e idempotente.

CREATE TABLE IF NOT EXISTS "compartido_perfiles" (
  "conexion_id" uuid NOT NULL REFERENCES "compartido_conexiones"("id") ON DELETE CASCADE,
  "perfil_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "compartido_perfiles_pk" PRIMARY KEY ("conexion_id", "perfil_id")
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "compartido_perfiles_perfil_idx" ON "compartido_perfiles" ("perfil_id");
