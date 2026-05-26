-- Migración 0030: teléfono (WhatsApp) del perfil gestionado.
-- El presupuesto del perfil se guarda en su propia fila de `configuraciones`
-- (presupuesto_mensual_default), creada por la app al crear el perfil.

ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "telefono" varchar(30);
