# Plan de mejoras UI — 380px + texto "Grande" (revisión en vivo)

**Metodología.** Se levantó el entorno local (Postgres + seeds + bypass de auth dev) y se
recorrió cada página con Chromium a **380×800, texto "Grande" (root 18px)**, como un usuario
real: datos de estrés con **nombres muy largos** (planificados, gastos, personas deudoras,
medios de ahorro, ingresos) y **montos de 4 cifras** (máximo real del usuario). Se probó el
flujo completo de **Gastos futuros** creando por UI un proyecto con 2 detalles y 3 opciones
con rangos de precio. Además de la inspección visual, un script detectó desbordes
horizontales programáticamente en todas las páginas.

---

## Hallazgos en producción (app actual)

| # | Página | Problema | Severidad |
|---|--------|----------|-----------|
| 1 | **Ingresos** | Conceptos largos colapsan a 1–2 caracteres por línea ("D e..", "S u.."): el monto + botones editar/eliminar se quedan todo el ancho de la fila. | **Crítica** |
| 2 | **Métricas** | La tabla mensual (Mes/Ingresos/Gastos/Ahorros/Saldo) mide ~494px en un viewport de 380px: la columna "Saldo" queda oculta. | Alta |
| 3 | **Futuros** | En la tarjeta de proyecto, los montos MÍN/PROM/MÁX de 4 cifras se truncan ("S/ 4,34...", "S/ 5,79..."). | Alta |
| 4 | **BottomNav** | La etiqueta "Planificador" se corta ("Planifica...") con texto grande. | Media |
| 5 | **Deudas** | Nombres de personas truncados a ~10 caracteres ("María Alej...", "Asociación..."): el monto se prioriza sobre el nombre. | Media |
| 6 | **Registro** | Tabs ("Categoría", "Comparar") y chips de comparación de meses se cortan en el borde derecho. Día de la semana truncado ("Miérc..."). | Media |
| 7 | **Ahorros** | Medio de ahorro largo sobre-truncado ("Cuenta de ..."). | Baja |
| 8 | **Formularios** | Etiquetas de categoría truncadas en grillas de 3–4 columnas ("Alimenta...", "Entreteni..."). | Baja |
| 9 | **Vista previa v2** | La hoja "Más" (z-50) tapaba el nav inferior (z-40): con la hoja abierta, los taps al nav no hacían nada y la navegación parecía rota. Sin deep links: el botón atrás salía del preview. Filas "Tus módulos" y "Ver detalle →" no eran clicables. | **Crítica** (reportada por el usuario) |

Lo que **sí** funciona bien y se conserva como patrón: `Money.vue` compartido (símbolo+monto
inseparables con espacio duro; nunca "S/" en una línea y el número en otra), tarjetas del
detalle de deuda, calendario financiero, reportes y categorías.

---

## Reglas de moneda (confirmadas con el usuario)

1. El usuario maneja como máximo **miles** (4 cifras): esos montos se muestran **siempre completos** ("S/ 4,349").
2. El colapso "k" se aplica **únicamente desde 5 cifras** (≥ 10,000 → "S/ 21.6k"), nunca antes.
3. Símbolo y monto unidos con espacio duro (U+00A0): jamás se parten en dos líneas.
4. En celdas estrechas (tripletas Mín/Prom/Máx, tarjetas KPI) se usan **enteros** (sin ".00") para ganar ancho con texto grande.

---

## Vista previa V3 (implementada)

Activación: **Configuraciones → "Vista previa de la nueva interfaz (Versión 3)"** (flag en
`localStorage`, clave `ui-preview-v3`; quien tenía la v2 activa hereda el acceso). No toca la
lógica ni las pantallas de producción: `/preview` consume los mismos endpoints de lectura.

### Arquitectura
- **Deep links**: cada módulo vive en `?vista=...` → el botón atrás del teléfono navega entre módulos del preview, y cualquier vista es enlazable/recargable.
- **Nav inferior (5 tabs: Inicio · Plan · Registro · Deudas · Más) por encima de la hoja "Más"** (z-60 vs z-50): con la hoja abierta, las pestañas siguen funcionando. Verificado con test automatizado.
- Hoja "Más" con los **12 módulos** (incluye Familia y Configuración, nuevos en V3); el módulo activo queda resaltado.
- En Inicio, **todo es clicable**: hero → Registro, Me deben → Deudas, Plan → Planificador, Saldo neto → Ingresos, y cada fila de "Tus módulos" navega a su vista.

### Patrón de fila "apilada" (la corrección central)
El concepto/nombre usa **todo el ancho** (máx. 2 líneas con `line-clamp-2 break-words`) y el
monto va en la **fila de metadatos** (chip estado · fecha · monto a la derecha). Aplica a:
Registro, Ingresos (corrige el colapso a 2 caracteres), Ahorros, Planificador, Calendario y
Deudas (el monto pendiente tiene su propia fila bajo el nombre).

