import { pgTable, uuid, varchar, text, boolean, integer, decimal, date, time, timestamp, pgEnum, unique, index, uniqueIndex, jsonb } from 'drizzle-orm/pg-core'

// ── Enums ──
export const estadoGastoPlanificado = pgEnum('estado_gasto_planificado', ['pendiente', 'pagado'])
export const metodoRegistro = pgEnum('metodo_registro', ['voz', 'foto', 'manual'])
export const tipoPersonaEntidad = pgEnum('tipo_persona_entidad', ['persona', 'organizacion'])
export const tipoDeuda = pgEnum('tipo_deuda', ['me_deben', 'yo_debo'])
export const estadoDeuda = pgEnum('estado_deuda', ['pendiente', 'parcial', 'pagado', 'archivado'])
export const estadoSolicitudVinculo = pgEnum('estado_solicitud_vinculo', ['pendiente', 'aceptada', 'rechazada', 'expirada'])

// ── Tabla 1: usuarios ──
// NOTA: el id lo provee Supabase Auth (mismo UUID que auth.users)
export const usuarios = pgTable('usuarios', {
  id: uuid('id').primaryKey(),
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
}, (table) => [
  index('categorias_usuario_idx').on(table.usuarioId),
  index('categorias_usuario_predef_idx').on(table.usuarioId, table.esPredefinida),
])

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
  index('planes_mensuales_usuario_idx').on(table.usuarioId),
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
  recurrenteGrupoId: uuid('recurrente_grupo_id'),
  estado: estadoGastoPlanificado('estado').default('pendiente').notNull(),
  notas: text('notas'),
  googleEventId: varchar('google_event_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('gastos_planificados_plan_idx').on(table.planMensualId),
  index('gastos_planificados_plan_estado_idx').on(table.planMensualId, table.estado),
  index('gastos_planificados_categoria_idx').on(table.categoriaId),
])

// ── Tabla 5: gastos ──
export const gastos = pgTable('gastos', {
  id: uuid('id').defaultRandom().primaryKey(),
  usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'cascade' }).notNull(),
  categoriaId: uuid('categoria_id').references(() => categorias.id).notNull(),
  gastoPlanificadoId: uuid('gasto_planificado_id').references(() => gastosPlanificados.id, { onDelete: 'set null' }),
  concepto: varchar('concepto', { length: 255 }).notNull(),
  monto: decimal('monto', { precision: 12, scale: 2 }).notNull(),
  fecha: date('fecha').notNull(),
  hora: time('hora').notNull(),
  metodoRegistro: metodoRegistro('metodo_registro').default('manual').notNull(),
  transcripcionVoz: text('transcripcion_voz'),
  espacioId: uuid('espacio_id'),
  notas: text('notas'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('gastos_usuario_fecha_idx').on(table.usuarioId, table.fecha),
  index('gastos_usuario_categoria_idx').on(table.usuarioId, table.categoriaId),
  uniqueIndex('gastos_planificado_unique').on(table.gastoPlanificadoId),
  index('gastos_usuario_deleted_idx').on(table.usuarioId, table.deletedAt),
  index('gastos_espacio_fecha_idx').on(table.espacioId, table.fecha),
])

// ── Tabla 6: personas_entidades ──
export const gastosFuturos = pgTable('gastos_futuros', {
  id: uuid('id').defaultRandom().primaryKey(),
  usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'cascade' }).notNull(),
  categoriaId: uuid('categoria_id').references(() => categorias.id).notNull(),
  tipoGasto: varchar('tipo_gasto', { length: 160 }).notNull(),
  descripcion: text('descripcion'),
  prioridad: integer('prioridad').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('gastos_futuros_usuario_idx').on(table.usuarioId),
  index('gastos_futuros_usuario_categoria_idx').on(table.usuarioId, table.categoriaId),
  index('gastos_futuros_usuario_prioridad_idx').on(table.usuarioId, table.prioridad),
])

