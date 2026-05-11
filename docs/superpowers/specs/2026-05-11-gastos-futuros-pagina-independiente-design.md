# Gastos Futuros — Página Independiente

**Fecha:** 2026-05-11
**Tipo:** Refactor + rediseño de UX (frontend-only)

## Contexto

Hoy "Gastos futuros" vive como una sub-sección dentro de [pages/planificador.vue](../../../pages/planificador.vue), controlada por el query param `?seccion=futuros`. Sus componentes (`ListaGastosFuturos`, `ResumenGastosFuturos`, `FormGastoFuturo`) están mezclados con los del planificador mensual en [components/planificador/](../../../components/planificador/), y su estado/funciones viven dentro del composable `usePlanificador.js`.

El objetivo es que "Gastos futuros" se sienta como un apartado distinto y como una página independiente, alineado con cómo ya funciona `/ahorros`.

## Objetivos

- Página con ruta propia (`/futuros`).
- Código separado del módulo planificador mensual.
- Identidad visual propia (acento violeta).
- Composable propio (`useGastosFuturos`).
- Entradas de navegación actualizadas (sub-tab del planificador, side nav, mobile drawer).
- Sin cambios en la base de datos ni en la estructura de endpoints (excepto un nuevo endpoint de lectura).

## No-objetivos

- No se cambia el esquema de DB.
- No se renombran los endpoints existentes bajo `/api/planificador/futuros/*`.
- No se cambian los flujos de `gastos_futuros_detalles` ni opciones.
- No se modifica la variable global `theme-accent`; el violeta es local del módulo.
- No se agrega "Futuros" a la bottom nav móvil.

---

## 1. Ruta y página

- Nueva ruta: `/futuros`.
- Nueva página: [pages/futuros.vue](../../../pages/futuros.vue). Contiene:
  - Header propio con título "Gastos Futuros" y subtítulo "Deseos y decisiones pendientes".
  - Resumen (`<FuturosResumen />`).
  - Lista (`<FuturosLista />`).
  - FAB violeta para crear.
  - Form modal (`<FuturosForm />`) para crear/editar.
  - Pull-to-refresh propio enganchado a `fetchGastosFuturos()`.
- Usa el **layout `default`** (no el de planificador), para que no aparezca el sub-nav Mensual/Futuros/Ahorros — esto refuerza la sensación de "página aparte".
- `pages/planificador.vue` queda limpio: se elimina el switch `seccionActual`, el watcher de `route.query.seccion`, el FAB condicional, el form de futuros, la rama de render `v-else` con `<PlanificadorListaGastosFuturos>` y `editarGastoFuturo`. Pasa a ser solo "planificador mensual".

## 2. Componentes (reubicación + renombrado)

Mover de `components/planificador/` a `components/futuros/`, renombrando para auto-import limpio:

| Antes | Después | Auto-import |
|---|---|---|
| `planificador/ListaGastosFuturos.vue` | `futuros/Lista.vue` | `<FuturosLista />` |
| `planificador/ResumenGastosFuturos.vue` | `futuros/Resumen.vue` | `<FuturosResumen />` |
| `planificador/FormGastoFuturo.vue` | `futuros/Form.vue` | `<FuturosForm />` |

Dentro de cada componente movido:
- Reemplazar referencias internas a `usePlanificador()` por `useGastosFuturos()`.
- Reemplazar accesos a `gastosFuturos`, `resumenFuturos`, `createGastoFuturo`, `updateGastoFuturo`, `deleteGastoFuturo`, `decidirOpcionFutura` por los del nuevo composable.
- Sustituir clases de color del acento principal (`theme-accent`, `theme-accent-bg`, `theme-on-accent`) por las equivalentes en **violeta** (`violet-500`, `violet-600`, `bg-violet-500/10`, `text-violet-500`, `text-white` para texto sobre violeta, etc.) en los puntos donde el color comunica identidad del módulo (encabezados de tarjetas, botones primarios, badges activos, indicadores de selección).
- No tocar colores que comunican otros significados (verde de "decidido", rojo de "eliminar", etc.).

## 3. Composable — `useGastosFuturos`

Crear `composables/useGastosFuturos.js` con:

**Estado** (`useState` para compartirlo entre componentes):
- `gastosFuturos` — array.
- `resumenFuturos` — objeto con la forma actual (`totalProyectos`, `totalDetalles`, `totalOpciones`, `proyectosConReferencia`, `totalMinimo`, `totalMaximo`, `totalPromedio`, `promedioPorProyecto`, `destacados`).
- `isLoading`, `error`.

**Funciones:**
- `fetchGastosFuturos()` — llama al nuevo `GET /api/futuros` (ver Sección 4) y rellena `gastosFuturos` + `resumenFuturos`.
- `createGastoFuturo(data)`, `updateGastoFuturo(id, data)`, `deleteGastoFuturo(id)`, `decidirOpcionFutura(proyectoId, detalleId, payload)` — mismas firmas y endpoints que hoy (`/api/planificador/futuros/*`). Tras cada mutación, refrescan llamando a `fetchGastosFuturos()`.

**Limpieza en `usePlanificador.js`:**
- Eliminar de `usePlanificador.js`:
  - Estado: `gastosFuturos`, `resumenFuturos`.
  - Funciones: `createGastoFuturo`, `updateGastoFuturo`, `deleteGastoFuturo`, `decidirOpcionFutura`.
  - Asignaciones de `gastosFuturos.value` y `resumenFuturos.value` dentro de `fetchPlan` (líneas 183-194).
  - Las exposiciones correspondientes en el `return`.
