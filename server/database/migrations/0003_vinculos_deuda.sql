CREATE TYPE "public"."estado_solicitud_vinculo" AS ENUM('pendiente', 'aceptada', 'rechazada', 'expirada');
--> statement-breakpoint
CREATE TABLE "solicitudes_vinculo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"remitente_id" uuid NOT NULL,
	"destinatario_email" varchar(255) NOT NULL,
	"destinatario_id" uuid,
	"persona_entidad_id" uuid NOT NULL,
	"estado" "estado_solicitud_vinculo" DEFAULT 'pendiente' NOT NULL,
	"mensaje" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "personas_entidades" ADD COLUMN "vinculado_usuario_id" uuid;
--> statement-breakpoint
ALTER TABLE "personas_entidades" ADD COLUMN "vinculo_par_id" uuid;
--> statement-breakpoint
ALTER TABLE "deudas" ADD COLUMN "vinculo_deuda_id" uuid;
--> statement-breakpoint
ALTER TABLE "pagos_deuda" ADD COLUMN "vinculo_pago_id" uuid;
--> statement-breakpoint
ALTER TABLE "solicitudes_vinculo" ADD CONSTRAINT "solicitudes_vinculo_remitente_id_usuarios_id_fk" FOREIGN KEY ("remitente_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "solicitudes_vinculo" ADD CONSTRAINT "solicitudes_vinculo_destinatario_id_usuarios_id_fk" FOREIGN KEY ("destinatario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "solicitudes_vinculo" ADD CONSTRAINT "solicitudes_vinculo_persona_entidad_id_personas_entidades_id_fk" FOREIGN KEY ("persona_entidad_id") REFERENCES "public"."personas_entidades"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "personas_entidades" ADD CONSTRAINT "personas_entidades_vinculado_usuario_id_usuarios_id_fk" FOREIGN KEY ("vinculado_usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "personas_entidades" ADD CONSTRAINT "personas_entidades_vinculo_par_id_personas_entidades_id_fk" FOREIGN KEY ("vinculo_par_id") REFERENCES "public"."personas_entidades"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "deudas" ADD CONSTRAINT "deudas_vinculo_deuda_id_deudas_id_fk" FOREIGN KEY ("vinculo_deuda_id") REFERENCES "public"."deudas"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pagos_deuda" ADD CONSTRAINT "pagos_deuda_vinculo_pago_id_pagos_deuda_id_fk" FOREIGN KEY ("vinculo_pago_id") REFERENCES "public"."pagos_deuda"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "solicitudes_vinculo_destinatario_idx" ON "solicitudes_vinculo" USING btree ("destinatario_email");
--> statement-breakpoint
CREATE INDEX "solicitudes_vinculo_remitente_idx" ON "solicitudes_vinculo" USING btree ("remitente_id");