export const gastosFuturosDetalles = pgTable('gastos_futuros_detalles', {
  id: uuid('id').defaultRandom().primaryKey(),
  gastoFuturoId: uuid('gasto_futuro_id').references(() => gastosFuturos.id, { onDelete: 'cascade' }).notNull(),
  nombre: varchar('nombre', { length: 160 }).notNull(),
  notas: text('notas'),
  prioridad: integer('prioridad').default(0).notNull(),
  orden: integer('orden').default(0).notNull(),
  estadoDecision: varchar('estado_decision', { length: 20 }),
  decididoEn: timestamp('decidido_en'),
  gastoId: uuid('gasto_id').references(() => gastos.id, { onDelete: 'set null' }),
  gastoPlanificadoId: uuid('gasto_planificado_id').references(() => gastosPlanificados.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('gastos_futuros_detalles_gasto_idx').on(table.gastoFuturoId, table.orden),
  index('gastos_futuros_detalles_decision_idx').on(table.estadoDecision),
])

export const gastosFuturosOpciones = pgTable('gastos_futuros_opciones', {
  id: uuid('id').defaultRandom().primaryKey(),
  detalleId: uuid('detalle_id').references(() => gastosFuturosDetalles.id, { onDelete: 'cascade' }).notNull(),
  nombre: varchar('nombre', { length: 200 }).notNull(),
  referenciaUrl: text('referencia_url'),
  imagenUrl: text('imagen_url'),
  precioMinimo: decimal('precio_minimo', { precision: 12, scale: 2 }),
  precioMaximo: decimal('precio_maximo', { precision: 12, scale: 2 }),
  precioPromedio: decimal('precio_promedio', { precision: 12, scale: 2 }),
  notas: text('notas'),
  orden: integer('orden').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('gastos_futuros_opciones_detalle_idx').on(table.detalleId, table.orden),
])

export const personasEntidades = pgTable('personas_entidades', {
  id: uuid('id').defaultRandom().primaryKey(),
  usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'cascade' }).notNull(),
  nombre: varchar('nombre', { length: 255 }).notNull(),
  tipo: tipoPersonaEntidad('tipo').default('persona').notNull(),
  contacto: varchar('contacto', { length: 255 }),
  notas: text('notas'),
  vinculadoUsuarioId: uuid('vinculado_usuario_id').references(() => usuarios.id, { onDelete: 'set null' }),
  vinculoParId: uuid('vinculo_par_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('personas_entidades_usuario_idx').on(table.usuarioId),
  index('personas_entidades_usuario_updated_idx').on(table.usuarioId, table.updatedAt),
  index('personas_entidades_vinculado_idx').on(table.vinculadoUsuarioId),
])

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
  fechaPago: date('fecha_pago'),
  estado: estadoDeuda('estado').default('pendiente').notNull(),
  notas: text('notas'),
  vinculoDeudaId: uuid('vinculo_deuda_id'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('deudas_persona_estado_idx').on(table.personaEntidadId, table.estado),
  index('deudas_usuario_tipo_idx').on(table.usuarioId, table.tipoDeuda),
  index('deudas_usuario_estado_idx').on(table.usuarioId, table.estado),
  index('deudas_usuario_updated_idx').on(table.usuarioId, table.updatedAt),
  index('deudas_vinculo_deuda_idx').on(table.vinculoDeudaId),
  index('deudas_usuario_deleted_idx').on(table.usuarioId, table.deletedAt),
])

// ── Tabla 8: configuraciones ──
export const configuraciones = pgTable('configuraciones', {
  id: uuid('id').defaultRandom().primaryKey(),
  usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'cascade' }).notNull().unique(),
  nombre: varchar('nombre', { length: 100 }).default('').notNull(),
  presupuestoMensualDefault: decimal('presupuesto_mensual_default', { precision: 12, scale: 2 }).default('0').notNull(),
  monedaPreferida: varchar('moneda_preferida', { length: 10 }).default('PEN').notNull(),
  diaInicioCiclo: integer('dia_inicio_ciclo').default(1).notNull(),
  zonaHoraria: varchar('zona_horaria', { length: 50 }).default('America/Lima').notNull(),
  locale: varchar('locale', { length: 10 }).default('es-PE').notNull(),
  diasPdfSaldadas: integer('dias_pdf_saldadas').default(7).notNull(),
  vistaRegistroDia: boolean('vista_registro_dia').default(true).notNull(),
  vistaRegistroSemana: boolean('vista_registro_semana').default(false).notNull(),
  tamanoLetra: varchar('tamano_letra', { length: 20 }).default('normal').notNull(),
  modoDaltonico: boolean('modo_daltonico').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ── Tabla 9: pagos_deuda ──
