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

## Siguientes pasos sugeridos (cuando el usuario apruebe la V3)

1. Portar el patrón de fila apilada a producción módulo por módulo (Ingresos primero — defecto crítico).
2. Reemplazar la tabla de Métricas de producción por las tarjetas mensuales.
3. Aplicar `entero`/regla de 5 cifras a las tripletas de Futuros en producción.
4. Acortar la etiqueta del BottomNav ("Plan") o reducir tipografía solo en modo grande.
5. Decidir qué componentes de cada página se conservan (el usuario indicará por módulo).
