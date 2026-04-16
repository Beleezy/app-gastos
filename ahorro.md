# Plan — Mini-módulo "Ahorros"

## Contexto

El usuario quiere un mini-módulo para registrar y visualizar cuánto ahorra por mes, en qué medio lo tiene (Yape, Plin, banco, efectivo, etc.) y con metas mensuales/globales. Debe integrarse con el flujo existente del planificador: cuando se crea/paga un `gasto_planificado` con categoría **Ahorro**, se sugiere (y al pagar, se registra) una entrada en ahorros.

Hoy la categoría "Ahorro" existe como predefinida en [server/database/seed.js](server/database/seed.js), pero no hay tabla ni vistas que agreguen el total ahorrado ni el desglose por medio. El usuario no puede responder preguntas como "¿cuánto tengo en Yape este mes?" o "¿voy bien contra mi meta de ahorro?".

## Decisiones ya tomadas

- **Modelo de datos**: tablas nuevas `ahorros` + `medios_ahorro` (medios configurables por usuario con ícono/color).
- **Metas**: meta mensual y meta global.
- **UI**: página separada [pages/ahorros.vue](pages/ahorros.vue) accesible desde Planificador (enlace/botón) — no toca BottomNav por ahora.
- **Vínculo con gastos planificados**: sugerencia al crear (si categoría = Ahorro, pedir medio) + registro automático al marcar como pagado.

## 1. Schema DB — [server/database/schema.js](server/database/schema.js)

### Nuevas tablas

```js
// medios_ahorro — catálogo por usuario (Yape, Plin, BCP, efectivo, etc.)
export const mediosAhorro = pgTable('medios_ahorro', {
  id: uuid('id').primaryKey().defaultRandom(),
  usuarioId: uuid('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
  nombre: varchar('nombre', { length: 80 }).notNull(),
  tipo: varchar('tipo', { length: 40 }),          // 'billetera_digital' | 'cuenta_bancaria' | 'efectivo' | 'otro'
  icono: varchar('icono', { length: 16 }),
  color: varchar('color', { length: 16 }),
  orden: integer('orden').default(0),
  activo: boolean('activo').default(true),
  creadoEn: timestamp('creado_en').defaultNow(),
}, (t) => ({ usuarioIdx: index('medios_ahorro_usuario_idx').on(t.usuarioId) }));

// ahorros — movimientos de ahorro
export const ahorros = pgTable('ahorros', {
  id: uuid('id').primaryKey().defaultRandom(),
  usuarioId: uuid('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
  medioAhorroId: uuid('medio_ahorro_id').references(() => mediosAhorro.id, { onDelete: 'set null' }),
  gastoPlanificadoId: uuid('gasto_planificado_id').references(() => gastosPlanificados.id, { onDelete: 'set null' }),
  gastoId: uuid('gasto_id').references(() => gastos.id, { onDelete: 'set null' }),
  concepto: varchar('concepto', { length: 200 }),
  monto: decimal('monto', { precision: 12, scale: 2 }).notNull(),
  fecha: date('fecha').notNull(),
  mes: integer('mes').notNull(),      // denormalizado para queries rápidas por mes
  anio: integer('anio').notNull(),
  notas: text('notas'),
  creadoEn: timestamp('creado_en').defaultNow(),
  actualizadoEn: timestamp('actualizado_en').defaultNow(),
}, (t) => ({
  usuarioMesIdx: index('ahorros_usuario_mes_idx').on(t.usuarioId, t.anio, t.mes),
  medioIdx: index('ahorros_medio_idx').on(t.medioAhorroId),
}));

// metas_ahorro — meta global + metas mensuales por usuario
export const metasAhorro = pgTable('metas_ahorro', {
  id: uuid('id').primaryKey().defaultRandom(),
  usuarioId: uuid('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
  tipo: varchar('tipo', { length: 16 }).notNull(),   // 'global' | 'mensual'
  mes: integer('mes'),                                // null para global
  anio: integer('anio'),                              // null para global
  montoObjetivo: decimal('monto_objetivo', { precision: 12, scale: 2 }).notNull(),
  creadoEn: timestamp('creado_en').defaultNow(),
}, (t) => ({
  uniqMensual: uniqueIndex('metas_ahorro_mensual_uniq').on(t.usuarioId, t.tipo, t.mes, t.anio),
}));
```