export const pagosDeuda = pgTable('pagos_deuda', {
  id: uuid('id').defaultRandom().primaryKey(),
  deudaId: uuid('deuda_id').references(() => deudas.id, { onDelete: 'cascade' }).notNull(),
  montoPagado: decimal('monto_pagado', { precision: 12, scale: 2 }).notNull(),
  fechaPago: date('fecha_pago').notNull(),
  metodoPago: varchar('metodo_pago', { length: 100 }),
  notas: text('notas'),
  vinculoPagoId: uuid('vinculo_pago_id'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('pagos_deuda_deuda_idx').on(table.deudaId),
  index('pagos_deuda_deuda_fecha_idx').on(table.deudaId, table.fechaPago),
  index('pagos_deuda_vinculo_pago_idx').on(table.vinculoPagoId),
  index('pagos_deuda_deleted_idx').on(table.deletedAt),
])

// ── Tabla 10: auditoria_vinculos ──
export const auditoriaVinculos = pgTable('auditoria_vinculos', {
  id: uuid('id').defaultRandom().primaryKey(),
  personaAId: uuid('persona_a_id').references(() => personasEntidades.id, { onDelete: 'cascade' }).notNull(),
  personaBId: uuid('persona_b_id'), // Sin FK: puede ser de otro usuario
  usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'cascade' }).notNull(),
  accion: varchar('accion', { length: 30 }).notNull(),
  descripcion: text('descripcion'),
  datos: text('datos'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('auditoria_vinculos_persona_a_idx').on(table.personaAId),
  index('auditoria_vinculos_persona_b_idx').on(table.personaBId),
  index('auditoria_vinculos_created_at_idx').on(table.createdAt),
  index('auditoria_vinculos_usuario_created_idx').on(table.usuarioId, table.createdAt),
])

// ── Tabla 11: vinculos_checkpoints ──
export const vinculosCheckpoints = pgTable('vinculos_checkpoints', {
  id: uuid('id').defaultRandom().primaryKey(),
  personaAId: uuid('persona_a_id').references(() => personasEntidades.id, { onDelete: 'cascade' }).notNull(),
  personaBId: uuid('persona_b_id'), // Sin FK: puede ser de otro usuario
  tipo: varchar('tipo', { length: 20 }).notNull(), // 'inicio_vinculo' | 'anterior' | 'actual'
  creadoPorId: uuid('creado_por_id').references(() => usuarios.id, { onDelete: 'set null' }),
  descripcion: text('descripcion'),
  snapshotDatos: text('snapshot_datos').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('vinculos_checkpoints_persona_a_idx').on(table.personaAId),
  index('vinculos_checkpoints_par_tipo_idx').on(table.personaAId, table.tipo),
])

// ── Tabla: espacios_compartidos ── (modo familiar)
// Un espacio es un "wallet compartido" entre varios usuarios. Cada
// movimiento (gasto / ingreso) puede pertenecer a un espacio en lugar
// del usuario personal. Los miembros con rol `editor` pueden registrar;
// `lector` solo ve. El `dueno_id` puede borrar el espacio.
//
// Nota: deliberadamente NO se mezcla con `solicitudes_vinculo` (que es
// para vincular DEUDAS entre usuarios, 1-a-1). Familia es un contexto
// de finanzas compartidas N-a-N.
export const espaciosCompartidos = pgTable('espacios_compartidos', {
  id: uuid('id').defaultRandom().primaryKey(),
  duenoId: uuid('dueno_id').references(() => usuarios.id, { onDelete: 'cascade' }).notNull(),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  descripcion: text('descripcion'),
  icono: varchar('icono', { length: 16 }),
  color: varchar('color', { length: 16 }),
  archivado: boolean('archivado').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('espacios_dueno_idx').on(table.duenoId),
])