- Verificar con grep que ningún otro consumidor en el repo accede a esos campos desde `usePlanificador()`. Si alguno lo hace, migrarlo a `useGastosFuturos()`.

## 4. Backend (API)

**Cambio mínimo invasivo.** Los endpoints existentes bajo `/api/planificador/futuros/*` se conservan tal cual:
- `POST /api/planificador/futuros` — crear.
- `PUT /api/planificador/futuros/[id]` — actualizar.
- `DELETE /api/planificador/futuros/[id]` — eliminar.
- `POST /api/planificador/futuros/[id]/detalles/[detalleId]/decidir` — decidir opción.

**Nuevo endpoint:**
- `GET /api/futuros` — devuelve `{ gastosFuturos, resumenFuturos }` con la misma forma que hoy retorna `/api/planificador` para esos dos campos. Reusa la misma lógica de consulta y agregación.

**`GET /api/planificador`:**
- Mantener por ahora `gastosFuturos` y `resumenFuturos` en la respuesta (compat de transición). Si después de la migración del frontend nada los consume desde ese endpoint, se eliminan en un commit posterior — fuera de scope de este plan.

## 5. Identidad visual (violeta)

- **Color de acento local:** Tailwind `violet-500` / `violet-600` / `violet-400` aplicado directamente en clases. No se modifican las variables CSS globales de `theme-accent`.
- **Header:** título "Gastos Futuros", subtítulo "Deseos y decisiones pendientes", icono sparkles (mismo de la nav drawer).
- **FAB:** fondo violeta (`bg-violet-500`), texto blanco, sombra `shadow-violet-500/25`.
- **Sub-tab "Futuros" en el sub-nav del planificador:** estilo violeta en reposo (`text-violet-400 hover:bg-violet-500/10`), paralelo a cómo Ahorros se muestra en emerald. No tiene estado "activo" porque navegar ahí cambia el layout, igual que pasa con Ahorros hoy.
- **Layout:** `default`, sin sub-nav heredado del planificador.

## 6. Navegación

- **[layouts/planificador.vue](../../../layouts/planificador.vue):** el sub-tab "Futuros" (líneas 27–37) cambia su `to` de `/planificador?seccion=futuros` a `/futuros`, y su estilo en reposo pasa a violeta. La rama de `activeTab === 'futuros'` se elimina del `computed` ya que `/futuros` usa layout `default` y nunca activa este layout. El sub-tab solo aparece en `/planificador` y `/ahorros`.
- **[components/layout/SideNav.vue:159](../../../components/layout/SideNav.vue#L159):** cambiar `to: '/planificador?seccion=futuros'` a `to: '/futuros'`. Mantener icono y label.
- **[components/layout/MobileDrawer.vue:266](../../../components/layout/MobileDrawer.vue#L266):** mismo cambio.
- **Bottom nav móvil:** sin cambios.
- **Redirect de URLs antiguas:** middleware o lógica dentro de `pages/planificador.vue` que detecte `route.query.seccion === 'futuros'` y haga `navigateTo('/futuros', { replace: true })`. Esto cubre bookmarks, PWAs instaladas y enlaces guardados.

## 7. Estrategia de pruebas manuales

Al terminar la implementación, verificar (mobile y desktop):

1. Navegar a `/futuros` directamente — carga la lista, resumen y FAB con identidad violeta.
2. Desde side nav (desktop) — el ítem "Gastos futuros" lleva a `/futuros`.
3. Desde mobile drawer — el ítem "Gastos futuros" lleva a `/futuros`.
4. Desde `/planificador` → sub-tab "Futuros" → lleva a `/futuros`.
5. `/planificador?seccion=futuros` (URL vieja) → redirige a `/futuros`.
6. Crear, editar, eliminar un gasto futuro — refresca lista.
7. Decidir una opción de detalle — funciona igual que antes.
8. `pages/planificador.vue` — no se ve nada de futuros; el FAB siempre abre form mensual.
9. Pull-to-refresh en `/futuros` — recarga datos.
10. Tema claro / oscuro — el violeta sigue legible en ambos.

## Riesgos

- **Estado compartido en `useState`:** si quedan referencias colgantes en otros componentes accediendo a `gastosFuturos` desde `usePlanificador`, el reactividad se rompe. Mitigación: grep antes de eliminar.
- **Layout activeTab del planificador:** la lógica de `activeTab` en el layout puede confundirse cuando se entra a `/futuros` (que no usa ese layout). Mitigación: como `/futuros` usa `default`, el layout planificador nunca se monta ahí — no hay conflicto.
- **PWA cache:** usuarios con la PWA instalada pueden tener cacheada la URL vieja. El redirect cubre esto.

## Archivos afectados (resumen)

**Nuevos:**
- `pages/futuros.vue`
- `composables/useGastosFuturos.js`
- `components/futuros/Lista.vue` (movido y renombrado)
- `components/futuros/Resumen.vue` (movido y renombrado)
- `components/futuros/Form.vue` (movido y renombrado)
- `server/api/futuros/index.get.js`

**Modificados:**
- `pages/planificador.vue` — remover lógica de futuros + agregar redirect de query vieja.
- `composables/usePlanificador.js` — remover estado/funciones de futuros.
- `layouts/planificador.vue` — sub-tab `to` y estilo activo violeta.
- `components/layout/SideNav.vue` — actualizar `to`.
- `components/layout/MobileDrawer.vue` — actualizar `to`.

**Eliminados (movidos a nueva ubicación):**
- `components/planificador/ListaGastosFuturos.vue`
- `components/planificador/ResumenGastosFuturos.vue`
- `components/planificador/FormGastoFuturo.vue`
