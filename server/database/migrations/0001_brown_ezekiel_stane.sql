ALTER TABLE "configuraciones" ADD COLUMN "nombre" varchar(100) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "deudas" ADD COLUMN "fecha_pago" date;