export const miembrosEspacio = pgTable('miembros_espacio', {
  id: uuid('id').defaultRandom().primaryKey(),
  espacioId: uuid('espacio_id').references(() => espaciosCompartidos.id, { onDelete: 'cascade' }).notNull(),
  usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'cascade' }).notNull(),
  rol: varchar('rol', { length: 20 }).default('editor').notNull(), // 'dueno' | 'editor' | 'lector'
  invitadoPorId: uuid('invitado_por_id').references(() => usuarios.id, { onDelete: 'set null' }),
  aceptadoEn: timestamp('aceptado_en'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('miembros_espacio_unico').on(table.espacioId, table.usuarioId),
  index('miembros_espacio_usuario_idx').on(table.usuarioId),
])

export const invitacionesEspacio = pgTable('invitaciones_espacio', {
  id: uuid('id').defaultRandom().primaryKey(),
  espacioId: uuid('espacio_id').references(() => espaciosCompartidos.id, { onDelete: 'cascade' }).notNull(),
  remitenteId: uuid('remitente_id').references(() => usuarios.id, { onDelete: 'cascade' }).notNull(),
  destinatarioEmail: varchar('destinatario_email', { length: 255 }).notNull(),
  destinatarioId: uuid('destinatario_id').references(() => usuarios.id, { onDelete: 'set null' }),
  rol: varchar('rol', { length: 20 }).default('editor').notNull(),
  estado: estadoSolicitudVinculo('estado').default('pendiente').notNull(),
  mensaje: text('mensaje'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('invitaciones_espacio_destinatario_idx').on(table.destinatarioEmail, table.estado),
  index('invitaciones_espacio_espacio_idx').on(table.espacioId),
])

// ── Tabla: ingresos ── (módulo de ingresos, espejo simple de gastos)
// Justifica saldo neto del mes y proyección de flujo de caja. Las
// categorías de ingreso se distinguen por `tipo_origen` (no se reusan
// las de gasto para no contaminar listas).
export const ingresos = pgTable('ingresos', {
  id: uuid('id').defaultRandom().primaryKey(),
  usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'cascade' }).notNull(),
  concepto: varchar('concepto', { length: 255 }).notNull(),
  monto: decimal('monto', { precision: 12, scale: 2 }).notNull(),
  fecha: date('fecha').notNull(),
  origen: varchar('origen', { length: 60 }), // 'salario' | 'freelance' | 'inversion' | 'otro' (libre)
  esRecurrente: boolean('es_recurrente').default(false).notNull(),
  recurrenteGrupoId: uuid('recurrente_grupo_id'),
  metodoRegistro: metodoRegistro('metodo_registro').default('manual').notNull(),
  espacioId: uuid('espacio_id'),
  notas: text('notas'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('ingresos_usuario_fecha_idx').on(table.usuarioId, table.fecha),
  index('ingresos_usuario_origen_idx').on(table.usuarioId, table.origen),
  index('ingresos_usuario_deleted_idx').on(table.usuarioId, table.deletedAt),
  index('ingresos_espacio_fecha_idx').on(table.espacioId, table.fecha),
])

// ── Tabla: medios_ahorro ──
export const mediosAhorro = pgTable('medios_ahorro', {
  id: uuid('id').defaultRandom().primaryKey(),
  usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'cascade' }).notNull(),
  nombre: varchar('nombre', { length: 80 }).notNull(),
  tipo: varchar('tipo', { length: 40 }),
  icono: varchar('icono', { length: 16 }),
  color: varchar('color', { length: 16 }),
  orden: integer('orden').default(0).notNull(),
  activo: boolean('activo').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('medios_ahorro_usuario_idx').on(table.usuarioId),
])

// ── Tabla: ahorros ──
export const ahorros = pgTable('ahorros', {
  id: uuid('id').defaultRandom().primaryKey(),
  usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'cascade' }).notNull(),
  medioAhorroId: uuid('medio_ahorro_id').references(() => mediosAhorro.id, { onDelete: 'set null' }),
  gastoPlanificadoId: uuid('gasto_planificado_id').references(() => gastosPlanificados.id, { onDelete: 'set null' }),
  gastoId: uuid('gasto_id').references(() => gastos.id, { onDelete: 'set null' }),
  concepto: varchar('concepto', { length: 200 }),
  monto: decimal('monto', { precision: 12, scale: 2 }).notNull(),
  fecha: date('fecha').notNull(),
  mes: integer('mes').notNull(),
  anio: integer('anio').notNull(),
  notas: text('notas'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('ahorros_usuario_mes_idx').on(table.usuarioId, table.anio, table.mes),
  index('ahorros_medio_idx').on(table.medioAhorroId),
  index('ahorros_usuario_fecha_idx').on(table.usuarioId, table.fecha),
])

