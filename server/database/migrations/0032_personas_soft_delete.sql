-- Soft delete para personas_entidades: "Eliminar persona y sus deudas"
-- hacía DELETE físico y el ON DELETE CASCADE de deudas.persona_entidad_id
-- purgaba también deudas que ya estaban en la papelera (bug N12 ronda 2).
ALTER TABLE personas_entidades ADD COLUMN IF NOT EXISTS deleted_at timestamp;

CREATE INDEX IF NOT EXISTS personas_entidades_usuario_deleted_idx
  ON personas_entidades (usuario_id, deleted_at);
