# Diseño — Correcciones al Planificador mensual

**Fecha**: 2026-04-23
**Módulo afectado**: Planificador mensual ([pages/planificador.vue](../../../pages/planificador.vue))

## Contexto

El usuario reportó tres problemas en el planificador mensual:

1. La función "Copiar mes" no funciona correctamente una vez abierto el modal selector.
2. Las barras de progreso del resumen del mes no comunican qué representa cada una.
3. Los detalles de gastos planificados en las vistas Calendario y Gráfico son de solo lectura — no permiten mantenimiento (editar, registrar pago, eliminar) sin volver a la vista Lista.

Comportamiento esperado al copiar: el detalle planificado del mes origen se traslada al mes destino, y **todos los gastos copiados quedan en estado `pendiente`** (independientemente del estado en el mes origen).

---

## Issue 1 — Arreglar "Copiar mes"

### Comportamiento observado

- El botón "Copiar mes" dentro del colapsable "Ver más" abre el modal correctamente.
- Dentro del modal, al presionar "Copiar": la operación falla silenciosamente o muestra un mensaje genérico que hace parecer que "no pasa nada".

### Causas identificadas

**Backend** — [server/api/planificador/duplicar.post.js](../../../server/api/planificador/duplicar.post.js):

- Línea 58: `parseInt(g.fechaProbablePago.split('-')[2])` lanza `TypeError` si algún gasto planificado del mes origen tiene `fechaProbablePago = null`. La transacción aborta.
- Línea 45: `obtenerOCrearPlan(usuarioId, ...)` usa el cliente global `db`, mientras el resto del bloque usa el cliente de transacción `tx`. Inconsistencia que puede producir plan creado pero gastos no insertados si la transacción falla después.
- El error que sube al cliente puede quedar enmascarado (`e.message` críptico tipo "Cannot read property 'split' of null").

**Frontend** — [components/planificador/ResumenMes.vue](../../../components/planificador/ResumenMes.vue):

- `origenMes` y `origenAnio` se inicializan una sola vez al montar el componente (líneas 302-303). Si el usuario navega entre meses y reabre el modal, los valores por defecto quedan desfasados.
- En `ejecutarDuplicar` (líneas 305-317), si `e?.data?.message` es `undefined`, el toast cae al genérico `"Error al copiar el mes"` sin detalle real — se percibe como "no pasa nada".

### Decisiones de diseño

- El botón "Copiar mes" se mantiene dentro del colapsable "Ver más" (preferencia del usuario).
- Corrección puramente defensiva: no cambia la semántica de la operación.

### Cambios

**Backend** ([server/api/planificador/duplicar.post.js](../../../server/api/planificador/duplicar.post.js)):

1. Filtrar o manejar gastos origen sin `fechaProbablePago`:
   - Si `fechaProbablePago` es `null`, conservarlo como `null` en el destino (no forzar una fecha inventada).
   - Si tiene valor, ajustar el día con la lógica actual (`Math.min(diaOriginal, diasDestino)`).
2. Pasar `tx` al helper `obtenerOCrearPlan` para consistencia transaccional. Esto requiere agregar un parámetro opcional `dbClient` a la firma de `obtenerOCrearPlan` en [server/utils/recurrente.js](../../../server/utils/recurrente.js), defaulting a `db`.
3. Envolver errores inesperados en `createError` con `statusCode: 500` y un `message` descriptivo, para que el cliente reciba siempre un mensaje accionable.

**Frontend** ([components/planificador/ResumenMes.vue](../../../components/planificador/ResumenMes.vue)):

1. Resetear `origenMes` y `origenAnio` al abrir el modal (en el handler de `showSelectorMes = true`), no solo en el mount. Usar `mesActual.value` / `anioActual.value` actuales.
2. En el `catch` de `ejecutarDuplicar`, construir el mensaje consultando en orden: `e?.data?.message` → `e?.statusMessage` → `e?.message` → fallback genérico. Así el usuario siempre ve el detalle real del fallo.

### Validación

- Escenario 1: mes origen con un gasto sin fecha — debe copiar todos y dejar ese gasto sin fecha (no crashear).
- Escenario 2: mes destino sin plan previo — debe crear el plan e insertar los gastos.
- Escenario 3: mes origen inexistente o vacío — mensaje claro en el toast (ya implementado, se preserva).
- Escenario 4: usuario navega a otro mes y reabre modal — el select muestra el mes inmediatamente anterior al mes visible actual.

---

## Issue 2 — Etiquetar las barras de progreso en ResumenMes

### Comportamiento observado

En [ResumenMes.vue](../../../components/planificador/ResumenMes.vue) líneas 141-156, dentro del colapsable "Ver más", hay dos barras de progreso apiladas:

- **Barra superior**: ancho proporcional a `resumen.porcentajeAsignado` (planificado / presupuesto), con gradiente accent/orange.
- **Barra inferior**: ancho proporcional a `resumen.porcentajeGastadoReal` (gastado real / presupuesto), con gradiente emerald/red.

