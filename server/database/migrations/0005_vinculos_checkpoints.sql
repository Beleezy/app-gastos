-- Migration: 0005_vinculos_checkpoints
-- Sistema de puntos de guardado para vínculos entre usuarios
-- Máximo 3 checkpoints por par: inicio_vinculo, anterior, actual

CREATE TABLE IF NOT EXISTS "vinculos_checkpoints" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  "persona_a_id" uuid NOT NULL REFERENCES "personas_entidades"("id") ON DELETE CASCADE,
  "persona_b_id" uuid REFERENCES "personas_entidades"("id") ON DELETE SET NULL,
  "tipo" varchar(20) NOT NULL, -- 'inicio_vinculo' | 'anterior' | 'actual'
  "creado_por_id" uuid REFERENCES "usuarios"("id") ON DELETE SET NULL,
  "descripcion" text,
  "snapshot_datos" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "vinculos_checkpoints_persona_a_idx" ON "vinculos_checkpoints" ("persona_a_id");
CREATE INDEX IF NOT EXISTS "vinculos_checkpoints_par_tipo_idx" ON "vinculos_checkpoints" ("persona_a_id", "tipo");