- Migración: `npm run db:generate` → revisar SQL generado en [server/database/migrations/](server/database/migrations/) → `npm run db:push`.
- Seed de medios por defecto en [server/database/seed.js](server/database/seed.js): Yape, Plin, Efectivo, Cuenta bancaria (se crean en el primer acceso del usuario si no tiene ninguno, no globales).

## 2. API — `/server/api/ahorros/`

Reutilizar patrón de [server/api/planificador/gastos/index.post.js](server/api/planificador/gastos/index.post.js) (auth vía `getUsuarioFromEvent`, validación FK usuario, Drizzle `.insert().returning()`, `parseFloat` en montos al devolver).

- **`index.get.js`** — Query `?mes&anio` (default mes/año actual). Devuelve: `ahorros` del mes (JOIN `mediosAhorro`), `totalMes`, `totalGlobal`, `porMedio` (agregación por medio con subtotal), `metaMensual`, `metaGlobal`, `progresoMensual`, `progresoGlobal`, y serie de últimos 6 meses para el gráfico.
- **`index.post.js`** — Crea ahorro. Body: `{ medioAhorroId, concepto, monto, fecha, notas, gastoPlanificadoId? }`. Deriva `mes`/`anio` de `fecha`.
- **`[id].put.js`** — Actualiza (mismos campos editables).
- **`[id].delete.js`** — Elimina.
- **`medios/index.get.js`** — Lista medios del usuario (activos). Si está vacío, sembrar medios por defecto en el primer fetch.
- **`medios/index.post.js`**, **`medios/[id].put.js`**, **`medios/[id].delete.js`** — CRUD.
- **`metas.get.js`** — Retorna meta global + meta del mes actual.
- **`metas.put.js`** — Upsert de meta (body: `{ tipo, mes?, anio?, montoObjetivo }`).

### Integración con gastos planificados

- En [server/api/planificador/gastos/[id]/registro.post.js](server/api/planificador/gastos/%5Bid%5D/registro.post.js): después de crear el `gasto` real, si la categoría del planificado es **"Ahorro"**, crear también un `ahorros` vinculado (`gastoPlanificadoId`, `gastoId`, `monto`, `fecha`). El `medioAhorroId` se toma del body del endpoint (el modal `FormRegistrarPago` lo pedirá). Si el usuario no elige medio, dejarlo `null` y que lo complete después en `/ahorros`.
- En [server/api/planificador/gastos/index.post.js](server/api/planificador/gastos/index.post.js): **no** crea fila en `ahorros` al crear el planificado (el ahorro es un movimiento real, no una planificación); solo la UI sugerirá elegir medio para guardarlo en el payload del planificado… en realidad mantenemos simple: la sugerencia al crear es solo UI (banner informativo "Este gasto planificado se registrará como ahorro al marcarlo como pagado"), sin persistencia adicional en el momento de crear.

## 3. Composable — [composables/useAhorros.js](composables/useAhorros.js)

Espejo de [composables/usePlanificador.js](composables/usePlanificador.js). Estado: `ahorros`, `medios`, `metaMensual`, `metaGlobal`, `mesActual`, `anioActual`, `loading`. Computed: `totalMes`, `totalGlobal`, `porMedio`, `progresoMensual`, `progresoGlobal`, `serie6Meses`. Métodos: `fetchAhorros()`, `createAhorro()`, `updateAhorro()`, `deleteAhorro()`, `fetchMedios()`, `createMedio()`, `updateMedio()`, `deleteMedio()`, `setMeta()`, `mesSiguiente()`, `mesAnterior()`.

- Usa [composables/useApiFetch.js](composables/useApiFetch.js) para todas las llamadas.
- Reutiliza [composables/useFormatters.js](composables/useFormatters.js) para formato de moneda/fechas.

## 4. UI — Página y componentes

### [pages/ahorros.vue](pages/ahorros.vue) (nueva)

Estructura inspirada en [pages/planificador.vue](pages/planificador.vue):
- Header con `MonthSelector` ([components/shared/MonthSelector.vue](components/shared/MonthSelector.vue)) + swipe vía [composables/useSwipeMonth.js](composables/useSwipeMonth.js).
- `<ResumenAhorros />` — cards: total mes, total global, progreso meta mensual (barra), progreso meta global.
- `<GraficoAhorroMensual />` — serie de últimos 6 meses (reutilizar estilo de [components/planificador/GraficoCategoria.vue](components/planificador/GraficoCategoria.vue)).
- `<DesgloseMedios />` — lista por medio con subtotales + % del total del mes (ícono, color, monto).
- `<ListaAhorros />` — items del mes, con acciones editar/eliminar.
- FAB `+` → abre `<FormAhorro />` en `BaseBottomSheet`.

