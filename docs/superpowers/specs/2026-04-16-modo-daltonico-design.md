# Modo Daltónico — Spec de Diseño

## Resumen

Toggle de accesibilidad que, al activarse, reduce la variedad de colores en toda la app y reemplaza la paleta semántica multicolor por 3 colores base de alto contraste, distinguibles para protanopía, deuteranopía y tritanopía. Funciona con cualquier tema de acento elegido, pero atenúa su impacto visual.

## Paleta semántica reducida

| Propósito           | Color             | Variable CSS       | Uso                                      |
|---------------------|-------------------|--------------------|-------------------------------------------|
| Positivo/éxito      | Azul `#2563eb`    | `--cb-positive`    | Pagado, confirmado, creado, vinculado      |
| Negativo/peligro    | Rojo `#dc2626`    | `--cb-negative`    | Eliminar, vencido, revertido, eliminado    |
| Advertencia/pendiente | Ámbar `#d97706` | `--cb-warning`     | Pendiente, editado, parcial, advertencia   |

## Impacto en el tema de acento

Cuando `html.colorblind` está activo:
- Los fondos de la app mantienen el tono del acento pero con saturación reducida (más gris).
- Los bordes y fondos de acento usan opacidad más baja.
- Se logra añadiendo overrides CSS en `html.colorblind` que ajustan las variables `--color-accent-bg`, `--color-accent-bg-hover`, `--color-accent-ring` a valores más suaves.

## Persistencia

1. **BD:** Nueva columna `modo_daltonico` (boolean, default false) en tabla `configuraciones`.
2. **localStorage:** Key `colorblind-mode` para aplicación instantánea sin esperar al servidor.
3. **API:** `configuraciones/index.put.js` acepta `modoDaltonico`; `index.get.js` lo retorna.

## Lógica en useTheme.js

- Nuevo estado: `isColorblind` (useState).
- `setColorblindMode(enabled)`: agrega/quita clase `colorblind` en `<html>`, persiste en localStorage.
- `initTheme()`: lee `colorblind-mode` de localStorage y aplica.
- Expone `isColorblind` y `setColorblindMode`.

## CSS — main.css

Nuevas reglas bajo `html.colorblind`:
- Variables `--cb-positive`, `--cb-negative`, `--cb-warning` con sus variantes de opacidad.
- Override de `--color-accent-bg` y `--color-accent-bg-hover` para reducir saturación.
- Clases utilitarias: `.cb-positive`, `.cb-negative`, `.cb-warning` con bg/text para usar en componentes.

## UI en configuraciones.vue

Toggle idéntico al de "Vista por día/semana", ubicado después del selector de tamaño de letra:
- Icono: ojo con línea diagonal (accesibilidad).
- Título: "Modo daltónico".
- Descripción: "Reduce la variedad de colores y mejora el contraste para personas con daltonismo."
- Se guarda con el botón "Guardar cambios" junto al resto de configuraciones.

## Componentes a adaptar

Los componentes con colores semánticos hardcoded necesitan clases condicionales cuando `isColorblind` está activo. Mapeo:

| Color original (Tailwind)                          | Mapea a (colorblind)  |
|----------------------------------------------------|-----------------------|
| emerald, green, teal (éxito/pagado/creado)         | `--cb-positive` (azul) |
| red, rose (eliminar/vencido/revertido)             | `--cb-negative` (rojo) |
| amber, yellow, orange (pendiente/editado/parcial)  | `--cb-warning` (ámbar) |
| violet, indigo, purple, sky (checkpoint/info)      | `--cb-positive` (azul) |
| blue (acción primaria)                             | se mantiene como acento |

### Archivos principales afectados:
- `components/shared/ConfirmDialog.vue` — variantes danger/warning/success
- `components/deudas/AuditoriaVinculo.vue` — badges por tipo de acción
- `components/deudas/CheckpointsVinculo.vue` — badges y botones
- `components/deudas/DetallePersona.vue` — estados de deuda
- `components/deudas/ListaPersonas.vue` — indicadores
- `components/planificador/CalendarioMensual.vue` — estados pagado/pendiente/vencido
- `components/planificador/ListaGastosPlaneados.vue` — estados
- `components/planificador/ListaGastosFuturos.vue` — prioridades y estados
- `components/planificador/ResumenMes.vue` — indicadores
- `components/planificador/ResumenGastosFuturos.vue` — stats
- `components/registro/StatsComparativas.vue` — indicadores
- `pages/configuraciones.vue` — botones con color semántico
- `pages/categorias.vue` — acciones

### Estrategia de adaptación en componentes:
En lugar de cambiar cada clase individualmente en 30+ archivos, se usa **CSS override global**: cuando `html.colorblind` está activo, las clases de Tailwind como `bg-emerald-500/15` se sobreescriben via CSS a los colores de la paleta reducida. Esto minimiza cambios en templates.
