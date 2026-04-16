CREATE TYPE "public"."estado_solicitud_vinculo" AS ENUM('pendiente', 'aceptada', 'rechazada', 'expirada');--> statement-breakpoint
ALTER TYPE "public"."metodo_registro" ADD VALUE 'foto' BEFORE 'manual';--> statement-breakpoint
CREATE TABLE "ahorros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"medio_ahorro_id" uuid,
	"gasto_planificado_id" uuid,
	"gasto_id" uuid,
	"concepto" varchar(200),
	"monto" numeric(12, 2) NOT NULL,
	"fecha" date NOT NULL,
	"mes" integer NOT NULL,
	"anio" integer NOT NULL,
	"notas" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auditoria_vinculos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"persona_a_id" uuid NOT NULL,
	"persona_b_id" uuid,
	"usuario_id" uuid NOT NULL,
	"accion" varchar(30) NOT NULL,
	"descripcion" text,
	"datos" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gastos_futuros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"categoria_id" uuid NOT NULL,
	"tipo_gasto" varchar(160) NOT NULL,
	"descripcion" text,
	"prioridad" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gastos_futuros_detalles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gasto_futuro_id" uuid NOT NULL,
	"nombre" varchar(160) NOT NULL,
	"notas" text,
	"prioridad" integer DEFAULT 0 NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"estado_decision" varchar(20),
	"decidido_en" timestamp,
	"gasto_id" uuid,
	"gasto_planificado_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gastos_futuros_opciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"detalle_id" uuid NOT NULL,
	"nombre" varchar(200) NOT NULL,
	"referencia_url" text,
	"imagen_url" text,
	"precio_minimo" numeric(12, 2),
	"precio_maximo" numeric(12, 2),
	"precio_promedio" numeric(12, 2),
	"notas" text,
	"orden" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medios_ahorro" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"nombre" varchar(80) NOT NULL,
	"tipo" varchar(40),
	"icono" varchar(16),
	"color" varchar(16),
	"orden" integer DEFAULT 0 NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metas_ahorro" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"tipo" varchar(16) NOT NULL,
	"mes" integer,
	"anio" integer,
	"monto_objetivo" numeric(12, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
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
CREATE TABLE "vinculos_checkpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"persona_a_id" uuid NOT NULL,
	"persona_b_id" uuid,
	"tipo" varchar(20) NOT NULL,
	"creado_por_id" uuid,
	"descripcion" text,
	"snapshot_datos" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "usuarios" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "configuraciones" ADD COLUMN "dias_pdf_saldadas" integer DEFAULT 7 NOT NULL;--> statement-breakpoint
ALTER TABLE "deudas" ADD COLUMN "vinculo_deuda_id" uuid;--> statement-breakpoint
ALTER TABLE "gastos" ADD COLUMN "gasto_planificado_id" uuid;--> statement-breakpoint
ALTER TABLE "pagos_deuda" ADD COLUMN "vinculo_pago_id" uuid;--> statement-breakpoint
ALTER TABLE "personas_entidades" ADD COLUMN "vinculado_usuario_id" uuid;--> statement-breakpoint
ALTER TABLE "personas_entidades" ADD COLUMN "vinculo_par_id" uuid;--> statement-breakpoint
ALTER TABLE "ahorros" ADD CONSTRAINT "ahorros_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ahorros" ADD CONSTRAINT "ahorros_medio_ahorro_id_medios_ahorro_id_fk" FOREIGN KEY ("medio_ahorro_id") REFERENCES "public"."medios_ahorro"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ahorros" ADD CONSTRAINT "ahorros_gasto_planificado_id_gastos_planificados_id_fk" FOREIGN KEY ("gasto_planificado_id") REFERENCES "public"."gastos_planificados"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ahorros" ADD CONSTRAINT "ahorros_gasto_id_gastos_id_fk" FOREIGN KEY ("gasto_id") REFERENCES "public"."gastos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditoria_vinculos" ADD CONSTRAINT "auditoria_vinculos_persona_a_id_personas_entidades_id_fk" FOREIGN KEY ("persona_a_id") REFERENCES "public"."personas_entidades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditoria_vinculos" ADD CONSTRAINT "auditoria_vinculos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gastos_futuros" ADD CONSTRAINT "gastos_futuros_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gastos_futuros" ADD CONSTRAINT "gastos_futuros_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gastos_futuros_detalles" ADD CONSTRAINT "gastos_futuros_detalles_gasto_futuro_id_gastos_futuros_id_fk" FOREIGN KEY ("gasto_futuro_id") REFERENCES "public"."gastos_futuros"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gastos_futuros_detalles" ADD CONSTRAINT "gastos_futuros_detalles_gasto_id_gastos_id_fk" FOREIGN KEY ("gasto_id") REFERENCES "public"."gastos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gastos_futuros_detalles" ADD CONSTRAINT "gastos_futuros_detalles_gasto_planificado_id_gastos_planificados_id_fk" FOREIGN KEY ("gasto_planificado_id") REFERENCES "public"."gastos_planificados"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gastos_futuros_opciones" ADD CONSTRAINT "gastos_futuros_opciones_detalle_id_gastos_futuros_detalles_id_fk" FOREIGN KEY ("detalle_id") REFERENCES "public"."gastos_futuros_detalles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medios_ahorro" ADD CONSTRAINT "medios_ahorro_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metas_ahorro" ADD CONSTRAINT "metas_ahorro_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitudes_vinculo" ADD CONSTRAINT "solicitudes_vinculo_remitente_id_usuarios_id_fk" FOREIGN KEY ("remitente_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitudes_vinculo" ADD CONSTRAINT "solicitudes_vinculo_destinatario_id_usuarios_id_fk" FOREIGN KEY ("destinatario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitudes_vinculo" ADD CONSTRAINT "solicitudes_vinculo_persona_entidad_id_personas_entidades_id_fk" FOREIGN KEY ("persona_entidad_id") REFERENCES "public"."personas_entidades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vinculos_checkpoints" ADD CONSTRAINT "vinculos_checkpoints_persona_a_id_personas_entidades_id_fk" FOREIGN KEY ("persona_a_id") REFERENCES "public"."personas_entidades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vinculos_checkpoints" ADD CONSTRAINT "vinculos_checkpoints_creado_por_id_usuarios_id_fk" FOREIGN KEY ("creado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ahorros_usuario_mes_idx" ON "ahorros" USING btree ("usuario_id","anio","mes");--> statement-breakpoint
CREATE INDEX "ahorros_medio_idx" ON "ahorros" USING btree ("medio_ahorro_id");--> statement-breakpoint
CREATE INDEX "auditoria_vinculos_persona_a_idx" ON "auditoria_vinculos" USING btree ("persona_a_id");--> statement-breakpoint
CREATE INDEX "auditoria_vinculos_persona_b_idx" ON "auditoria_vinculos" USING btree ("persona_b_id");--> statement-breakpoint
CREATE INDEX "gastos_futuros_usuario_idx" ON "gastos_futuros" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "gastos_futuros_usuario_categoria_idx" ON "gastos_futuros" USING btree ("usuario_id","categoria_id");--> statement-breakpoint
CREATE INDEX "gastos_futuros_usuario_prioridad_idx" ON "gastos_futuros" USING btree ("usuario_id","prioridad");--> statement-breakpoint
CREATE INDEX "gastos_futuros_detalles_gasto_idx" ON "gastos_futuros_detalles" USING btree ("gasto_futuro_id","orden");--> statement-breakpoint
CREATE INDEX "gastos_futuros_detalles_decision_idx" ON "gastos_futuros_detalles" USING btree ("estado_decision");--> statement-breakpoint
CREATE INDEX "gastos_futuros_opciones_detalle_idx" ON "gastos_futuros_opciones" USING btree ("detalle_id","orden");--> statement-breakpoint
CREATE INDEX "medios_ahorro_usuario_idx" ON "medios_ahorro" USING btree ("usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "metas_ahorro_mensual_uniq" ON "metas_ahorro" USING btree ("usuario_id","tipo","mes","anio");--> statement-breakpoint
CREATE INDEX "solicitudes_vinculo_destinatario_idx" ON "solicitudes_vinculo" USING btree ("destinatario_email");--> statement-breakpoint
CREATE INDEX "solicitudes_vinculo_remitente_idx" ON "solicitudes_vinculo" USING btree ("remitente_id");--> statement-breakpoint
CREATE INDEX "vinculos_checkpoints_persona_a_idx" ON "vinculos_checkpoints" USING btree ("persona_a_id");--> statement-breakpoint
CREATE INDEX "vinculos_checkpoints_par_tipo_idx" ON "vinculos_checkpoints" USING btree ("persona_a_id","tipo");--> statement-breakpoint
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_gasto_planificado_id_gastos_planificados_id_fk" FOREIGN KEY ("gasto_planificado_id") REFERENCES "public"."gastos_planificados"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personas_entidades" ADD CONSTRAINT "personas_entidades_vinculado_usuario_id_usuarios_id_fk" FOREIGN KEY ("vinculado_usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deudas_persona_estado_idx" ON "deudas" USING btree ("persona_entidad_id","estado");--> statement-breakpoint
CREATE INDEX "deudas_usuario_tipo_idx" ON "deudas" USING btree ("usuario_id","tipo_deuda");--> statement-breakpoint
CREATE INDEX "gastos_usuario_fecha_idx" ON "gastos" USING btree ("usuario_id","fecha");--> statement-breakpoint
CREATE INDEX "gastos_usuario_categoria_idx" ON "gastos" USING btree ("usuario_id","categoria_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gastos_planificado_unique" ON "gastos" USING btree ("gasto_planificado_id");--> statement-breakpoint
CREATE INDEX "gastos_planificados_plan_idx" ON "gastos_planificados" USING btree ("plan_mensual_id");--> statement-breakpoint
CREATE INDEX "pagos_deuda_deuda_idx" ON "pagos_deuda" USING btree ("deuda_id");--> statement-breakpoint
CREATE INDEX "personas_entidades_usuario_idx" ON "personas_entidades" USING btree ("usuario_id");