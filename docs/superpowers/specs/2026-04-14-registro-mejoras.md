---
fecha: 2026-04-14
modulo: registro
estado: aplicado (A + C + E alto impacto) / backlog documentado
---

# Mejoras al módulo Registro de Gastos

## Resumen

Auditoría y mejora del módulo de registro. Tres fases:

- **A** — UX / pulido visual (aplicado)
- **C** — Arquitectura / performance (aplicado)
- **E** — Funcionalidad nueva (alto impacto aplicado; medio/bajo en backlog)

---

## Fase A — UX / pulido (aplicado)

1. **Densidad superior reducida** — Filtros unificados en una barra colapsable con badge de conteo. Búsqueda siempre visible. Rangos rápidos y filtro por categoría escondidos tras botón "Filtros".
2. **Rangos coherentes con mes visible** — Los botones "Hoy" y "7 días" sólo se muestran cuando el usuario está en el mes actual. Al salir del mes actual, el rango se resetea a "Mes".
3. **Expandir primer día con gastos** — Si "hoy" no existe en el mes visible, se expande el primer día con gastos en vez de dejar todo cerrado. Aplica también a la semana.
4. **Empty state accionable** — Botones directos 🎤 Dictar · ✏️ Manual en el estado vacío de `HistorialDiario`.
5. **ConfirmDialog unificado** — Eliminación usa `SharedConfirmDialog` en vez de modal custom. Menos código, consistencia, soporte de Escape/focus trap.
6. **FAB no tapa último gasto** — `pb-28` en el contenedor de la lista móvil.
7. **Cola de toasts** — Toast de éxito se desplaza a `bottom-40` cuando hay undo-toast visible.
8. **Haptics consistentes** — `vibrate()` añadido a: toggle vista semana/día, tap en día/semana, cambio de tab, cambio de rango, toggle filtros, delete, undo, duplicar, quick-add.
9. **Skeleton fiel** — Loading de `HistorialDiario` ahora reproduce la estructura real (header de día + items indentados).
10. **Tabs sticky** — La fila de tabs (Historial/Categorías/Comparar + Excel) es sticky en móvil para mantener contexto al hacer scroll.

## Fase C — Arquitectura / performance (aplicado)

`pages/registro.vue` pasó de 680 → ~420 líneas. Lógica extraída a:

- **`composables/useRegistroFilters.js`** — búsqueda (debounced), categoría, rango, `gastosPor{Dia,Semana}Filtrados`, conteo de filtros activos, limpieza.
- **`composables/useGastoDelete.js`** — estado de eliminación + undo con timers (con cleanup en unmount, antes se filtraban).
- **`composables/useOptimisticGastos.js`** — mapeo a IDs, push/rollback optimistas.
- **`composables/usePresupuestoMes.js`** — fetch/update con `AbortController` para evitar race conditions al cambiar de mes rápido.
- **`composables/useRegistroExport.js`** — export a Excel.
- **`composables/useDebounceFn.js`** — utilidad `useDebouncedRef` genérica.

Adicionales:

- **Lazy load** de vistas pesadas (`StatsComparativas`, `GraficoCategoria`) y modales (`ConfirmacionVoz`, `FormGastoManual`) con `defineAsyncComponent` + `Suspense`. Antes se montaban aunque nunca se tocaran.
- **Debounce 150ms** en `busquedaGasto` (vía `useDebouncedRef`) para no recomputar los 2 computeds grandes en cada tecla.
- **Memoización de `statsDia()`** en `HistorialDiario` con caché `Map<fecha|len|total, stats>` + eviction a >200 entradas.
- **Cleanup de timers de undo** movido al composable con `onUnmounted`.
- **Cancelación de fetches previos** al cambiar de mes rápido (ya existía en `fetchGastosMensuales`, añadido a `fetchPresupuesto`).

## Fase E — Funcionalidad nueva

### Aplicado (alto impacto)

- **E#1 Quick-add / favoritos** (`composables/useGastoFavoritos.js` + `components/registro/QuickAddChips.vue`):
  - Persistencia local en `localStorage` con clave `registro-gastos-favoritos-v1`.
  - Registro automático en cada confirmación (voz, foto, manual, quick-add, duplicar).
  - Top 5 chips con mínimo 2 apariciones, ordenados por frecuencia + recencia.
  - Tap = registro directo con fecha de hoy, mismo flujo optimistic.
- **E#2 Duplicar gasto** — acción en `GastoItem` que crea un gasto idéntico con fecha de hoy. Disparable desde botón o swipe derecha → editar (ver E#3).
- **E#3 Swipe actions** en `GastoItem`:
  - Swipe izq (>70px) → eliminar
  - Swipe der (>70px) → editar
  - Detección de scroll vertical para no bloquear navegación.
  - Indicadores visuales con opacidad progresiva.
- **E#6 Insights automáticos** en `StatsComparativas` (vista Comparar):
  - "Gastaste N% más/menos que en [mes]"
  - "[Categoría] subió N% este mes"
  - "Promedio diario: S/X en N días con registros"
  - Máx 3 insights, con tono positivo/negativo/neutro.

### Backlog (no aplicado)

| # | Item | Razón de no aplicar ahora |
|---|------|---------------------------|
| E#4 | Presupuesto por categoría (soft limits) | Requiere cambio de esquema en `categorias` o tabla nueva `presupuestos_categoria`. Necesita diseño de migración + UI en Configuraciones. |
| E#5 | Búsqueda global multi-mes | Requiere nuevo endpoint `/api/gastos/buscar`. Útil pero tiene fricción — sólo cuando búsqueda local da 0 resultados. |
| E#7 | Vincular gasto a planificado/deuda post-registro | Complejo UX; requiere selector + validación de no-vínculo-doble. |
| E#8 | Recordatorio diario PWA | Requiere Notifications API + permisos + backend de scheduling. |
| E#9 | Modo privado por gasto | Sólo útil cuando exista cuentas compartidas; prematuro. |
| E#10 | Bulk delete | Complejidad UX (modo selección múltiple); uso poco frecuente. |
| E#11 | Tags libres | Duplica parcialmente el rol de `categoria`; decidir primero el modelo. |

---

## Archivos creados

- `composables/useDebounceFn.js`
- `composables/useRegistroFilters.js`
- `composables/useGastoDelete.js`
- `composables/useOptimisticGastos.js`
- `composables/usePresupuestoMes.js`
- `composables/useRegistroExport.js`
- `composables/useGastoFavoritos.js`
- `components/registro/QuickAddChips.vue`

## Archivos modificados

- `pages/registro.vue` — refactor completo + integración de UX y features
- `components/registro/HistorialDiario.vue` — empty state, skeleton, expand-first-day, statsDia memoizado, haptics, emit duplicate/request-voice/request-manual
- `components/registro/GastoItem.vue` — swipe actions, botón duplicar, emit duplicate
- `components/registro/StatsComparativas.vue` — panel de insights automáticos

## Validación pendiente

- [ ] Arrancar dev server, validar quick-add en móvil real
- [ ] Validar swipe no interfiere con scroll vertical
- [ ] Validar que `Suspense` fallback no parpadea al cambiar tabs
- [ ] Validar que `useDebouncedRef` no deja timers colgados al cambiar de mes
