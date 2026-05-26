-- Migración 0031: datos de contacto del perfil gestionado.
-- Campos informativos del familiar (no aplican al usuario real).

ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "relacion" varchar(50);--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "correo_contacto" varchar(255);--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "fecha_nacimiento" date;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "notas" text;
