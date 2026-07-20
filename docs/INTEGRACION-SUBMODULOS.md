# Plan de integración de submódulos

Cinco submódulos viven hoy de forma independiente con persistencia en
`localStorage` para que se puedan iterar sin tocar la BD ni los flujos
existentes. Este documento es el "manual de upgrade" cuando decidamos
integrarlos al núcleo (Postgres + endpoints + composables principales).

Cada sección incluye:

1. **Schema SQL** — la migración Drizzle/SQL para mover los datos a BD.
2. **Endpoints** — los handlers REST que reemplazan a localStorage.
3. **Composable** — qué cambiar en el composable existente para que use API.
4. **Integraciones de UI** — código pegable para conectar al resto.

Resumen rápido de las páginas y artefactos creados:

| Submódulo                  | Página                    | Composable                                | Storage                           |
| -------------------------- | ------------------------- | ----------------------------------------- | --------------------------------- |
| Suscripciones              | `pages/suscripciones.vue` | `composables/useSuscripciones.js`         | `subs.items.v1`                   |
| Metas                      | `pages/metas.vue`         | `composables/useMetas.js`                 | `metas.items.v1`, `metas.movs.v1` |
| Presupuestos por categoría | `pages/presupuestos.vue`  | `composables/usePresupuestosCategoria.js` | `pcat.items.v1`                   |
| Calendario financiero      | `pages/calendario.vue`    | (lee de los anteriores + APIs existentes) | —                                 |
| Etiquetas                  | `pages/etiquetas.vue`     | `composables/useEtiquetas.js`             | `etq.items.v1`, `etq.asign.v1`    |

---

## 1) Suscripciones — pasar a Postgres + integrar a planificador

### 1.1 Schema (añadir a `server/database/schema.js`)

```js
export const periodicidadSuscripcion = pgEnum('periodicidad_suscripcion', [
  'semanal',
  'quincenal',
  'mensual',
  'bimestral',
  'trimestral',
  'semestral',
  'anual',
])

export const suscripciones = pgTable(
  'suscripciones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    nombre: varchar('nombre', { length: 120 }).notNull(),
    monto: numeric('monto', { precision: 12, scale: 2 }).notNull(),
    periodicidad: periodicidadSuscripcion('periodicidad').notNull().default('mensual'),
    fechaInicio: date('fecha_inicio').notNull(),
    categoriaId: uuid('categoria_id').references(() => categorias.id, { onDelete: 'set null' }),
    icono: varchar('icono', { length: 8 }).default('🔁'),
    color: varchar('color', { length: 16 }).default('#3b82f6'),
    url: text('url'),
    notas: text('notas'),
    activa: boolean('activa').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    porUsuario: index('suscripciones_usuario_idx').on(t.usuarioId, t.activa),
  }),
)
```

### 1.2 Endpoints (crear `server/api/suscripciones/`)

`index.get.js` — lista del usuario:

```js
import { db } from '../../utils/db.js'
import { suscripciones } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and, isNull, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  setHeader(event, 'Cache-Control', 'private, max-age=60, stale-while-revalidate=300')
  const rows = await db
    .select()
    .from(suscripciones)
    .where(and(eq(suscripciones.usuarioId, usuarioId), isNull(suscripciones.deletedAt)))
    .orderBy(desc(suscripciones.createdAt))
  return rows.map((s) => ({ ...s, monto: parseFloat(s.monto) }))
})
```

`index.post.js`, `[id].put.js`, `[id].delete.js` siguen el patrón
del resto del proyecto (ver `server/api/categorias/`).

### 1.3 Refactor del composable

En `composables/useSuscripciones.js`, reemplazar `useLocalStorage` por
`useResourceCache` + `apiFetch`. Mantener la API pública (`crear`,
`actualizar`, `eliminar`, `pausarReanudar`) intacta para no romper
`pages/suscripciones.vue` ni `pages/calendario.vue`.

```js
export function useSuscripciones() {
  const { apiFetch } = useApiFetch()
  const cache = useResourceCache('suscripciones', () => apiFetch('/api/suscripciones'), {
    ttl: 60_000,
    initial: [],
  })
  const items = cache.data

  async function crear(data) {
    const nuevo = await apiFetch('/api/suscripciones', { method: 'POST', body: data })
    items.value = [...items.value, nuevo]
    return nuevo
  }
  // ... actualizar / eliminar / pausarReanudar análogos
  // computed activas/totalMensual/totalAnual/proximos30Dias quedan igual
}
```

### 1.4 Integraciones de UI (código listo para pegar)

