# Rediseño de la página de inicio del módulo Registro de Gastos

**Fecha:** 2026-04-26
**Módulo:** Registro de Gastos ([pages/registro.vue](../../../pages/registro.vue))
**Tipo:** Rediseño UI / reorganización de componentes existentes (no requiere migración de datos ni cambios de API)

## Contexto y motivación

El header actual del módulo registro presenta tres problemas visibles:

1. **Densidad de información sin jerarquía clara** — el bloque del resumen del mes muestra "Gastado" y "Presupuesto" en horizontal sin destacar el indicador "hoy", que es la métrica de uso diario más relevante.
2. **Captura dispersa** — la cámara y el micrófono viven en una tarjeta del sidebar, mientras que el "agregar manual" está como FAB independiente. No hay una superficie unificada para los tres métodos de registro.
3. **Falta de insight accionable** — no se proyecta el gasto al ritmo actual ni se ofrece una mirada rápida por categoría sin abandonar la vista de inicio (hay que saltar al tab "Categorías").

El usuario aportó un mockup que ataca los tres puntos: tarjeta resumen reorganizada con "Este mes" + "Hoy", barra de progreso con porcentaje, banner de proyección, y desplegable "Por categoría" al pie del resumen. Adicionalmente, los tres métodos de captura quedan agrupados como **tres FABs flotantes**, con el micrófono prominente en el centro.

## Alcance

**Incluye:**
- Rediseño completo de [components/registro/ResumenMesRegistro.vue](../../../components/registro/ResumenMesRegistro.vue) según mockup.
- Nuevo componente `components/registro/FabsCaptura.vue` con tres FABs (foto, micrófono, manual) — solo mobile.
- Ajustes en [pages/registro.vue](../../../pages/registro.vue) para eliminar el FAB único actual y montar el nuevo `FabsCaptura`. El bloque mic+cámara del sidebar **se mantiene** en desktop (sigue oculto en mobile como hoy con `lg:` prefixes).
- Reemplazo de tipografías hardcoded (`text-[10px]`, `text-[9px]`) por tokens basados en `rem` en los componentes tocados, para compatibilidad con el modo "Texto grande" (`useTheme.fontSize` modifica `document.documentElement.style.fontSize`).

**No incluye:**
- Cambios en la API o el esquema de datos. El campo `resumen.totalDia` ya existe en [server/api/gastos/resumen.get.js](../../../server/api/gastos/resumen.get.js).
- Cambios en el tab "Categorías" del área principal (mantiene chart + drilldown completo).
- Cambios en la lógica de captura por voz/foto (composables `useVoiceDraft`, `usePhotoDraft`).
- Cambios en otros módulos (planificador, deudas).

## Diseño

### Componente 1 — `ResumenMesRegistro.vue` (rediseño)

**Estructura visual (de arriba hacia abajo):**

1. **Fila superior con dos sub-tarjetas:**
   - **Izquierda — "ESTE MES"**
     - Label uppercase "ESTE MES" (`text-xs text-theme-text-sec uppercase tracking-wider`).
     - Monto grande (`text-3xl font-bold`) con `text-gradient-blue` o `text-theme-accent`.
     - Subtítulo: si presupuesto > 0, muestra "S/ X restante" (verde si saldo ≥ 0, rojo si excedido). Si no hay presupuesto, muestra "sin presupuesto".
   - **Derecha — "HOY"**
     - Label uppercase "HOY".
     - Monto del día grande (`text-3xl font-bold text-theme-text`).
     - Subtítulo: "N gastos" (cuenta de gastos cuya `fecha === hoy` desde `gastosMensuales`).
   - Layout: `grid grid-cols-2 gap-3`. Cada tarjeta con `rounded-xl bg-theme-card-elevated/40 px-3 py-3`.

2. **Botón kebab (⋮)** flotante en la esquina superior derecha del componente: abre un mini-menú con la acción "Editar presupuesto" (que dispara el mismo modo de edición inline actual). Esto saca el control de edición del flujo principal sin perder funcionalidad.

3. **Barra de progreso** (solo si presupuesto > 0):
   - Fila de label: "Presupuesto S/ X" (izq, `text-xs text-theme-text-sec`) — "75% usado" (der, `text-xs font-semibold` con color según umbral).
   - Barra `h-2 rounded-full bg-theme-input` con relleno gradiente verde/ámbar/rojo según `porcentaje > 70 / > 90`.

4. **Banner de proyección** (solo si presupuesto > 0 **y** `esMesActual`):
   - Calculado: `proyeccion = totalMes / diasTranscurridos * diasDelMes`.
   - Caja `rounded-xl border border-theme-accent/30 bg-theme-accent-bg/40 px-3 py-2.5` con icono pequeño tipo "trending-up".
   - Texto línea 1: `"A este ritmo gastarás S/ X este mes."`
   - Texto línea 2 (condicional): si `proyeccion > presupuesto`: `"Excederías el presupuesto."` en `text-red-400 font-semibold`. Si `proyeccion < presupuesto * 0.85`: `"Vas bien."` en `text-emerald-400`. Caso intermedio: omitir línea 2.
   - Si el día actual es el primero del mes (denominador = 1) o no hay gastos, ocultar el banner para evitar proyecciones engañosas.