// ── Tabla: metas_ahorro ──
export const metasAhorro = pgTable('metas_ahorro', {
  id: uuid('id').defaultRandom().primaryKey(),
  usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'cascade' }).notNull(),
  tipo: varchar('tipo', { length: 16 }).notNull(),
  mes: integer('mes'),
  anio: integer('anio'),
  montoObjetivo: decimal('monto_objetivo', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('metas_ahorro_mensual_uniq').on(table.usuarioId, table.tipo, table.mes, table.anio),
])

// ── Tabla 12: solicitudes_vinculo ──
export const solicitudesVinculo = pgTable('solicitudes_vinculo', {
  id: uuid('id').defaultRandom().primaryKey(),
  remitenteId: uuid('remitente_id').references(() => usuarios.id, { onDelete: 'cascade' }).notNull(),
  destinatarioEmail: varchar('destinatario_email', { length: 255 }).notNull(),
  destinatarioId: uuid('destinatario_id').references(() => usuarios.id, { onDelete: 'set null' }),
  personaEntidadId: uuid('persona_entidad_id').references(() => personasEntidades.id, { onDelete: 'cascade' }).notNull(),
  estado: estadoSolicitudVinculo('estado').default('pendiente').notNull(),
  mensaje: text('mensaje'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('solicitudes_vinculo_destinatario_idx').on(table.destinatarioEmail),
  index('solicitudes_vinculo_remitente_idx').on(table.remitenteId),
  index('solicitudes_vinculo_estado_idx').on(table.estado),
  index('solicitudes_vinculo_destinatario_estado_idx').on(table.destinatarioEmail, table.estado),
])

// ── Tabla 15: suscripciones_push — Web Push API ──
// Ver §5.3 de planifica.md.
export const suscripcionesPush = pgTable('suscripciones_push', {
  id: uuid('id').defaultRandom().primaryKey(),
  usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'cascade' }).notNull(),
  endpoint: text('endpoint').notNull(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  userAgent: varchar('user_agent', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('suscripciones_push_endpoint_uniq').on(table.endpoint),
  index('suscripciones_push_usuario_idx').on(table.usuarioId),
])

// ── Tabla 14: plantillas_mes — plantillas reutilizables de plan mensual ──
// Ver §5.A punto 4 de planifica.md.
export const plantillasMes = pgTable('plantillas_mes', {
  id: uuid('id').defaultRandom().primaryKey(),
  usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'cascade' }).notNull(),
  nombre: varchar('nombre', { length: 150 }).notNull(),
  montoPresupuesto: decimal('monto_presupuesto', { precision: 12, scale: 2 }),
  // gastos: JSONB con array de { concepto, montoEstimado, categoriaId, fechaProbablePago, notas }
  gastos: text('gastos_json').notNull().default('[]'),
  notas: text('notas'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('plantillas_mes_usuario_idx').on(table.usuarioId),
])

// ── Tabla 13: uso_llm — tracking de consumo del LLM por usuario y mes ──
// Ver §1.9 de planifica.md.
export const usoLlm = pgTable('uso_llm', {
  id: uuid('id').defaultRandom().primaryKey(),
  usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'cascade' }).notNull(),
  anio: integer('anio').notNull(),
  mes: integer('mes').notNull(),
  endpoint: varchar('endpoint', { length: 100 }).notNull(),
  totalRequests: integer('total_requests').default(0).notNull(),
  totalTokens: integer('total_tokens').default(0).notNull(),
  ultimaPeticion: timestamp('ultima_peticion'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('uso_llm_usuario_periodo_uniq').on(
    table.usuarioId,
    table.anio,
    table.mes,
    table.endpoint,
  ),
  index('uso_llm_usuario_idx').on(table.usuarioId),
])

