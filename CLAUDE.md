# Sistema de Finanzas Personales — Guía del Proyecto

PWA mobile-first de finanzas personales en **Nuxt 3 (JS) + Vue 3 Composition API**, con Tailwind, Drizzle ORM sobre **PostgreSQL (Supabase)**, autenticación con Supabase Auth y PWA vía `@vite-pwa/nuxt`. Moneda por defecto: **Soles peruanos (S/)**, locale `es-PE`, zona horaria `America/Lima`.

Navegación inferior ([components/layout/BottomNav.vue](components/layout/BottomNav.vue)) con tabs: **Planificador**, **Registro**, **Deudas**, más acceso a Configuraciones / Categorías / Información.

---

## Módulo 1 — Planificador ([pages/planificador.vue](pages/planificador.vue))

Planificación mensual del presupuesto. Incluye dos sub-áreas:

### 1a. Gastos planificados del mes
- [ResumenMes.vue](components/planificador/ResumenMes.vue): monto presupuestado, total asignado, saldo proyectado, barra de progreso y gráfico por categoría ([GraficoCategoria.vue](components/planificador/GraficoCategoria.vue)).
- [ListaGastosPlaneados.vue](components/planificador/ListaGastosPlaneados.vue) + [FormGastoPlaneado.vue](components/planificador/FormGastoPlaneado.vue): CRUD con concepto, categoría, monto estimado, fecha probable, recurrencia (columna `recurrente_grupo_id` para replicar en meses futuros), estado `pendiente|pagado`, notas.
- [CalendarioMensual.vue](components/planificador/CalendarioMensual.vue): vista de calendario con gastos planificados por día.
- [FormRegistrarPago.vue](components/planificador/FormRegistrarPago.vue): al marcar un planificado como pagado se crea el gasto real vinculado (columna `gasto_planificado_id` en `gastos`, con índice único — un planificado ↔ máximo un gasto real).
- Duplicación del plan de un mes anterior vía `/api/planificador/duplicar`.

### 1b. Gastos futuros (deseos / decisiones pendientes)
Sistema independiente para planear compras futuras **aún no decididas**, con jerarquía de 3 niveles:
- `gastos_futuros` — tipo de gasto + prioridad.
- `gastos_futuros_detalles` — ítems concretos con `estado_decision` y fecha; al decidirse pueden enlazar a un `gasto_id` o `gasto_planificado_id`.
- `gastos_futuros_opciones` — alternativas comparables con precio mín/máx/promedio, URL de referencia e imagen.

Componentes: [ListaGastosFuturos.vue](components/planificador/ListaGastosFuturos.vue), [FormGastoFuturo.vue](components/planificador/FormGastoFuturo.vue), [ResumenGastosFuturos.vue](components/planificador/ResumenGastosFuturos.vue). API en `/api/planificador/futuros`. Composable: [usePlanificador.js](composables/usePlanificador.js).

---

## Módulo 2 — Registro de Gastos ([pages/registro.vue](pages/registro.vue))

Registro real de gastos con **tres métodos** (`metodo_registro` enum: `voz | foto | manual`):

### Voz ([BotonMicrofono.vue](components/registro/BotonMicrofono.vue))
- Web Speech API vía [useVoiceRecognition.js](composables/useVoiceRecognition.js).
- Transcripción → `/api/voz/parse` → LLM parsea a JSON estructurado ([useLLMParser.js](composables/useLLMParser.js)).
- [ConfirmacionVoz.vue](components/registro/ConfirmacionVoz.vue) muestra los gastos detectados para editar/confirmar/descartar antes de persistir.
- Draft persistente ([useVoiceDraft.js](composables/useVoiceDraft.js)) para no perder dictados ante recargas.

### Foto ([BotonCamara.vue](components/registro/BotonCamara.vue))
- Subida de imagen (recibo/ticket) → `/api/voz/parse-image` → LLM multimodal extrae ítems.
- Mismo flujo de confirmación que voz; draft en [usePhotoDraft.js](composables/usePhotoDraft.js).

### Manual
- [FormGastoManual.vue](components/registro/FormGastoManual.vue) con concepto, monto, categoría, fecha, hora, notas.