Ninguna barra tiene etiqueta. El lector no sabe qué representa cada una.

### Cambios

1. Anteponer a cada barra un micro-label (`text-[10px]` o `text-[11px]`, `text-theme-text-sec`) con el nombre y el porcentaje al final, en una fila ligera:
   - Barra superior: `Planificado` ·······  `{{ porcentajeAsignado.toFixed(0) }}%`
   - Barra inferior: `Gastado real` ······· `{{ porcentajeGastadoReal.toFixed(0) }}%`
2. Mantener los colores actuales (no cambia el diseño visual, solo agrega contexto textual).
3. Mobile-first: las etiquetas ocupan su propia línea arriba de cada barra — no comprometen el ancho en pantallas chicas.

### Validación

- Las dos barras muestran su etiqueta y porcentaje correctamente.
- Los colores (rojo al exceder presupuesto) se mantienen.
- Legible en 360px de ancho.

---

## Issue 3 — Mantenimiento de gastos desde Calendario y Gráfico

### Comportamiento observado

- **Calendario** ([CalendarioMensual.vue](../../../components/planificador/CalendarioMensual.vue) líneas 50-94): al seleccionar un día, aparece un panel con los gastos de ese día mostrando solo `concepto`, `categoría`, `estado` (badge) y `monto`. Sin botones de acción.
- **Gráfico** ([GraficoCategoria.vue](../../../components/planificador/GraficoCategoria.vue) líneas 90-117): al activar un segmento, el tooltip muestra totales de la categoría, pero no lista los gastos individuales. Nunca se ven gastos concretos desde esta vista.

### Decisiones de diseño

- Las acciones disponibles deben ser las mismas que en la vista Lista: **editar**, **registrar pago** (solo si `estado === 'pendiente'`), **eliminar** (soft delete con undo ya soportado por el composable).
- Los componentes hijos (`CalendarioMensual` y `GraficoCategoria`) emitirán eventos `editar` y `registrar` hacia el padre ([pages/planificador.vue](../../../pages/planificador.vue)), reutilizando los handlers existentes `editarGastoPlaneado` y `abrirRegistroPago`.
- La acción "toggle estado" y "eliminar" pueden resolverse internamente usando el composable `usePlanificador()` (ya disponible en ambos componentes).
- **Sin duplicar código**: extraer un componente compartido `GastoItemPlanificado.vue` (o reutilizar el item interno de `ListaGastosPlaneados.vue`) para uniformar la UI del ítem a través de las tres vistas. Se evalúa en la fase de plan si conviene extraerlo o usar markup inline consistente.

### Cambios

**[CalendarioMensual.vue](../../../components/planificador/CalendarioMensual.vue)**:

1. Reemplazar el markup de cada gasto en el panel del día (líneas 73-92) por una fila con las acciones (editar, registrar pago, eliminar).
2. Agregar `defineEmits(['editar', 'registrar'])` y emitir al hacer click en las acciones correspondientes.
3. Para eliminar y toggle: usar `softDeleteGastoPlaneado` y `toggleEstado` del composable directamente.
4. Mantener la UX de selección de día y la estética del panel.

**[GraficoCategoria.vue](../../../components/planificador/GraficoCategoria.vue)**:

1. Cuando `segmentoActivo !== null`, debajo del tooltip existente, renderizar la lista de gastos de esa categoría usando `gastosPorCategoria[segmentoActivo].gastos` (ya expuesto por el composable).
2. Cada ítem muestra concepto, fecha, estado, monto, y las mismas acciones (editar, registrar, eliminar).
3. Agregar `defineEmits(['editar', 'registrar'])` y emitir.

**[pages/planificador.vue](../../../pages/planificador.vue)**:

1. Conectar los emits de las dos vistas a los handlers existentes:
   - `<PlanificadorCalendarioMensual @editar="editarGastoPlaneado" @registrar="abrirRegistroPago" />`
   - `<PlanificadorGraficoCategoria @editar="editarGastoPlaneado" @registrar="abrirRegistroPago" />`

### Validación

- Desde el calendario, seleccionar un día con gastos y ejecutar cada acción (editar abre el form prellenado, registrar pago abre el form de pago, eliminar remueve con undo).
- Desde el gráfico, activar un segmento con gastos, ver la lista y ejecutar las mismas acciones.
- Las tres vistas (Lista, Calendario, Gráfico) se sienten consistentes en términos de acciones disponibles.

---

## Orden de implementación recomendado

1. **Issue 1** (backend + modal copiar mes) — más crítico porque impacta un flujo esencial.
2. **Issue 2** (etiquetas de barras) — cambio muy acotado, alta relación valor/esfuerzo.
3. **Issue 3** (acciones en Calendario y Gráfico) — requiere decisión sobre extracción de componente compartido durante el plan.

## Fuera de alcance

- Rediseño general del resumen mensual.
- Cambios en la lógica de recurrencia.
- Cambios en la vista Lista de gastos planificados.
- Gastos futuros (sistema independiente, sección distinta del planificador).
