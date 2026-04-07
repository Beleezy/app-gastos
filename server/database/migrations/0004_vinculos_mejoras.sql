-- Migration: 0004_vinculos_mejoras
-- Agrega tabla de auditoría para vínculos entre usuarios

CREATE TABLE IF NOT EXISTS "auditoria_vinculos" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  "persona_a_id" uuid NOT NULL REFERENCES "personas_entidades"("id") ON DELETE CASCADE,
  "persona_b_id" uuid REFERENCES "personas_entidades"("id") ON DELETE SET NULL,
  "usuario_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
  "accion" varchar(30) NOT NULL,
  "descripcion" text,
  "datos" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "auditoria_vinculos_persona_a_idx" ON "auditoria_vinculos" ("persona_a_id");
CREATE INDEX IF NOT EXISTS "auditoria_vinculos_persona_b_idx" ON "auditoria_vinculos" ("persona_b_id");