### Historial y analítica
- [HistorialDiario.vue](components/registro/HistorialDiario.vue) con navegación por día (swipe vía [useSwipeMonth.js](composables/useSwipeMonth.js)).
- [GastoItem.vue](components/registro/GastoItem.vue) con acciones editar/eliminar.
- [ResumenMesRegistro.vue](components/registro/ResumenMesRegistro.vue), [StatsComparativas.vue](components/registro/StatsComparativas.vue), [GraficoCategoria.vue](components/registro/GraficoCategoria.vue).
- [FiltrosCategoriaBar.vue](components/registro/FiltrosCategoriaBar.vue) para filtrado rápido.
- Endpoints: `/api/gastos` (CRUD + `bulk.post.js` para confirmación por voz/foto, `conceptos.get.js` para autocompletado, `resumen.get.js`).
- Composable: [useGastos.js](composables/useGastos.js).

---

## Módulo 3 — Deudas ([pages/deudas.vue](pages/deudas.vue))

Gestión de **"Me deben" / "Yo debo"** agrupadas por persona/entidad. El usuario usa mayoritariamente el lado "Me deben".

### Núcleo
- [ListaPersonas.vue](components/deudas/ListaPersonas.vue) con tabs por tipo, [ResumenDeudas.vue](components/deudas/ResumenDeudas.vue) (balance neto).
- [DetallePersona.vue](components/deudas/DetallePersona.vue): lista de conceptos, historial de pagos, stats, gráfico de evolución.
- CRUD: [FormDeuda.vue](components/deudas/FormDeuda.vue), [FormEditarDeuda.vue](components/deudas/FormEditarDeuda.vue), [FormEditarPersona.vue](components/deudas/FormEditarPersona.vue), [MergePersonas.vue](components/deudas/MergePersonas.vue) (consolidar duplicados).
- Pagos: [FormPago.vue](components/deudas/FormPago.vue) (por concepto) y [FormPagoGlobal.vue](components/deudas/FormPagoGlobal.vue) (distribuir sobre varias deudas). `monto_pendiente` se actualiza por cada pago; estado transiciona `pendiente → parcial → pagado` / `archivado`.
- [HistorialPagosPersona.vue](components/deudas/HistorialPagosPersona.vue), [StatsPersona.vue](components/deudas/StatsPersona.vue), [GraficoEvolucionDeuda.vue](components/deudas/GraficoEvolucionDeuda.vue).
- Registro de deudas por voz: [VozOverlayDeuda.vue](components/deudas/VozOverlayDeuda.vue) + [ConfirmacionVozDeuda.vue](components/deudas/ConfirmacionVozDeuda.vue), composable [useVoiceDeuda.js](composables/useVoiceDeuda.js).
- Exportación a PDF ([useDeudaPdf.js](composables/useDeudaPdf.js)); días para incluir saldadas configurables vía `configuraciones.dias_pdf_saldadas`.

### Vínculos entre usuarios (feature avanzada)
Una `persona_entidad` local puede **vincularse al usuario real de otra cuenta** (`vinculado_usuario_id`, `vinculo_par_id`), compartiendo visibilidad de la deuda entre ambas partes:
- `solicitudes_vinculo` — flujo pendiente/aceptada/rechazada/expirada por email.
- `vinculos_checkpoints` — snapshots tipados (`inicio_vinculo | anterior | actual`) para comparar el estado en el tiempo.
- `auditoria_vinculos` — log de acciones sobre el vínculo.
- Componentes: [SolicitudVinculo.vue](components/deudas/SolicitudVinculo.vue), [NotificacionesVinculo.vue](components/deudas/NotificacionesVinculo.vue), [CheckpointsVinculo.vue](components/deudas/CheckpointsVinculo.vue), [AuditoriaVinculo.vue](components/deudas/AuditoriaVinculo.vue).
- API en `/api/deudas/vinculos`, `/api/deudas/personas`, `/api/deudas/pagos`. Composable: [useVinculos.js](composables/useVinculos.js).
- Deudas y pagos espejados llevan `vinculo_deuda_id` / `vinculo_pago_id`.

---

## Esquema de base de datos ([server/database/schema.js](server/database/schema.js))

Drizzle ORM. Tablas principales:

| Tabla | Propósito |
|---|---|
| `usuarios` | Espejo de `auth.users` de Supabase (mismo UUID). Trigger en [supabase-auth-trigger.sql](server/database/supabase-auth-trigger.sql). |
| `categorias` | Predefinidas globales (`usuario_id` NULL) + personalizadas por usuario. |
| `configuraciones` | 1:1 con usuario: nombre, presupuesto default, moneda, día inicio de ciclo, zona horaria, locale, `dias_pdf_saldadas`. |
| `planes_mensuales` | UNIQUE(usuario, mes, año) con `monto_presupuesto`. |
| `gastos_planificados` | FK a plan + categoría; `recurrente_grupo_id` agrupa instancias recurrentes. |
| `gastos` | Registro real; `gasto_planificado_id` UNIQUE vincula 1:1 con planificado; guarda `transcripcion_voz`. |
| `gastos_futuros` / `_detalles` / `_opciones` | Jerarquía para decisiones de compra pendientes. |
| `personas_entidades` | Deudores/acreedores; soporta vínculo con usuario real de otra cuenta. |
| `deudas` | `tipo_deuda` me_deben/yo_debo; `monto_pendiente` mutable; `vinculo_deuda_id` para espejado. |
| `pagos_deuda` | Historial de pagos; `vinculo_pago_id` para espejado. |
| `solicitudes_vinculo`, `vinculos_checkpoints`, `auditoria_vinculos` | Soporte al sistema de vínculos. |

Enums: `estado_gasto_planificado`, `metodo_registro` (`voz|foto|manual`), `tipo_persona_entidad`, `tipo_deuda`, `estado_deuda`, `estado_solicitud_vinculo`.

Migraciones en [server/database/migrations/](server/database/migrations/). Scripts: `db:generate`, `db:push`, `db:studio`, `db:seed`, `db:seed:test`.

---

## Convenciones y patrones

- **Stack real:** Nuxt 3 + **JavaScript** (no TS en composables/componentes), Tailwind, Drizzle, Supabase (DB + Auth), `@nuxtjs/supabase`, `@vite-pwa/nuxt`, `jspdf`, `xlsx`.
- **Auth:** Supabase; middleware en [middleware/](middleware/), composable [useAuth.js](composables/useAuth.js). Login en [pages/login.vue](pages/login.vue) y [pages/auth/](pages/auth/).
- **Fetch API autenticado:** siempre vía [useApiFetch.js](composables/useApiFetch.js) (inyecta el token de Supabase).
- **UI compartida:** [components/shared/](components/shared/) — `BaseBottomSheet`, `ConfirmDialog`, `MonthSelector`, `SkeletonLoader`, `ToastNotification`.
- **Modales como capas:** [useModalLayer.js](composables/useModalLayer.js) + [useModalBack.js](composables/useModalBack.js) para que el botón atrás en móvil cierre el modal en vez de salir de la página.
- **Offline/online:** [useOnlineStatus.js](composables/useOnlineStatus.js) + [OfflineBanner.vue](components/layout/OfflineBanner.vue).
- **UX móvil:** haptic feedback ([useHaptic.js](composables/useHaptic.js)), pull-to-refresh ([usePullToRefresh.js](composables/usePullToRefresh.js)), swipe gestures.
- **Temas claro/oscuro:** [useTheme.js](composables/useTheme.js), configurable en [pages/configuraciones.vue](pages/configuraciones.vue).
- **Formato moneda/fechas:** [useFormatters.js](composables/useFormatters.js), [useCurrency.js](composables/useCurrency.js) — respetan `locale` y `moneda_preferida` del usuario.
- **Exportación:** Excel en [useExportExcel.js](composables/useExportExcel.js), PDF de deudas en [useDeudaPdf.js](composables/useDeudaPdf.js).
- **LLM para voz/imagen:** prompt del sistema exige JSON estricto (sin markdown), categorías restringidas al set predefinido, fechas relativas ("ayer", "el martes") resueltas contra `FECHA_ACTUAL` inyectada.
- **Mobile-first:** diseñar para 360–412px; toques mínimos 44x44px; tipografía Inter/Poppins.

## Estructura clave

```
pages/          planificador · registro · deudas · configuraciones · categorias · informacion · login · auth/
components/     layout/ · planificador/ · registro/ · deudas/ · shared/
composables/    useGastos · usePlanificador · useDeudas · useVinculos · useVoiceRecognition
                useLLMParser · useVoiceDraft · usePhotoDraft · useVoiceDeuda
                useAuth · useApiFetch · useTheme · useModalLayer · useModalBack
                useFormatters · useCurrency · useHaptic · useOnlineStatus · ...
server/api/     gastos/ · planificador/ (+ futuros/) · deudas/ (+ personas/ pagos/ vinculos/)
                categorias/ · configuraciones/ · voz/ (parse + parse-image)
server/database/ schema.js · index.js · migrations/ · seed.js · seed-test-data.js · supabase-auth-trigger.sql
```