**A. Auto-crear gasto planificado al acercarse el cobro.**
Añadir a `composables/usePlanificador.js`, dentro de `fetchPlan()`,
después de cargar `gastosPlaneados.value`:

```js
// Auto-añadir suscripciones del mes que aún no estén planificadas.
const { proximos30Dias } = useSuscripciones()
const ya = new Set(gastosPlaneados.value.map((g) => `sub:${g.notas || ''}`))
for (const s of proximos30Dias.value) {
  if (s.proxima.getMonth() + 1 !== mesActual.value) continue
  if (ya.has(`sub:${s.id}`)) continue
  // Sólo sugerir, no auto-insertar: añadir a un nuevo computed `sugerencias`.
}
```

Mejor patrón (no auto-insertar, sólo proponer): exponer un nuevo
`computed sugerenciasDeSuscripciones` en `usePlanificador.js` y
pintarlas como banner en `components/planificador/ListaGastosPlaneados.vue`.

**B. Sumar al "Gasto del mes" del dashboard.**
En `pages/index.vue`, dentro de `pintarDesdeCache()`, añadir:

```js
const { totalMensual: totalSuscrMes } = useSuscripciones()
const totalMesProyectado = computed(() => totalMes.value + totalSuscrMes.value)
// Usar totalMesProyectado en la tarjeta de "Gasto del mes" con un badge
// "incluye suscripciones".
```

**C. Notificación push antes del cobro.**
Reaprovechar `usePushNotifications.js`. En `plugins/prefetch.client.js`:

```js
const { proximos30Dias } = useSuscripciones()
for (const s of proximos30Dias.value) {
  if (s.diasRestantes <= 1) {
    // disparar local notification — ver useNotificacionLocal.js
  }
}
```

---

## 2) Metas — integrar con ahorros, deudas y registro

### 2.1 Schema

```js
export const tipoMeta = pgEnum('tipo_meta', ['ahorro', 'deuda', 'gasto_limite'])

export const metas = pgTable('metas', {
  id: uuid('id').primaryKey().defaultRandom(),
  usuarioId: uuid('usuario_id')
    .notNull()
    .references(() => usuarios.id, { onDelete: 'cascade' }),
  nombre: varchar('nombre', { length: 120 }).notNull(),
  tipo: tipoMeta('tipo').notNull(),
  montoObjetivo: numeric('monto_objetivo', { precision: 12, scale: 2 }).notNull(),
  fechaLimite: date('fecha_limite'),
  icono: varchar('icono', { length: 8 }).default('🎯'),
  color: varchar('color', { length: 16 }).default('#10b981'),
  archivada: boolean('archivada').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export const metaMovimientos = pgTable('meta_movimientos', {
  id: uuid('id').primaryKey().defaultRandom(),
  metaId: uuid('meta_id')
    .notNull()
    .references(() => metas.id, { onDelete: 'cascade' }),
  monto: numeric('monto', { precision: 12, scale: 2 }).notNull(),
  fecha: date('fecha').notNull(),
  nota: text('nota'),
  // Opcional: enlazar a la fuente real que generó el movimiento.
  ahorroId: uuid('ahorro_id').references(() => ahorros.id, { onDelete: 'set null' }),
  pagoDeudaId: uuid('pago_deuda_id').references(() => pagosDeuda.id, { onDelete: 'set null' }),
  gastoId: uuid('gasto_id').references(() => gastos.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
```

### 2.2 Endpoints

CRUD estándar bajo `/api/metas` y `/api/metas/[id]/movimientos`. Idéntico
patrón a `/api/ahorros`.

### 2.3 Integraciones de UI

**A. Auto-tracking desde ahorros.**
En `composables/useAhorros.js`, dentro de `crearAhorro`, después de
guardar el ahorro:

```js
const { items: metas, registrarMovimiento } = useMetas()
const metaAhorro = metas.value.find((m) => m.tipo === 'ahorro' && m.nombre === ahorro.concepto)
if (metaAhorro) {
  registrarMovimiento(metaAhorro.id, {
    monto: ahorro.monto,
    fecha: ahorro.fecha,
    nota: `Auto desde ahorro ${ahorro.id}`,
  })
}
```

**B. Auto-tracking desde pagos de deuda.**
En `composables/useDeudas.js` → `crearPago`, después del `await apiFetch`:

```js
const { items: metas, registrarMovimiento } = useMetas()
const metaDeuda = metas.value.find((m) => m.tipo === 'deuda')
if (metaDeuda) {
  registrarMovimiento(metaDeuda.id, {
    monto: nuevoPago.monto,
    fecha: nuevoPago.fecha,
    nota: `Pago de deuda #${deudaId}`,
  })
}
```

**C. Tope de gasto en /registro.**
En `pages/registro.vue` dentro de `crearGasto`, antes de persistir:

```js
const { items: metas } = useMetas()
const topes = metas.value.filter((m) => m.tipo === 'gasto_limite')
// pintar warning si el gasto haría superar algún tope; no bloquear,
// solo confirmar con el usuario.
```

**D. Card en dashboard.**
En `pages/index.vue`, añadir una card que muestre `progresoActual` /
`montoObjetivo` para las primeras 2 metas activas (snapshot de
`useMetas()` ya está disponible client-side).

---

## 3) Presupuestos por categoría — alerta en tiempo real

### 3.1 Schema

```js
export const presupuestosCategoria = pgTable(
  'presupuestos_categoria',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    categoriaId: uuid('categoria_id')
      .notNull()
      .references(() => categorias.id, { onDelete: 'cascade' }),
    montoMensual: numeric('monto_mensual', { precision: 12, scale: 2 }).notNull(),
    alertaUmbral: integer('alerta_umbral').notNull().default(80), // %
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    unicaPorUsuarioCat: uniqueIndex('pcat_usuario_categoria_uq').on(t.usuarioId, t.categoriaId),
  }),
)
```

### 3.2 Endpoints

GET / POST / PUT / DELETE bajo `/api/presupuestos-categoria`.
Plus: `/api/presupuestos-categoria/estado?mes&anio` que devuelva, en una
query, el consumo por categoría + el límite. Pseudocódigo del SELECT:

```sql
SELECT
  c.id, c.nombre, c.color, c.icono,
  pc.monto_mensual,
  pc.alerta_umbral,
  COALESCE(SUM(g.monto) FILTER (WHERE g.fecha BETWEEN $primerDia AND $ultimoDia), 0) AS consumido
FROM presupuestos_categoria pc
JOIN categorias c ON c.id = pc.categoria_id
LEFT JOIN gastos g ON g.categoria_id = pc.categoria_id
  AND g.usuario_id = pc.usuario_id
  AND g.deleted_at IS NULL
WHERE pc.usuario_id = $usuarioId
GROUP BY c.id, pc.monto_mensual, pc.alerta_umbral;
```

### 3.3 Integraciones de UI

**A. Semáforo al añadir gasto en /registro.**
En `components/registro/FormGastoManual.vue`, dentro del watch de
`form.categoriaId`:

```js
const { porcentajeUsado, estadoSemaforo, cargarConsumo } = usePresupuestosCategoria()
const hoy = new Date()
await cargarConsumo(hoy.getMonth() + 1, hoy.getFullYear())

watch(
  () => form.categoriaId,
  (id) => {
    const pct = porcentajeUsado(id)
    const estado = estadoSemaforo(id)
    if (estado === 'critico') {
      toastWarning(`Ya superaste el presupuesto de esta categoría (${pct.toFixed(0)}%).`)
    } else if (estado === 'alerta') {
      toastInfo(`Llevas ${pct.toFixed(0)}% del presupuesto de esta categoría.`)
    }
  },
)
```

**B. Badge en BottomNav.**
En `components/layout/BottomNav.vue`, añadir:

```js
const { items: presupuestos, estadoSemaforo } = usePresupuestosCategoria()
const alertasPresupuesto = computed(
  () => presupuestos.value.filter((p) => estadoSemaforo(p.categoriaId) !== 'ok').length,
)
// Sumarlo al badge actual de /planificador.
```

**C. Notificación push al cruzar umbral.**
Server-side: hook después de `POST /api/gastos`. En
`server/api/gastos/index.post.js`, al final:

```js
const total = await db
  .select({ s: sql`COALESCE(SUM(${gastos.monto}),0)` })
  .from(gastos)
  .where(/* mismo mes y categoria */)
const [pcat] = await db
  .select()
  .from(presupuestosCategoria)
  .where(
    and(
      eq(presupuestosCategoria.usuarioId, usuarioId),
      eq(presupuestosCategoria.categoriaId, gasto.categoriaId),
    ),
  )
  .limit(1)