### Por módulo
- **Deudas**: balance con Me deben/Yo debo, lista de personas con nombre a 2 líneas + sub-vista de detalle (nombre completo, progreso de cobro, conceptos con estado y "X de Y").
- **Métricas**: sin tabla — tarjetas mensuales con tripleta Ingresos/Gastos/Ahorro en enteros; eje Y del gráfico con la misma regla de moneda ("S/ 5,000" completo, "S/ 10k" desde 5 cifras) y ancho suficiente para no partirse.
- **Futuros**: tripleta MÍN/PROM/MÁX en enteros (4 cifras completas, sin cortes), hero de inversión estimada con rango, y detalles+opciones expandibles con rangos de precio.
- **Configuración (nueva)**: valores reales en lectura + selector de **tamaño de letra funcional** para probar Normal/Grande dentro del propio preview.
- **Familia (nueva)**: lista de perfiles en lectura con CTA demostrativo.
- `PreviewMoney` implementa las 4 reglas de moneda; `PreviewPageHeader` y `MonthNav` (44px+ de toque) unifican cabeceras y navegación de mes.

### Verificación V3
Recorrido automatizado a 380px + texto grande: navegación por los 12 módulos vía "Más"
(deep links correctos), nav inferior operativo con la hoja abierta, botón atrás, proyecto de
futuros expandido, detalle de persona con nombre de 60+ caracteres, y **cero desbordes
horizontales** en todas las vistas.

---

## V4 — Pulido aplicado directamente a producción (visual-only)

A diferencia de la V3 (rediseño completo en `/preview`), la V4 son mejoras quirúrgicas
sobre las vistas actuales — solo template y clases, sin tocar lógica, props, eventos ni
endpoints — para que todo encaje a 380px con texto "Grande". Verificadas en vivo con
cero desbordes horizontales.

| Módulo | Fix aplicado |
|---|---|
| **Ingresos** | Fila apilada: concepto a todo el ancho (clamp-2) + fila meta con fecha·origen, monto (`SharedMoney signo compact`) y acciones de 44px. Corrige el colapso a 1–2 caracteres. El form da más ancho a Fecha (`grid-cols-[1fr,1.35fr]`). |
| **Métricas** | La tabla de 5 columnas (~494px) se reemplazó por tarjetas mensuales: cabecera Mes+Saldo y tripleta Ingresos/Gastos/Ahorros con `SharedMoney compact entero`. |
| **Futuros** | MÍN/PROM/MÁX y precios de opciones con `SharedMoney compact entero`: 4 cifras completas ("S/ 4,349"), "k" solo desde 10,000. |
| **Deudas** | Nombres con `line-clamp-2` (lista y sección saldadas); tarjeta de deuda del detalle apilada (concepto arriba, montos/chip en fila meta); carrusel de filtros con `pr-4`. |
| **Registro** | Tabs Historial/Categorías/Mapa/Comparar en grilla 2×2 bajo 480px (todos visibles, sin cortes); día abreviado "Mié 10" en cabeceras (antes "Miérc..."); chips de Comparar con scroll + `pr-4`; categorías del form manual a 2 líneas. |
| **Planificador** | Grilla de categorías de 4→3 columnas con etiquetas a 2 líneas (también medios en Registrar pago); tarjeta resumen de Registrar pago apilada; ítems de la lista con `min-w-0`/`shrink-0` y concepto sin aplastarse. |
| **Ahorros** | Medios del form a 3 columnas con nombre a 2 líneas; "Por medio" y movimientos con clamp-2. |
| **BottomNav** | Etiquetas a `text-[0.68rem]` (siguen escalando con rem): "Planificador" completo con texto grande. |
| **Compartidos** | `SharedMoney` ganó el prop `entero` (sin ".00" en celdas estrechas; 4 cifras siempre completas). `SharedTabBar` centra etiquetas y agrega `pr-4` al modo scrollable. |

### Ronda 2 (superficies restantes)

| Superficie | Fix |
|---|---|
| **GastoItem (Registro)** | Monto movido a la fila de meta (`ml-auto`) y acciones en columna angosta: el concepto pasa de ~55% a ~85% del ancho (de 7 líneas a 4 con conceptos largos). |
| **Modal "Agregar categoría"** | Etiquetas a 2 líneas en vez de truncar ("Aliment..." → nombre completo). |
| **Idioma + guiones** | `htmlAttrs.lang = 'es'` (accesibilidad) + `hyphens-auto` en todas las grillas de categorías/medios: en dispositivos reales las palabras largas se parten con guion ("Alimenta-ción") en vez de cortarse a secas. |
| **Futuros** | Carrusel de filtros con `pr-4` (el último chip no queda cortado al borde). |
| **Calendario** | Títulos de eventos a 2 líneas (`line-clamp-2`) en vez de truncar. |
| **Verificados sin cambios** | Confirmación de gastos por foto/voz (clamp + "Ver más" + montos completos ya correctos, probado con LLM simulado y montos de 4 cifras), FormPago, FormPagoGlobal, FormDeuda, Metas de ahorro, Papelera, Reportes. |

