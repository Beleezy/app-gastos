import { pgTable, uuid, varchar, text, boolean, integer, decimal, date, time, timestamp, pgEnum, unique } from 'drizzle-orm/pg-core'

// ── Enums ──
export const estadoGastoPlanificado = pgEnum('estado_gasto_planificado', ['pendiente', 'pagado'])
export const metodoRegistro = pgEnum('metodo_registro', ['voz', 'manual'])
export const tipoPersonaEntidad = pgEnum('tipo_persona_entidad', ['persona', 'organizacion'])
export const tipoDeuda = pgEnum('tipo_deuda', ['me_deben', 'yo_debo'])
export const estadoDeuda = pgEnum('estado_deuda', ['pendiente', 'parcial', 'pagado', 'archivado'])

// ── Tabla 1: usuarios ──
export const usuarios = pgTable('usuarios', {
  id: uuid('id').defaultRandom().primaryKey(),
  nombre: varchar('nombre', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  monedaPreferida: varchar('moneda_preferida', { length: 10 }).default('PEN').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ── Tabla 2: categorias ──
export const categorias = pgTable('categorias', {
  id: uuid('id').defaultRandom().primaryKey(),
  usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'cascade' }),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  icono: varchar('icono', { length: 50 }),
  color: varchar('color', { length: 7 }),
  esPredefinida: boolean('es_predefinida').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ── Tabla 3: planes_mensuales ──
export const planesMensuales = pgTable('planes_mensuales', {
  id: uuid('id').defaultRandom().primaryKey(),
  usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'cascade' }).notNull(),
  mes: integer('mes').notNull(),
  anio: integer('anio').notNull(),
  montoPresupuesto: decimal('monto_presupuesto', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  unique('planes_mensuales_usuario_mes_anio').on(table.usuarioId, table.mes, table.anio),
])

// ── Tabla 4: gastos_planificados ──
export const gastosPlanificados = pgTable('gastos_planificados', {
  id: uuid('id').defaultRandom().primaryKey(),
  planMensualId: uuid('plan_mensual_id').references(() => planesMensuales.id, { onDelete: 'cascade' }).notNull(),
  categoriaId: uuid('categoria_id').references(() => categorias.id).notNull(),
  concepto: varchar('concepto', { length: 255 }).notNull(),
  montoEstimado: decimal('monto_estimado', { precision: 12, scale: 2 }).notNull(),
  fechaProbablePago: date('fecha_probable_pago').notNull(),
  esRecurrente: boolean('es_recurrente').default(false).notNull(),
  estado: estadoGastoPlanificado('estado').default('pendiente').notNull(),
  notas: text('notas'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ── Tabla 5: gastos ──
export const gastos = pgTable('gastos', {
  id: uuid('id').defaultRandom().primaryKey(),
  usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'cascade' }).notNull(),
  categoriaId: uuid('categoria_id').references(() => categorias.id).notNull(),
  concepto: varchar('concepto', { length: 255 }).notNull(),
  monto: decimal('monto', { precision: 12, scale: 2 }).notNull(),
  fecha: date('fecha').notNull(),
  hora: time('hora').notNull(),
  metodoRegistro: metodoRegistro('metodo_registro').default('manual').notNull(),
  transcripcionVoz: text('transcripcion_voz'),
  notas: text('notas'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ── Tabla 6: personas_entidades ──
export const personasEntidades = pgTable('personas_entidades', {
  id: uuid('id').defaultRandom().primaryKey(),
  usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'cascade' }).notNull(),
  nombre: varchar('nombre', { length: 255 }).notNull(),
  tipo: tipoPersonaEntidad('tipo').default('persona').notNull(),
  contacto: varchar('contacto', { length: 255 }),
  notas: text('notas'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ── Tabla 7: deudas ──
export const deudas = pgTable('deudas', {
  id: uuid('id').defaultRandom().primaryKey(),
  usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'cascade' }).notNull(),
  personaEntidadId: uuid('persona_entidad_id').references(() => personasEntidades.id, { onDelete: 'cascade' }).notNull(),
  tipoDeuda: tipoDeuda('tipo_deuda').notNull(),
  concepto: varchar('concepto', { length: 255 }).notNull(),
  montoOriginal: decimal('monto_original', { precision: 12, scale: 2 }).notNull(),
  montoPendiente: decimal('monto_pendiente', { precision: 12, scale: 2 }).notNull(),
  fechaCreacion: date('fecha_creacion').notNull(),
  estado: estadoDeuda('estado').default('pendiente').notNull(),
  notas: text('notas'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ── Tabla 8: pagos_deuda ──
export const pagosDeuda = pgTable('pagos_deuda', {
  id: uuid('id').defaultRandom().primaryKey(),
  deudaId: uuid('deuda_id').references(() => deudas.id, { onDelete: 'cascade' }).notNull(),
  montoPagado: decimal('monto_pagado', { precision: 12, scale: 2 }).notNull(),
  fechaPago: date('fecha_pago').notNull(),
  metodoPago: varchar('metodo_pago', { length: 100 }),
  notas: text('notas'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