if (pcat && (parseFloat(total[0].s) / parseFloat(pcat.montoMensual)) * 100 >= pcat.alertaUmbral) {
  await enviarNotificacionPush(usuarioId, {
    titulo: `Alerta de presupuesto`,
    cuerpo: `Llegaste al ${pcat.alertaUmbral}% del presupuesto de ${categoria.nombre}`,
  })
}
```

---

## 4) Calendario financiero — sustituye CalendarioMensual

### 4.1 Sin schema nuevo

El calendario sólo combina datos de otros submódulos + planificador +
deudas. No requiere persistencia propia.

### 4.2 Integración

**A. Reemplazar `components/planificador/CalendarioMensual.vue`.**

En `pages/planificador.vue`, reemplazar el bloque que monta
`<CalendarioMensual />` por:

```vue
<LazyCalendarioGlobal :mes="mesActual" :anio="anioActual" />
```

Extraer la grilla calendario de `pages/calendario.vue` a un componente
nuevo `components/calendario/CalendarioGlobal.vue` que reciba `mes` y
`anio` como props y emita `@click-dia="(fecha) => ..."`. La página
`/calendario` lo usa con props internas, y `/planificador` lo monta
con los mismos.

**B. Quick-add desde el calendario.**

Añadir a `CalendarioGlobal.vue`:

```vue
<button @click="$emit('add-evento', cell.fecha)">+ Añadir</button>
```

En la página padre, abrir el modal correspondiente (gasto planificado,
suscripción o pago de deuda) según el tipo elegido.

**C. Sincronización con Google Calendar.**

Ya existe `useGoogleCalendar.js`. Al cargar eventos del mes, exportar
los del calendario unificado:

```js
const { exportarEvento } = useGoogleCalendar()
for (const ev of eventosDelMes.value) {
  if (ev.tipo === 'planificado' && !ev.sincronizado) {
    await exportarEvento({ titulo: ev.titulo, fecha: ev.fecha, monto: ev.monto })
  }
}
```

---

## 5) Etiquetas — chips en GastoItem + filtro en /registro

### 5.1 Schema

```js
export const etiquetas = pgTable(
  'etiquetas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    nombre: varchar('nombre', { length: 40 }).notNull(),
    color: varchar('color', { length: 16 }).notNull().default('#3b82f6'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    unicaPorUsuario: uniqueIndex('etq_usuario_nombre_uq').on(t.usuarioId, t.nombre),
  }),
)

// Tabla polimórfica: una asignación puede apuntar a gasto, planificado o futuro.
export const etiquetasAsign = pgTable(
  'etiquetas_asign',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    etiquetaId: uuid('etiqueta_id')
      .notNull()
      .references(() => etiquetas.id, { onDelete: 'cascade' }),
    recursoTipo: varchar('recurso_tipo', { length: 24 }).notNull(), // 'gasto' | 'planificado' | 'futuro'
    recursoId: uuid('recurso_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    porRecurso: index('etq_asign_recurso_idx').on(t.recursoTipo, t.recursoId),
    unica: uniqueIndex('etq_asign_uq').on(t.etiquetaId, t.recursoTipo, t.recursoId),
  }),
)
```

### 5.2 Endpoints

```
GET    /api/etiquetas
POST   /api/etiquetas
PUT    /api/etiquetas/[id]
DELETE /api/etiquetas/[id]
POST   /api/etiquetas/[id]/asignar      body: { recursoTipo, recursoId }
DELETE /api/etiquetas/[id]/asignar      body: { recursoTipo, recursoId }
```

### 5.3 Integraciones de UI (listas para pegar)

**A. Chips en `GastoItem.vue`.**

Justo después del nombre del concepto en `components/registro/GastoItem.vue`:

```vue
<template>
  <!-- ... contenido existente ... -->
  <div v-if="etiquetasDeEsteGasto.length" class="mt-1 flex flex-wrap gap-1">
    <span
      v-for="e in etiquetasDeEsteGasto"
      :key="e.id"
      class="px-1.5 py-0.5 rounded-full text-[9px] font-semibold text-white"
      :style="{ backgroundColor: e.color }"
      >#{{ e.nombre }}</span
    >
  </div>
</template>

<script setup>
const { etiquetasDe } = useEtiquetas()
const props = defineProps({ gasto: Object })
const etiquetasDeEsteGasto = computed(() => etiquetasDe('gasto', props.gasto.id))
</script>
```

**B. Filtro por etiqueta en /registro.**

En `composables/useRegistroFilters.js`:

```js
const { items: etiquetas, etiquetasDe } = useEtiquetas()
const etiquetaFiltro = ref(null) // id de etiqueta o null

function aplicaEtiqueta(g) {
  if (!etiquetaFiltro.value) return true
  return etiquetasDe('gasto', g.id).some((e) => e.id === etiquetaFiltro.value)
}