5. **Sección "POR CATEGORÍA" colapsable** al pie:
   - Header clickeable: label uppercase "POR CATEGORÍA" + icono chevron que rota.
   - Contenido (cuando expandido): lista de hasta 5 categorías top desde `gastosPorCategoria` (más un "Otros" agregado si hay > 5):
     - Por fila: icono pequeño, nombre, mini-barra horizontal del color de la categoría (ancho proporcional al porcentaje), monto a la derecha (`tabular-nums`).
   - Estado por defecto: cerrado.
   - Persistencia: `localStorage` con clave `registro:resumen:categorias-expanded` (booleano global, no por usuario — el usuario es uno solo en el cliente).
   - Animación: usa la transición `expand` ya definida en [pages/registro.vue:683-694](../../../pages/registro.vue#L683-L694) o equivalente local.

**Props del componente (cambios):**
- Añadir `gastos-hoy-count: Number` (cantidad de gastos del día actual).
- Añadir `categorias-resumen: Array` (mismo shape que `gastosPorCategoria`).
- Añadir `es-mes-actual: Boolean` (para condicionar el banner de proyección).
- Añadir `dias-transcurridos: Number`, `dias-del-mes: Number` (cálculo de proyección hecho fuera del componente para mantenerlo presentacional).
- Mantener: `totalMes`, `presupuesto`, `presupuestoDefault`, evento `update:presupuesto`.

**Por qué pasar la proyección como datos crudos en lugar del valor calculado:** permite formatear con `useCurrency` dentro del componente y mantiene el cálculo testeable junto al composable.

### Componente 2 — `FabsCaptura.vue` (nuevo, solo mobile)

**Ubicación:** `components/registro/FabsCaptura.vue`.

**Estructura visual:**

- Contenedor `fixed bottom-24 right-4 z-40 lg:hidden` (mismo `bottom` que el FAB actual para no chocar con el bottom-nav).
- Layout: `flex items-end gap-3` — fila horizontal con los tres FABs en línea de base alineada al botón grande del centro.
- **FAB Foto (izq):** 48px círculo, gradiente ámbar (mismo del actual `BotonCamara`), icono cámara. `active:scale-90`.
- **FAB Micrófono (centro):** 64px círculo, gradiente acento (`from-[var(--color-accent)] to-indigo-600`), icono mic. **Resaltado:** sombra más grande (`shadow-xl shadow-[var(--color-accent)]/40`), anillo pulsante cuando `isListening` (reutilizar la animación `ping-slow` ya definida en [BotonMicrofono.vue:151-168](../../../components/registro/BotonMicrofono.vue#L151)). Cuando escucha: rojo y icono "stop".
- **FAB Manual (der):** 48px círculo, fondo `bg-theme-card border border-theme-border` con icono `+` en color acento. `active:scale-90`.

**Comportamiento:**
- Foto: emite `photo` → la página dispara la cámara (delegando al composable `usePhotoDraft` ya conectado).
- Mic: emite `voice-toggle` → si `isListening`, llama `onStopListening`, si no `onStartListening`.
- Manual: emite `manual` → la página abre `showFormManual = true`.
- Oculto cuando `seleccionMultipleActiva` (igual que el FAB actual).
- Si hay `hasDraft` (borrador de voz pendiente), mostrar un punto ámbar pequeño en la esquina superior del FAB de mic.

**Props:**
- `is-listening: Boolean`
- `has-draft: Boolean`
- `is-supported: Boolean` (deshabilitar mic si voz no soportada)

**Eventos:** `voice-toggle`, `photo`, `manual`.

**Por qué un componente nuevo en lugar de modificar `BotonMicrofono`:** `BotonMicrofono` actual tiene status text + onda + transcript inline diseñado para vivir dentro de la tarjeta del sidebar. Mezclar esa funcionalidad con un FAB compacto resulta en un componente con dos modos visuales muy distintos. Mejor mantener el original para el sidebar de desktop y crear `FabsCaptura` enfocado en mobile.

### Cambios en `pages/registro.vue`

1. **Reemplazar el FAB único** ([pages/registro.vue:251-261](../../../pages/registro.vue#L251-L261)) por `<RegistroFabsCaptura>` con los tres handlers conectados a los métodos existentes: `onStartListening`, `onStopListening`, `onPhotoCapture` (vía `BotonCamara` indirecto — ver siguiente punto), `showFormManual = true`.

2. **Foto desde el FAB:** dado que la captura de foto vive en `BotonCamara.vue` (con `getUserMedia`, overlay de cámara, etc.), la opción más limpia es:
   - Refactor mínimo: extraer la lógica de "abrir cámara" de `BotonCamara` a un composable `useCameraCapture()` reutilizable, o
   - Alternativa más simple: mantener `BotonCamara` montado siempre (incluso en mobile, oculto visualmente con `sr-only`) y exponer un método `openCamera()` vía `defineExpose` que el FAB invoca por `ref`.
   - **Decisión:** la segunda opción. Menos archivos tocados, mantiene la lógica de cámara en un solo sitio y respeta el principio "no abstraer prematuramente".

3. **Sidebar desktop sin cambios estructurales** — el bloque mic+cámara grande sigue visible en `lg:` y arriba. Solo se ajustarán las clases de tipografía hardcoded para que respeten el modo "Texto grande".

4. **Botón "Agregar gasto manual" del sidebar desktop** ([pages/registro.vue:85-95](../../../pages/registro.vue#L85-L95)) se **mantiene** sin cambios. El FAB es solo mobile; en desktop el botón del sidebar sigue siendo el único acceso al formulario manual.

5. Cálculos a inyectar en el resumen:
   ```js
   const hoy = useFechaPeru().fechaHoy()
   const gastosHoyCount = computed(() =>
     gastosMensuales.value.filter(g => g.fecha === hoy).length
   )
   const totalDia = computed(() => parseFloat(resumen.value.totalDia) || 0)
   const diasTranscurridos = computed(() => {
     if (!esMesActual.value) return 0
     return new Date().getDate()
   })
   const diasDelMes = computed(() =>
     new Date(anioSeleccionado.value, mesSeleccionado.value, 0).getDate()
   )
   ```

### Compatibilidad con temas y modo "Texto grande"

- Reemplazos en `ResumenMesRegistro.vue`:
  - `text-[10px]` → `text-xs` (0.75rem)
  - `text-[9px]` → `text-[0.65rem]` o `text-xs`
  - Conservar tamaños relativos (`text-2xl`, `text-3xl`) — escalan automáticamente vía `rem` cuando `useTheme.setFontSize` modifica el `font-size` del `<html>`.
- Todos los colores vía tokens (`text-theme-text`, `bg-theme-card`, `border-theme-border`, `text-theme-accent`, `bg-theme-accent-bg`).
- Verificar visualmente en los dos temas (claro/oscuro) y los dos tamaños de letra (normal/grande) antes de marcar el trabajo como completo.

## Consideraciones técnicas

### Estado del colapsable de categorías
Persistencia en `localStorage` (clave `registro:resumen-categorias-expanded`). Inicializa cerrado si la clave no existe. Si más adelante se requiere persistencia por usuario, migrar a la tabla `configuraciones`.

### Conteo de "gastos hoy" en optimistic UI
`pushOptimisticGastos` ya inserta gastos temporales en `gastosMensuales` con `fecha = hoy` por defecto. El `filter(g => g.fecha === hoy).length` los cuenta correctamente. No requiere lógica especial.

### Proyección con poco data
- Si `diasTranscurridos === 0` o no hay gastos → ocultar banner.
- Si `diasTranscurridos < 3` → mostrar banner pero con una nota "(estimación con pocos días)" en menor tamaño, para no transmitir falsa precisión. **Decisión:** omitir esta nota en v1; el banner solo aparece cuando hay gastos, y eso ya implica que el usuario está en algún día > 1.

### Performance
- `gastosPorCategoria` ya es `computed` reactivo. Pasar al resumen no añade carga.
- El colapsable solo renderiza la lista cuando está expandido (`v-if`), no `v-show`.

## Estructura de archivos resultante

```
components/registro/
├── ResumenMesRegistro.vue       (modificado — rediseño completo)
├── FabsCaptura.vue              (nuevo — solo mobile)
├── BotonMicrofono.vue           (sin cambios — sigue usado en sidebar desktop)
├── BotonCamara.vue              (cambio mínimo: defineExpose openCamera)
└── ... (resto sin cambios)

pages/
└── registro.vue                 (modificado — montar FabsCaptura, props nuevos al resumen)
```

## Plan de verificación manual

Antes de marcar como completo:

1. **Mobile (360-412px):**
   - [ ] Resumen muestra "Este mes" y "Hoy" lado a lado, legible.
   - [ ] Tres FABs visibles, mic destacado, separados sin chocar con bottom-nav.
   - [ ] Banner de proyección aparece en mes actual cuando hay gastos y presupuesto.
   - [ ] Colapsable categorías abre/cierra suave, persiste estado al recargar.
   - [ ] FAB foto abre cámara, mic graba, manual abre formulario.
   - [ ] Selección múltiple oculta los tres FABs.
2. **Desktop (≥1024px):**
   - [ ] Sidebar mantiene mic grande + cámara + botón manual como hoy.
   - [ ] Resumen rediseñado se ve bien en el sidebar (380px de ancho).
   - [ ] FABs mobile están ocultos.
3. **Temas:**
   - [ ] Tema claro: contraste suficiente en banner de proyección y mini-barras de categorías.
   - [ ] Tema oscuro: idem.
4. **Tamaño de letra "Grande":**
   - [ ] Resumen no se rompe; los montos siguen alineados.
   - [ ] FABs no se deforman (los tamaños siguen en `px` por intención: son botones físicos).
   - [ ] Labels y textos secundarios escalan correctamente.