// ── Tabla: llm_cache — caché de respuestas del LLM ──
// Guarda el JSON parseado devuelto por Gemini para una entrada idéntica
// (modelo + usuario + endpoint + hash del prompt normalizado). Evita
// pagar tokens cuando el usuario repite la misma transcripción/foto.
//
// El usuarioId está incluido en el hash para aislar entre usuarios:
// dos usuarios pueden tener prompts iguales pero categorías distintas,
// así que la respuesta no es compartible.
export const llmCache = pgTable('llm_cache', {
  id: uuid('id').defaultRandom().primaryKey(),
  usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'cascade' }).notNull(),
  endpoint: varchar('endpoint', { length: 100 }).notNull(),
  modelo: varchar('modelo', { length: 100 }).notNull(),
  inputHash: varchar('input_hash', { length: 64 }).notNull(),
  responseJson: text('response_json').notNull(),
  hits: integer('hits').default(0).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('llm_cache_lookup_uniq').on(
    table.usuarioId,
    table.endpoint,
    table.modelo,
    table.inputHash,
  ),
  index('llm_cache_expires_idx').on(table.expiresAt),
])

// ── Integraciones: Google Calendar ──
export const googleCalendarConexiones = pgTable('google_calendar_conexiones', {
  id: uuid('id').defaultRandom().primaryKey(),
  usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'cascade' }).notNull(),
  refreshTokenCifrado: text('refresh_token_cifrado').notNull(),
  calendarId: varchar('calendar_id', { length: 255 }).notNull(),
  calendarNombre: varchar('calendar_nombre', { length: 255 }).notNull(),
  recordatoriosConfig: jsonb('recordatorios_config').notNull(),
  ultimaSync: timestamp('ultima_sync'),
  ultimoError: text('ultimo_error'),
  fechaConexion: timestamp('fecha_conexion').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('google_calendar_conexiones_usuario_unique').on(table.usuarioId),
])

// ──────────────────────────────────────────────────────────────────
// Submódulos integrados (migración 0026)
// ──────────────────────────────────────────────────────────────────

export const tipoMeta = pgEnum('tipo_meta', ['ahorro', 'deuda', 'gasto_limite'])

export const metas = pgTable('metas', {
  id: uuid('id').defaultRandom().primaryKey(),
  usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'cascade' }).notNull(),
  nombre: varchar('nombre', { length: 120 }).notNull(),
  tipo: tipoMeta('tipo').notNull(),
  montoObjetivo: decimal('monto_objetivo', { precision: 12, scale: 2 }).notNull(),
  fechaLimite: date('fecha_limite'),
  icono: varchar('icono', { length: 16 }).default('🎯'),
  color: varchar('color', { length: 16 }).default('#10b981'),
  archivada: boolean('archivada').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => [
  index('metas_usuario_idx').on(table.usuarioId, table.archivada),
])

export const metaMovimientos = pgTable('meta_movimientos', {
  id: uuid('id').defaultRandom().primaryKey(),
  metaId: uuid('meta_id').references(() => metas.id, { onDelete: 'cascade' }).notNull(),
  monto: decimal('monto', { precision: 12, scale: 2 }).notNull(),
  fecha: date('fecha').notNull(),
  nota: text('nota'),
  // Origen opcional: enlaza al recurso real que lo generó.
  origenTipo: varchar('origen_tipo', { length: 24 }), // 'ahorro' | 'pago_deuda' | 'gasto' | 'manual'
  origenId: uuid('origen_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('meta_movs_meta_idx').on(table.metaId, table.fecha),
  index('meta_movs_origen_idx').on(table.origenTipo, table.origenId),
])

export const presupuestosCategoria = pgTable('presupuestos_categoria', {
  id: uuid('id').defaultRandom().primaryKey(),
  usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'cascade' }).notNull(),
  categoriaId: uuid('categoria_id').references(() => categorias.id, { onDelete: 'cascade' }).notNull(),
  montoMensual: decimal('monto_mensual', { precision: 12, scale: 2 }).notNull(),
  alertaUmbral: integer('alerta_umbral').notNull().default(80), // % 0-100
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('pcat_usuario_categoria_uq').on(table.usuarioId, table.categoriaId),
])