### Componentes nuevos en [components/ahorros/](components/ahorros/)

- `ResumenAhorros.vue`, `GraficoAhorroMensual.vue`, `DesgloseMedios.vue`, `ListaAhorros.vue`, `AhorroItem.vue`.
- `FormAhorro.vue` — BaseBottomSheet con concepto, monto, fecha, medio (grid 4 cols como en [FormGastoPlaneado.vue](components/planificador/FormGastoPlaneado.vue)), notas. Botón "Gestionar medios" → abre `FormMedioAhorro`.
- `FormMedioAhorro.vue` — CRUD simple de medios.
- `FormMetaAhorro.vue` — Edit meta mensual/global (tabs).

### Modificaciones a componentes existentes

- **[components/planificador/FormGastoPlaneado.vue](components/planificador/FormGastoPlaneado.vue)**: cuando la categoría seleccionada es "Ahorro", mostrar banner sugiriendo que se registrará como ahorro al marcarlo pagado, y botón "Ir a Ahorros". Sin cambios de datos.
- **[components/planificador/FormRegistrarPago.vue](components/planificador/FormRegistrarPago.vue)**: si el gasto planificado tiene categoría "Ahorro", añadir selector de **medio de ahorro** (required) que se envía al endpoint `registro.post.js`.
- **[pages/planificador.vue](pages/planificador.vue)**: añadir un link/botón "Ahorros" en el header o junto al selector de secciones que navegue a `/ahorros`.

## 5. Archivos críticos

| Archivo | Acción |
|---|---|
| [server/database/schema.js](server/database/schema.js) | Agregar `mediosAhorro`, `ahorros`, `metasAhorro` |
| [server/database/seed.js](server/database/seed.js) | Medios por defecto (creados on-demand por usuario) |
| [server/api/ahorros/](server/api/ahorros/) | Endpoints CRUD + medios + metas |
| [server/api/planificador/gastos/[id]/registro.post.js](server/api/planificador/gastos/%5Bid%5D/registro.post.js) | Crear ahorro si categoría = Ahorro |
| [composables/useAhorros.js](composables/useAhorros.js) | Nuevo composable |
| [pages/ahorros.vue](pages/ahorros.vue) | Nueva página |
| [components/ahorros/](components/ahorros/) | 8 componentes nuevos |
| [components/planificador/FormGastoPlaneado.vue](components/planificador/FormGastoPlaneado.vue) | Banner sugerencia |
| [components/planificador/FormRegistrarPago.vue](components/planificador/FormRegistrarPago.vue) | Selector de medio |
| [pages/planificador.vue](pages/planificador.vue) | Acceso a /ahorros |

## 6. Verificación end-to-end

1. `npm run db:generate` y revisar migración; `npm run db:push` en DB local.
2. `npm run dev` y autenticarse.
3. Ir a `/ahorros`: verificar que se siembran 4 medios por defecto, ver resumen vacío.
4. Crear medio personalizado (ej. "BBVA Ahorros") — confirmar en lista.
5. Crear ahorro manual con monto S/200 en "Yape", fecha hoy → aparece en lista, total mes = 200, desglose Yape = 100%.
6. Definir meta mensual S/500 y global S/5000 → barras de progreso 40% y 4%.
7. Navegar entre meses con swipe y `MonthSelector` → datos del mes correcto.
8. Crear en `/planificador` un gasto planificado con categoría **Ahorro** → banner visible en el form.
9. Marcar ese planificado como pagado desde [components/planificador/FormRegistrarPago.vue](components/planificador/FormRegistrarPago.vue) eligiendo medio "Plin" → verificar en `/ahorros` que apareció una nueva fila vinculada (con `gastoPlanificadoId` y `gastoId` no nulos), total mes incrementado.
10. Editar y eliminar un ahorro → cambios reflejados y metas recalculadas.
11. Verificar responsive en 360–412px (mobile-first) y modo oscuro.
