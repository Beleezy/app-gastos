CREATE TYPE "public"."estado_deuda" AS ENUM('pendiente', 'parcial', 'pagado', 'archivado');--> statement-breakpoint
CREATE TYPE "public"."estado_gasto_planificado" AS ENUM('pendiente', 'pagado');--> statement-breakpoint
CREATE TYPE "public"."metodo_registro" AS ENUM('voz', 'manual');--> statement-breakpoint
CREATE TYPE "public"."tipo_deuda" AS ENUM('me_deben', 'yo_debo');--> statement-breakpoint
CREATE TYPE "public"."tipo_persona_entidad" AS ENUM('persona', 'organizacion');--> statement-breakpoint
CREATE TABLE "categorias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid,
	"nombre" varchar(100) NOT NULL,
	"icono" varchar(50),
	"color" varchar(7),
	"es_predefinida" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "configuraciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"presupuesto_mensual_default" numeric(12, 2) DEFAULT '0' NOT NULL,
	"moneda_preferida" varchar(10) DEFAULT 'PEN' NOT NULL,
	"dia_inicio_ciclo" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "configuraciones_usuario_id_unique" UNIQUE("usuario_id")
);
--> statement-breakpoint
CREATE TABLE "deudas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"persona_entidad_id" uuid NOT NULL,
	"tipo_deuda" "tipo_deuda" NOT NULL,
	"concepto" varchar(255) NOT NULL,
	"monto_original" numeric(12, 2) NOT NULL,
	"monto_pendiente" numeric(12, 2) NOT NULL,
	"fecha_creacion" date NOT NULL,
	"estado" "estado_deuda" DEFAULT 'pendiente' NOT NULL,
	"notas" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gastos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"categoria_id" uuid NOT NULL,
	"concepto" varchar(255) NOT NULL,
	"monto" numeric(12, 2) NOT NULL,
	"fecha" date NOT NULL,
	"hora" time NOT NULL,
	"metodo_registro" "metodo_registro" DEFAULT 'manual' NOT NULL,
	"transcripcion_voz" text,
	"notas" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gastos_planificados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_mensual_id" uuid NOT NULL,
	"categoria_id" uuid NOT NULL,
	"concepto" varchar(255) NOT NULL,
	"monto_estimado" numeric(12, 2) NOT NULL,
	"fecha_probable_pago" date NOT NULL,
	"es_recurrente" boolean DEFAULT false NOT NULL,
	"recurrente_grupo_id" uuid,
	"estado" "estado_gasto_planificado" DEFAULT 'pendiente' NOT NULL,
	"notas" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pagos_deuda" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deuda_id" uuid NOT NULL,
	"monto_pagado" numeric(12, 2) NOT NULL,
	"fecha_pago" date NOT NULL,
	"metodo_pago" varchar(100),
	"notas" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personas_entidades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"tipo" "tipo_persona_entidad" DEFAULT 'persona' NOT NULL,
	"contacto" varchar(255),
	"notas" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planes_mensuales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"mes" integer NOT NULL,
	"anio" integer NOT NULL,
	"monto_presupuesto" numeric(12, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "planes_mensuales_usuario_mes_anio" UNIQUE("usuario_id","mes","anio")
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"email" varchar(255),
	"password_hash" varchar(255),
	"moneda_preferida" varchar(10) DEFAULT 'PEN' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "configuraciones" ADD CONSTRAINT "configuraciones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deudas" ADD CONSTRAINT "deudas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deudas" ADD CONSTRAINT "deudas_persona_entidad_id_personas_entidades_id_fk" FOREIGN KEY ("persona_entidad_id") REFERENCES "public"."personas_entidades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gastos_planificados" ADD CONSTRAINT "gastos_planificados_plan_mensual_id_planes_mensuales_id_fk" FOREIGN KEY ("plan_mensual_id") REFERENCES "public"."planes_mensuales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gastos_planificados" ADD CONSTRAINT "gastos_planificados_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos_deuda" ADD CONSTRAINT "pagos_deuda_deuda_id_deudas_id_fk" FOREIGN KEY ("deuda_id") REFERENCES "public"."deudas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personas_entidades" ADD CONSTRAINT "personas_entidades_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planes_mensuales" ADD CONSTRAINT "planes_mensuales_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;