const gastosFiltrados = computed(() =>
  gastosPorDia.value
    .map((d) => ({ ...d, gastos: d.gastos.filter(aplicaEtiqueta) }))
    .filter((d) => d.gastos.length > 0),
)
```

UI: añadir una row de chips antes de la lista en `pages/registro.vue`:

```vue
<div class="flex flex-wrap gap-1 px-4 mb-2">
  <button
    v-for="e in etiquetas"
    :key="e.id"
    @click="etiquetaFiltro = etiquetaFiltro === e.id ? null : e.id"
    class="px-2 py-1 rounded-full text-[10px] font-semibold"
    :class="etiquetaFiltro === e.id ? 'text-white' : 'text-theme-text-muted bg-theme-input'"
    :style="etiquetaFiltro === e.id ? { backgroundColor: e.color } : {}"
  >#{{ e.nombre }}</button>
</div>
```

**C. Columna en exportes.**

En `composables/useExportExcel.js` y `useExportCsv.js`, añadir una
columna "Etiquetas":

```js
const { etiquetasDe } = useEtiquetas()
const filas = gastos.map((g) => ({
  ...filaActual(g),
  etiquetas: etiquetasDe('gasto', g.id)
    .map((e) => `#${e.nombre}`)
    .join(' '),
}))
```

---

## Tabla maestra: qué módulos toca cada integración

| Integración                              | Toca                                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------ |
| Suscripciones → sugerencias planificador | `composables/usePlanificador.js`, `components/planificador/ListaGastosPlaneados.vue` |
| Suscripciones → suma dashboard           | `pages/index.vue`                                                                    |
| Suscripciones → notificación push        | `plugins/prefetch.client.js`, `composables/useNotificacionLocal.js`                  |
| Metas → tracking desde ahorros           | `composables/useAhorros.js`                                                          |
| Metas → tracking desde deudas            | `composables/useDeudas.js`                                                           |
| Metas → tope gasto en /registro          | `pages/registro.vue`, `components/registro/FormGastoManual.vue`                      |
| Metas → card en dashboard                | `pages/index.vue`                                                                    |
| Presupuestos → semáforo en /registro     | `components/registro/FormGastoManual.vue`                                            |
| Presupuestos → badge BottomNav           | `components/layout/BottomNav.vue`                                                    |
| Presupuestos → push al cruzar umbral     | `server/api/gastos/index.post.js`                                                    |
| Calendario → reemplaza CalendarioMensual | `pages/planificador.vue`, `components/planificador/CalendarioMensual.vue`            |
| Calendario → quick-add                   | `components/calendario/CalendarioGlobal.vue`                                         |
| Calendario → sync Google Calendar        | `composables/useGoogleCalendar.js`                                                   |
| Etiquetas → chips en GastoItem           | `components/registro/GastoItem.vue`                                                  |
| Etiquetas → filtro en /registro          | `composables/useRegistroFilters.js`, `pages/registro.vue`                            |
| Etiquetas → exportes                     | `composables/useExportExcel.js`, `composables/useExportCsv.js`                       |

---

## Estrategia de migración localStorage → Postgres

Para cada submódulo, cuando se integre, ejecutar este orden:

1. Crear la migración Drizzle (`npm run db:generate` → revisar SQL).
2. Aplicar a un branch o tenant de staging (`npm run db:push`).
3. Crear los endpoints REST con `apiFetch`.
4. Refactorizar el composable: cambiar `useLocalStorage` por `useResourceCache` +
   `apiFetch`, **manteniendo idénticos los nombres y formas de retorno**
   para no romper las páginas existentes.
5. Añadir un único `onMounted` en la página que llame a un nuevo método
   `migrarLocalStorageABackend()` del composable, que:
   - lee la clave de localStorage,
   - hace POST en lote al endpoint nuevo,
   - en éxito borra la clave de localStorage para no duplicar.
6. Verificar con tests + smoke manual y desplegar.
7. Después de 2-3 semanas (margen de gracia), eliminar
   `migrarLocalStorageABackend()` del composable.

---

## Próximos submódulos candidatos (no implementados)

- **Inversiones / portafolio** — tracker manual de cripto/acciones, valor
  actual vs inicial, rentabilidad. Integra con metas (tipo `inversion`).
- **Centro de notificaciones** — lista unificada de eventos del sistema
  (vencimientos, alertas, recordatorios). Reaprovecha
  `usePushNotifications.js` para canalizarlos.
- **Comparador de períodos** — seleccionar dos meses y ver diff por
  categoría/concepto. Reusa `/api/metricas/historico`.
- **Reglas de auto-categorización** — "si el concepto contiene 'Uber',
  categoría = Transporte". Composable + página simple. Hook en
  `FormGastoManual.vue` antes de guardar.
- **Importador CSV/Excel** — drag-and-drop de archivos del banco,
  mapeo de columnas, vista previa, importación en lote.
- **Compartir gasto con grupo** — extensión del módulo Familia. División
  por porcentaje o monto fijo.
