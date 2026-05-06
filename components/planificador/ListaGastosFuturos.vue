<template>
  <div class="px-4 py-3">
    <!-- Resumen denso (header) -->
    <div v-if="gastosFuturos.length" class="mb-4">
      <div class="relative overflow-hidden rounded-2xl border border-theme-border bg-gradient-to-br from-theme-card to-theme-card/90 p-4">
        <div class="absolute -top-10 right-0 h-28 w-28 rounded-full bg-sky-500/10 blur-2xl"></div>

        <!-- Fila top: Inversión (izq) · Proyectos (der) -->
        <div class="relative flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-[10px] uppercase tracking-[0.16em] text-theme-text-muted">Inversión estimada</p>
            <p class="mt-0.5 truncate text-2xl font-bold text-theme-text leading-tight">
              {{ currencySymbol }}&nbsp;{{ formatMonto(resumenFuturos.totalPromedio) }}
              <span class="text-xs font-normal text-theme-text-sec">promedio</span>
            </p>
            <p class="mt-0.5 truncate text-[11px] text-theme-text-sec">
              {{ currencySymbol }}&nbsp;{{ formatMonto(resumenFuturos.totalMinimo) }} mín. — {{ currencySymbol }}&nbsp;{{ formatMonto(resumenFuturos.totalMaximo) }} máx.
            </p>
          </div>
          <div class="shrink-0 text-right">
            <p class="text-[10px] uppercase tracking-[0.16em] text-theme-text-muted">Proyectos</p>
            <p class="mt-0.5 text-2xl font-bold text-theme-text leading-tight">{{ resumenFuturos.totalProyectos }}</p>
            <p class="text-[11px] text-theme-text-sec whitespace-nowrap">{{ resumenFuturos.totalOpciones }} opc.</p>
          </div>
        </div>

        <!-- Progreso de decisión slim + badges de prioridad inline -->
        <div v-if="resumenFuturos.progresoDecision?.total > 0" class="mt-4 space-y-1.5">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <p class="text-[10px] uppercase tracking-[0.16em] text-theme-text-muted">Progreso de decisión</p>
            <div v-if="resumenFuturos.porPrioridad && (resumenFuturos.porPrioridad.alta || resumenFuturos.porPrioridad.media || resumenFuturos.porPrioridad.baja)" class="flex items-center gap-1.5">
              <span v-if="resumenFuturos.porPrioridad.alta" class="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-400">{{ resumenFuturos.porPrioridad.alta }} alta</span>
              <span v-if="resumenFuturos.porPrioridad.media" class="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">{{ resumenFuturos.porPrioridad.media }} media</span>
              <span v-if="resumenFuturos.porPrioridad.baja" class="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">{{ resumenFuturos.porPrioridad.baja }} baja</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-theme-input">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="resumenFuturos.progresoDecision.porcentaje === 100 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-sky-500 to-sky-400'"
                :style="{ width: resumenFuturos.progresoDecision.porcentaje + '%' }"
              ></div>
            </div>
            <span class="shrink-0 text-[10px] font-semibold whitespace-nowrap" :class="resumenFuturos.progresoDecision.porcentaje === 100 ? 'text-emerald-400' : 'text-sky-300'">
              {{ resumenFuturos.progresoDecision.decididos }}/{{ resumenFuturos.progresoDecision.total }} · {{ resumenFuturos.progresoDecision.porcentaje }}%
            </span>
          </div>
          <!-- Leyenda -->
          <div class="flex flex-wrap items-center gap-3 pt-0.5">
            <span v-if="desglose.compradas > 0" class="flex items-center gap-1 text-[10px] text-emerald-400">
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>{{ desglose.compradas }} comprada{{ desglose.compradas > 1 ? 's' : '' }}
            </span>
            <span v-if="desglose.planificadas > 0" class="flex items-center gap-1 text-[10px] text-sky-300">
              <span class="h-1.5 w-1.5 rounded-full bg-sky-400"></span>{{ desglose.planificadas }} planificada{{ desglose.planificadas > 1 ? 's' : '' }}
            </span>
            <span v-if="desglose.pendientes > 0" class="flex items-center gap-1 text-[10px] text-theme-text-muted">
              <span class="h-1.5 w-1.5 rounded-full bg-gray-500"></span>{{ desglose.pendientes }} pendiente{{ desglose.pendientes > 1 ? 's' : '' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="mb-2 flex items-center gap-2">
      <div class="relative flex-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-text-sec" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="busqueda"
          type="text"
          placeholder="Buscar proyecto, detalle u opcion..."
          class="w-full rounded-xl border border-theme-border bg-theme-card py-2 pl-9 pr-3 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-theme-accent transition-colors"
        />
      </div>
      <button
        class="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-theme-border bg-theme-card px-3 py-2 text-[11px] text-theme-text-sec hover:text-theme-text transition-colors"
        :title="`Ordenar por ${ordenLabel}`"
        @click="ciclarOrden"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
        {{ ordenLabel }}
      </button>
    </div>

    <!-- Filtros por prioridad y estado -->
    <div class="mb-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <button
        v-for="f in filtrosProyecto"
        :key="f.value"
        class="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
        :class="[
          filtroActual === f.value ? (f.accent || 'bg-theme-accent text-theme-on-accent') : 'bg-theme-card text-theme-text-muted',
          f.count === 0 && filtroActual !== f.value ? 'opacity-50' : ''
        ]"
        @click="filtroActual = f.value"
      >
        {{ f.label }}
        <span
          class="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold"
          :class="filtroActual === f.value ? 'bg-black/15 text-inherit' : 'bg-theme-border-md text-theme-text'"
        >
          {{ f.count }}
        </span>
      </button>
    </div>

    <div v-if="isLoading && gastosFuturos.length === 0" class="space-y-3">
      <div v-for="i in 2" :key="i" class="rounded-2xl border border-theme-border bg-theme-card p-4 animate-pulse">
        <div class="h-4 w-2/3 rounded bg-theme-border-md"></div>
        <div class="mt-3 h-20 rounded-xl bg-theme-input"></div>
      </div>
    </div>

    <div v-else-if="gastosFiltrados.length === 0" class="rounded-2xl border border-dashed border-theme-border bg-theme-card px-5 py-10 text-center">
      <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-theme-input text-sky-300">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5m-16.5 5.25h16.5m-16.5 5.25h10.5" />
        </svg>
      </div>
      <p class="text-sm text-theme-text">{{ busqueda ? 'No hay coincidencias' : 'Crea tu primer gasto futuro' }}</p>
      <p class="mt-1 text-xs text-theme-text-sec">
        {{ busqueda ? 'Prueba con otro termino o limpia el filtro.' : 'Ejemplos: PC nueva, outfit invierno, setup streaming.' }}
      </p>
    </div>

    <div v-else class="space-y-3">
      <article
        v-for="proyecto in gastosFiltrados"
        :key="proyecto.id"
        class="overflow-hidden rounded-2xl border border-theme-border bg-theme-card"
      >
        <!-- Cabecera del proyecto (compacta) -->
        <div class="p-4">
          <div class="flex min-w-0 gap-3">
            <div
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
              :style="{ backgroundColor: (proyecto.categoriaColor || '#6b7280') + '22' }"
            >
              <span class="text-lg">{{ proyecto.categoriaIcono || '📦' }}</span>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="truncate text-sm font-semibold text-theme-text">{{ proyecto.tipoGasto }}</h3>
                <span
                  v-if="prioridadBadge(proyecto.prioridad)"
                  class="rounded-full px-2 py-0.5 text-[10px] font-medium"
                  :class="prioridadBadge(proyecto.prioridad).clases"
                >
                  {{ prioridadBadge(proyecto.prioridad).label }}
                </span>
                <span class="truncate text-[11px] text-theme-text-sec">
                  {{ proyecto.categoriaNombre || 'Sin categoria' }}
                </span>
              </div>
              <p v-if="proyecto.descripcion" class="mt-0.5 truncate text-[11px] text-theme-text-muted">{{ proyecto.descripcion }}</p>
            </div>
            <!-- Decidido X/N en esquina superior derecha -->
            <div v-if="progresoProyecto(proyecto).total > 0" class="shrink-0 text-right">
              <p class="text-[9px] uppercase tracking-[0.16em] text-theme-text-muted">Decidido</p>
              <p class="text-xs font-semibold whitespace-nowrap" :class="progresoProyecto(proyecto).porcentaje === 100 ? 'text-emerald-400' : 'text-sky-300'">
                {{ progresoProyecto(proyecto).decididos }}/{{ progresoProyecto(proyecto).total }} · {{ progresoProyecto(proyecto).porcentaje }}%
              </p>
            </div>
          </div>

          <!-- Min/Prom/Max densos en una fila -->
          <div class="mt-3 flex items-stretch rounded-xl bg-theme-input">
            <div class="min-w-0 flex-1 px-3 py-2">
              <p class="text-[9px] uppercase tracking-[0.16em] text-theme-text-muted">Mín</p>
              <p class="mt-0.5 truncate text-xs font-semibold text-emerald-400">{{ currencySymbol }}&nbsp;{{ formatMonto(proyecto.resumen.totalMinimo) }}</p>
            </div>
            <div class="w-px bg-theme-border/60"></div>
            <div class="min-w-0 flex-1 px-3 py-2">
              <p class="text-[9px] uppercase tracking-[0.16em] text-theme-text-muted">Prom</p>
              <p class="mt-0.5 truncate text-xs font-semibold text-sky-300">{{ currencySymbol }}&nbsp;{{ formatMonto(proyecto.resumen.totalPromedio) }}</p>
            </div>
            <div class="w-px bg-theme-border/60"></div>
            <div class="min-w-0 flex-1 px-3 py-2">
              <p class="text-[9px] uppercase tracking-[0.16em] text-theme-text-muted">Máx</p>
              <p class="mt-0.5 truncate text-xs font-semibold text-amber-300">{{ currencySymbol }}&nbsp;{{ formatMonto(proyecto.resumen.totalMaximo) }}</p>
            </div>
          </div>

          <!-- Barra slim de progreso -->
          <div v-if="progresoProyecto(proyecto).total > 0" class="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-theme-input">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="progresoProyecto(proyecto).porcentaje === 100 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-sky-500 to-sky-400'"
              :style="{ width: progresoProyecto(proyecto).porcentaje + '%' }"
            ></div>
          </div>

          <!-- Footer: Ver detalles + kebab -->
          <div class="mt-3 flex items-center gap-2">
            <button
              class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-theme-input px-3 py-1.5 text-[11px] text-theme-text-sec transition-colors hover:text-theme-text"
              @click="toggleExpandido(proyecto.id)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 transition-transform" :class="estaExpandido(proyecto.id) ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25L12 15.75 4.5 8.25" />
              </svg>
              {{ estaExpandido(proyecto.id) ? 'Ocultar detalles' : `Ver ${proyecto.resumen.totalDetalles} detalle${proyecto.resumen.totalDetalles !== 1 ? 's' : ''}` }}
            </button>
            <div class="relative">
              <button
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-theme-border bg-theme-card text-theme-text-sec transition-colors hover:border-theme-accent hover:text-theme-text"
                :title="'Más acciones'"
                @click="toggleMenuProyecto(proyecto.id)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <circle cx="4" cy="10" r="1.6" />
                  <circle cx="10" cy="10" r="1.6" />
                  <circle cx="16" cy="10" r="1.6" />
                </svg>
              </button>
              <div
                v-if="menuProyectoAbierto === proyecto.id"
                class="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-xl border border-theme-border bg-theme-card shadow-lg"
              >
                <button
                  class="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-theme-text transition-colors hover:bg-theme-input"
                  @click="emit('editar', proyecto); cerrarMenuProyecto()"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                  Editar
                </button>
                <button
                  class="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-red-400 transition-colors hover:bg-red-500/10"
                  @click="proyectoAEliminar = proyecto; cerrarMenuProyecto()"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Detalles expandidos -->
        <div v-if="estaExpandido(proyecto.id)" class="border-t border-theme-border bg-theme-input/45 px-4 py-4">
          <div class="space-y-3">
            <div
              v-for="detalle in detallesOrdenados(proyecto.detalles)"
              :key="detalle.id"
              class="rounded-2xl border border-theme-border bg-theme-card"
            >
              <!-- Cabecera detalle: modo edición -->
              <div v-if="detalleEditando?.detalleId === detalle.id" class="p-3 space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-xs font-medium text-theme-text">Editando detalle</p>
                  <button class="text-[11px] text-theme-text-muted hover:text-theme-text transition-colors" @click="cancelarEdicionDetalle">Cancelar</button>
                </div>
                <input
                  v-model="detalleEditando.nombre"
                  type="text"
                  placeholder="Nombre del detalle *"
                  class="w-full rounded-lg border border-theme-border bg-theme-input px-3 py-2 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-theme-accent transition-colors"
                />
                <div class="flex gap-1.5">
                  <button
                    v-for="opt in prioridadOpcionesDetalle"
                    :key="opt.value"
                    type="button"
                    class="flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-all"
                    :class="detalleEditando.prioridad === opt.value ? opt.activo : 'border-theme-border bg-theme-input text-theme-text-muted'"
                    @click="detalleEditando.prioridad = opt.value"
                  >
                    {{ opt.label }}
                  </button>
                </div>
                <textarea
                  v-model="detalleEditando.notas"
                  rows="2"
                  placeholder="Notas del detalle (opcional)"
                  class="w-full resize-none rounded-lg border border-theme-border bg-theme-input px-3 py-2 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-theme-accent transition-colors"
                ></textarea>
                <button
                  class="w-full rounded-lg bg-theme-accent py-2 text-sm font-medium text-theme-on-accent transition-colors hover:bg-theme-accent-dark disabled:opacity-60"
                  :disabled="guardandoInline"
                  @click="guardarEdicionDetalle(proyecto, detalle)"
                >
                  {{ guardandoInline ? 'Guardando...' : 'Guardar detalle' }}
                </button>
              </div>

              <!-- Cabecera detalle: modo lectura -->
              <div v-else class="flex items-center justify-between gap-3 p-3">
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span
                      class="h-2 w-2 shrink-0 rounded-full"
                      :class="puntoDetalleColor(detalle)"
                    ></span>
                    <p class="text-sm font-medium text-theme-text break-words">{{ detalle.nombre }}</p>
                    <span
                      v-if="prioridadBadge(detalle.prioridad)"
                      class="rounded-full px-2 py-0.5 text-[10px] font-medium"
                      :class="prioridadBadge(detalle.prioridad).clases"
                    >
                      {{ prioridadBadge(detalle.prioridad).label }}
                    </span>
                    <span
                      v-if="decisionBadge(detalle)"
                      class="rounded-full px-2 py-0.5 text-[10px] font-medium"
                      :class="decisionBadge(detalle).clases"
                    >
                      {{ decisionBadge(detalle).label }}
                    </span>
                  </div>
                  <p v-if="detalle.notas" class="mt-1 text-[11px] text-theme-text-sec">{{ detalle.notas }}</p>
                  <p class="mt-1 text-[10px] text-theme-text-muted">
                    {{ detalle.estadoDecision ? 'Opcion elegida' : `${detalle.opciones.length} opcion${detalle.opciones.length !== 1 ? 'es' : ''}` }}
                  </p>
                </div>
                <div class="flex shrink-0 items-center gap-2">
                  <div class="text-right">
                    <p class="text-[11px] font-semibold text-sky-300 whitespace-nowrap">{{ currencySymbol }}&nbsp;{{ formatMonto(detalle.resumen.promedioReferencia || 0) }}</p>
                    <p class="text-[10px] text-theme-text-sec whitespace-nowrap">{{ currencySymbol }}&nbsp;{{ formatMonto(detalle.resumen.minimoReferencia || 0) }} - {{ currencySymbol }}&nbsp;{{ formatMonto(detalle.resumen.maximoReferencia || 0) }}</p>
                  </div>
                  <div v-if="!detalle.estadoDecision" class="relative">
                    <button
                      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-theme-border bg-theme-card text-theme-text-sec transition-colors hover:border-theme-accent hover:text-theme-text"
                      title="Más acciones"
                      @click="toggleMenuDetalle(detalle.id)"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <circle cx="4" cy="10" r="1.6" />
                        <circle cx="10" cy="10" r="1.6" />
                        <circle cx="16" cy="10" r="1.6" />
                      </svg>
                    </button>
                    <div
                      v-if="menuDetalleAbierto === detalle.id"
                      class="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-xl border border-theme-border bg-theme-card shadow-lg"
                    >
                      <button
                        class="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-theme-text transition-colors hover:bg-theme-input"
                        @click="iniciarEdicionDetalle(detalle); cerrarMenuDetalle()"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                        Editar
                      </button>
                      <button
                        class="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-red-400 transition-colors hover:bg-red-500/10"
                        @click="eliminarDetalleInline(proyecto, detalle); cerrarMenuDetalle()"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Opciones del detalle (siempre visibles dentro del proyecto expandido) -->
              <div class="border-t border-theme-border/60 px-3 pb-3 pt-2 space-y-2">
                <div
                  v-for="(opcion, idx) in detalle.opciones"
                  :key="opcion.id"
                  class="rounded-xl border bg-theme-input transition-all"
                  :class="estaSeleccionada(detalle.id, opcion.id)
                    ? (esMejorOpcion(detalle, opcion) && (detalle.opciones || []).length > 1
                        ? 'border-emerald-400/70 bg-emerald-500/10 shadow-sm'
                        : 'border-sky-400/60 bg-sky-500/5 shadow-sm')
                    : esMejorOpcion(detalle, opcion) && (detalle.opciones || []).length > 1
                      ? 'border-emerald-500/30'
                      : 'border-theme-border'"
                >
                  <!-- Opción: modo edición -->
                  <div v-if="opcionEditando?.opcionId === opcion.id" class="p-3 space-y-2">
                    <div class="flex items-center justify-between gap-2">
                      <p class="text-xs font-medium text-theme-text">Editando opcion</p>
                      <button class="text-[11px] text-theme-text-muted hover:text-theme-text transition-colors" @click="cancelarEdicionOpcion">Cancelar</button>
                    </div>
                    <input
                      v-model="opcionEditando.nombre"
                      type="text"
                      placeholder="Nombre de la opcion *"
                      class="w-full rounded-lg border border-theme-border bg-theme-card px-3 py-2 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-theme-accent transition-colors"
                    />
                    <input
                      v-model="opcionEditando.referenciaUrl"
                      type="url"
                      placeholder="Link de referencia (opcional)"
                      class="w-full rounded-lg border border-theme-border bg-theme-card px-3 py-2 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-theme-accent transition-colors"
                    />
                    <input
                      v-model="opcionEditando.imagenUrl"
                      type="url"
                      placeholder="Link de imagen (opcional)"
                      class="w-full rounded-lg border border-theme-border bg-theme-card px-3 py-2 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-theme-accent transition-colors"
                    />
                    <div class="grid grid-cols-3 gap-2">
                      <div>
                        <label class="mb-1 block text-[11px] text-theme-text-muted">Min</label>
                        <input v-model="opcionEditando.precioMinimo" type="number" min="0" step="0.01" placeholder="0.00" class="w-full rounded-lg border border-theme-border bg-theme-card px-2 py-2 text-sm text-theme-text focus:outline-none focus:border-theme-accent transition-colors" />
                      </div>
                      <div>
                        <label class="mb-1 block text-[11px] text-theme-text-muted">Prom</label>
                        <input v-model="opcionEditando.precioPromedio" type="number" min="0" step="0.01" placeholder="Auto" class="w-full rounded-lg border border-theme-border bg-theme-card px-2 py-2 text-sm text-theme-text focus:outline-none focus:border-theme-accent transition-colors" />
                      </div>
                      <div>
                        <label class="mb-1 block text-[11px] text-theme-text-muted">Max</label>
                        <input v-model="opcionEditando.precioMaximo" type="number" min="0" step="0.01" placeholder="0.00" class="w-full rounded-lg border border-theme-border bg-theme-card px-2 py-2 text-sm text-theme-text focus:outline-none focus:border-theme-accent transition-colors" />
                      </div>
                    </div>
                    <textarea
                      v-model="opcionEditando.notas"
                      rows="2"
                      placeholder="Notas (tienda, color, talla, etc.)"
                      class="w-full resize-none rounded-lg border border-theme-border bg-theme-card px-3 py-2 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-theme-accent transition-colors"
                    ></textarea>
                    <button
                      class="w-full rounded-lg bg-theme-accent py-2 text-sm font-medium text-theme-on-accent transition-colors hover:bg-theme-accent-dark disabled:opacity-60"
                      :disabled="guardandoInline"
                      @click="guardarEdicionOpcion(proyecto, detalle)"
                    >
                      {{ guardandoInline ? 'Guardando...' : 'Guardar cambios' }}
                    </button>
                  </div>

                  <!-- Opción: modo lectura (fila densa, tap-to-reveal) -->
                  <template v-else>
                    <div
                      class="flex items-stretch gap-3 px-3 py-2.5"
                      :class="!detalle.estadoDecision ? 'cursor-pointer' : ''"
                      :role="!detalle.estadoDecision ? 'button' : undefined"
                      :tabindex="!detalle.estadoDecision ? 0 : undefined"
                      @click="!detalle.estadoDecision && seleccionarOpcion(detalle.id, opcion.id)"
                      @keydown.enter.prevent="!detalle.estadoDecision && seleccionarOpcion(detalle.id, opcion.id)"
                      @keydown.space.prevent="!detalle.estadoDecision && seleccionarOpcion(detalle.id, opcion.id)"
                    >
                      <!-- Número índice -->
                      <div
                        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold"
                        :class="estaSeleccionada(detalle.id, opcion.id)
                          ? (esMejorOpcion(detalle, opcion) && (detalle.opciones || []).length > 1
                              ? 'bg-emerald-500/30 text-emerald-200'
                              : 'bg-sky-500/25 text-sky-200')
                          : esMejorOpcion(detalle, opcion) && (detalle.opciones || []).length > 1
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-theme-card text-theme-text-sec'"
                      >
                        {{ idx + 1 }}
                      </div>

                      <!-- Bloque texto principal -->
                      <div class="min-w-0 flex-1">
                        <div class="flex items-baseline justify-between gap-3">
                          <p class="text-sm font-medium text-theme-text break-words">{{ opcion.nombre }}</p>
                          <p class="shrink-0 text-sm font-semibold text-sky-300 whitespace-nowrap">
                            {{ currencySymbol }}&nbsp;{{ formatMonto(opcion.precioPromedio || 0) }}
                          </p>
                        </div>
                        <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                          <span class="text-theme-text-sec whitespace-nowrap">
                            {{ currencySymbol }}&nbsp;{{ formatMonto(opcion.precioMinimo || 0) }} — {{ currencySymbol }}&nbsp;{{ formatMonto(opcion.precioMaximo || 0) }}
                          </span>
                          <span
                            v-if="esMejorOpcion(detalle, opcion) && (detalle.opciones || []).length > 1"
                            class="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300"
                          >
                            Mejor precio
                          </span>
                          <a
                            v-if="opcion.referenciaUrl"
                            :href="opcion.referenciaUrl"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="inline-flex items-center gap-0.5 text-theme-accent hover:text-theme-accent-light"
                            @click.stop
                          >
                            {{ hostDeUrl(opcion.referenciaUrl) }}
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H18m0 0v4.5M18 6l-7.5 7.5" />
                            </svg>
                          </a>
                        </div>
                        <p v-if="opcion.notas" class="mt-1 text-[11px] text-theme-text-muted">{{ opcion.notas }}</p>
                      </div>

                      <!-- Imagen miniatura -->
                      <img
                        v-if="opcion.imagenUrl"
                        :src="opcion.imagenUrl"
                        :alt="opcion.nombre"
                        class="h-12 w-12 shrink-0 self-center rounded-lg object-cover"
                        loading="lazy"
                        @click.stop
                      />
                    </div>

                    <!-- Acciones reveladas al seleccionar -->
                    <div
                      v-if="estaSeleccionada(detalle.id, opcion.id) && !detalle.estadoDecision"
                      class="flex items-center gap-1.5 border-t border-theme-border/60 px-3 py-2"
                      @click.stop
                    >
                      <button
                        class="flex-1 rounded-lg bg-sky-500/15 px-3 py-1.5 text-[11px] font-medium text-sky-300 transition-colors hover:bg-sky-500/25"
                        @click="abrirDecision(proyecto, detalle, opcion, 'planificar')"
                      >
                        Planificar
                      </button>
                      <button
                        class="flex-1 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-[11px] font-medium text-emerald-400 transition-colors hover:bg-emerald-500/25"
                        @click="abrirDecision(proyecto, detalle, opcion, 'comprar')"
                      >
                        Comprar ya
                      </button>
                      <div class="relative">
                        <button
                          class="flex h-8 w-8 items-center justify-center rounded-lg border border-theme-border bg-theme-card text-theme-text-sec transition-colors hover:border-theme-accent hover:text-theme-text"
                          title="Más acciones"
                          @click.stop="toggleMenuOpcion(opcion.id)"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <circle cx="4" cy="10" r="1.6" />
                            <circle cx="10" cy="10" r="1.6" />
                            <circle cx="16" cy="10" r="1.6" />
                          </svg>
                        </button>
                        <div
                          v-if="menuOpcionAbierto === opcion.id"
                          class="absolute right-0 bottom-full z-20 mb-1 w-36 overflow-hidden rounded-xl border border-theme-border bg-theme-card shadow-lg"
                        >
                          <button
                            v-if="detalle.opciones.length > 1 && idx > 0"
                            class="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-theme-text transition-colors hover:bg-theme-input"
                            @click="moverOpcion(proyecto, detalle, opcion, -1); cerrarMenuOpcion()"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
                            Subir
                          </button>
                          <button
                            v-if="detalle.opciones.length > 1 && idx < detalle.opciones.length - 1"
                            class="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-theme-text transition-colors hover:bg-theme-input"
                            @click="moverOpcion(proyecto, detalle, opcion, 1); cerrarMenuOpcion()"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                            Bajar
                          </button>
                          <button
                            class="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-theme-text transition-colors hover:bg-theme-input"
                            @click="iniciarEdicionOpcion(opcion); cerrarMenuOpcion()"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                            Editar
                          </button>
                          <button
                            class="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-red-400 transition-colors hover:bg-red-500/10"
                            @click="eliminarOpcionInline(proyecto, detalle, opcion); cerrarMenuOpcion()"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  </template>
                </div>

                <!-- Botón agregar opción -->
                <button
                  v-if="!detalle.estadoDecision"
                  class="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-theme-border bg-theme-input/50 py-2.5 text-[11px] font-medium text-theme-text-sec transition-colors hover:border-theme-accent hover:text-theme-accent"
                  @click="abrirNuevaOpcion(proyecto, detalle)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Agregar opcion
                </button>
              </div>
            </div>

            <!-- Botón agregar detalle -->
            <button
              class="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-theme-border bg-theme-card/60 py-3 text-xs font-medium text-theme-text-sec transition-colors hover:border-theme-accent hover:text-theme-accent"
              @click="abrirNuevoDetalle(proyecto)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Agregar detalle
            </button>
          </div>
        </div>
      </article>

      <div class="h-16"></div>
    </div>

    <!-- Overlay para cerrar menús kebab al hacer click fuera -->
    <div
      v-if="menuProyectoAbierto !== null || menuDetalleAbierto !== null || menuOpcionAbierto !== null"
      class="fixed inset-0 z-10"
      @click="cerrarTodosMenus"
    ></div>

    <!-- Modal: confirmar eliminar proyecto -->
    <div v-if="proyectoAEliminar" class="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div class="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm" @click="proyectoAEliminar = null"></div>
      <div class="relative w-full max-w-sm rounded-2xl border border-theme-border bg-theme-card p-5">
        <h3 class="text-base font-semibold text-theme-text">Eliminar gasto futuro</h3>
        <p class="mt-2 text-sm text-theme-text-sec">Se eliminaran el proyecto, sus detalles y todas las opciones guardadas.</p>
        <p class="mt-2 text-sm font-medium text-theme-text">{{ proyectoAEliminar.tipoGasto }}</p>
        <div class="mt-5 space-y-2">
          <button
            class="w-full rounded-xl bg-red-500/15 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/25"
            :disabled="eliminando"
            @click="confirmarEliminar"
          >
            {{ eliminando ? 'Eliminando...' : 'Eliminar proyecto' }}
          </button>
          <button class="w-full rounded-xl py-2.5 text-sm text-theme-text-sec transition-colors hover:text-theme-text" @click="proyectoAEliminar = null">
            Cancelar
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: confirmar eliminar detalle -->
    <div v-if="detalleAEliminar" class="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div class="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm" @click="detalleAEliminar = null"></div>
      <div class="relative w-full max-w-sm rounded-2xl border border-theme-border bg-theme-card p-5">
        <h3 class="text-base font-semibold text-theme-text">Eliminar detalle</h3>
        <p class="mt-2 text-sm text-theme-text-sec">Se eliminara el detalle y todas sus opciones guardadas.</p>
        <p class="mt-2 text-sm font-medium text-theme-text">{{ detalleAEliminar.detalle.nombre }}</p>
        <p v-if="detalleAEliminar.detalle.opciones?.length" class="mt-1 text-xs text-theme-text-muted">
          {{ detalleAEliminar.detalle.opciones.length }} opcion{{ detalleAEliminar.detalle.opciones.length !== 1 ? 'es' : '' }} se perderan
        </p>
        <div class="mt-5 space-y-2">
          <button
            class="w-full rounded-xl bg-red-500/15 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/25"
            :disabled="guardandoInline"
            @click="confirmarEliminarDetalle"
          >
            {{ guardandoInline ? 'Eliminando...' : 'Eliminar detalle' }}
          </button>
          <button class="w-full rounded-xl py-2.5 text-sm text-theme-text-sec transition-colors hover:text-theme-text" @click="detalleAEliminar = null">
            Cancelar
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: confirmar eliminar opción -->
    <div v-if="opcionAEliminar" class="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div class="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm" @click="opcionAEliminar = null"></div>
      <div class="relative w-full max-w-sm rounded-2xl border border-theme-border bg-theme-card p-5">
        <h3 class="text-base font-semibold text-theme-text">Eliminar opcion</h3>
        <p class="mt-2 text-sm text-theme-text-sec">Se eliminara esta opcion de forma permanente.</p>
        <p class="mt-2 text-sm font-medium text-theme-text">{{ opcionAEliminar.opcion.nombre }}</p>
        <div class="mt-5 space-y-2">
          <button
            class="w-full rounded-xl bg-red-500/15 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/25"
            :disabled="guardandoInline"
            @click="confirmarEliminarOpcion"
          >
            {{ guardandoInline ? 'Eliminando...' : 'Eliminar opcion' }}
          </button>
          <button class="w-full rounded-xl py-2.5 text-sm text-theme-text-sec transition-colors hover:text-theme-text" @click="opcionAEliminar = null">
            Cancelar
          </button>
        </div>
      </div>
    </div>

    <!-- Panel: nueva opción -->
    <div v-if="nuevaOpcionCtx" class="fixed inset-0 z-50 flex items-end justify-center">
      <div class="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm" @click="cancelarNuevaOpcion"></div>
      <div class="relative w-full max-w-lg rounded-t-3xl border-t border-theme-border bg-theme-card p-5 pb-8 space-y-3" style="max-height: 80dvh; overflow-y: auto;">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold text-theme-text">Nueva opcion</h3>
          <button class="text-theme-text-sec hover:text-theme-text transition-colors" @click="cancelarNuevaOpcion">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p class="text-xs text-theme-text-sec">{{ nuevaOpcionCtx.proyecto.tipoGasto }} › {{ nuevaOpcionCtx.detalle.nombre }}</p>
        <input
          v-model="nuevaOpcion.nombre"
          type="text"
          placeholder="Nombre de la opcion *"
          class="w-full rounded-xl border border-theme-border bg-theme-input px-4 py-3 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-theme-accent transition-colors"
        />
        <input
          v-model="nuevaOpcion.referenciaUrl"
          type="url"
          placeholder="Link de referencia (opcional)"
          class="w-full rounded-xl border border-theme-border bg-theme-input px-4 py-3 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-theme-accent transition-colors"
        />
        <input
          v-model="nuevaOpcion.imagenUrl"
          type="url"
          placeholder="Link de imagen (opcional)"
          class="w-full rounded-xl border border-theme-border bg-theme-input px-4 py-3 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-theme-accent transition-colors"
        />
        <div class="grid grid-cols-3 gap-2">
          <div>
            <label class="mb-1 block text-[11px] text-theme-text-muted">Min</label>
            <input v-model="nuevaOpcion.precioMinimo" type="number" min="0" step="0.01" placeholder="0.00" class="w-full rounded-xl border border-theme-border bg-theme-input px-3 py-2.5 text-sm text-theme-text focus:outline-none focus:border-theme-accent transition-colors" />
          </div>
          <div>
            <label class="mb-1 block text-[11px] text-theme-text-muted">Prom</label>
            <input v-model="nuevaOpcion.precioPromedio" type="number" min="0" step="0.01" placeholder="Auto" class="w-full rounded-xl border border-theme-border bg-theme-input px-3 py-2.5 text-sm text-theme-text focus:outline-none focus:border-theme-accent transition-colors" />
          </div>
          <div>
            <label class="mb-1 block text-[11px] text-theme-text-muted">Max</label>
            <input v-model="nuevaOpcion.precioMaximo" type="number" min="0" step="0.01" placeholder="0.00" class="w-full rounded-xl border border-theme-border bg-theme-input px-3 py-2.5 text-sm text-theme-text focus:outline-none focus:border-theme-accent transition-colors" />
          </div>
        </div>
        <textarea
          v-model="nuevaOpcion.notas"
          rows="2"
          placeholder="Notas (tienda, color, talla, etc.)"
          class="w-full resize-none rounded-xl border border-theme-border bg-theme-input px-4 py-3 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-theme-accent transition-colors"
        ></textarea>
        <p v-if="errorPanel" class="text-xs text-red-400">{{ errorPanel }}</p>
        <button
          class="w-full rounded-xl bg-theme-accent py-3 text-sm font-semibold text-theme-on-accent transition-colors hover:bg-theme-accent-dark disabled:opacity-60"
          :disabled="guardandoInline"
          @click="confirmarNuevaOpcion"
        >
          {{ guardandoInline ? 'Guardando...' : 'Agregar opcion' }}
        </button>
      </div>
    </div>

    <!-- Panel: nuevo detalle -->
    <div v-if="nuevoDetalleCtx" class="fixed inset-0 z-50 flex items-end justify-center">
      <div class="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm" @click="cancelarNuevoDetalle"></div>
      <div class="relative w-full max-w-lg rounded-t-3xl border-t border-theme-border bg-theme-card p-5 pb-8 space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold text-theme-text">Nuevo detalle</h3>
          <button class="text-theme-text-sec hover:text-theme-text transition-colors" @click="cancelarNuevoDetalle">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p class="text-xs text-theme-text-sec">{{ nuevoDetalleCtx.proyecto.tipoGasto }}</p>
        <input
          v-model="nuevoDetalle.nombre"
          type="text"
          placeholder="Nombre del detalle * (ej: CPU, jean, casaca...)"
          class="w-full rounded-xl border border-theme-border bg-theme-input px-4 py-3 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-theme-accent transition-colors"
        />
        <div class="flex gap-1.5">
          <button
            v-for="opt in prioridadOpcionesDetalle"
            :key="opt.value"
            type="button"
            class="flex-1 rounded-lg border px-2 py-2 text-[11px] font-medium transition-all"
            :class="nuevoDetalle.prioridad === opt.value ? opt.activo : 'border-theme-border bg-theme-input text-theme-text-muted'"
            @click="nuevoDetalle.prioridad = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
        <textarea
          v-model="nuevoDetalle.notas"
          rows="2"
          placeholder="Notas del detalle (opcional)"
          class="w-full resize-none rounded-xl border border-theme-border bg-theme-input px-4 py-3 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-theme-accent transition-colors"
        ></textarea>
        <p v-if="errorPanel" class="text-xs text-red-400">{{ errorPanel }}</p>
        <button
          class="w-full rounded-xl bg-theme-accent py-3 text-sm font-semibold text-theme-on-accent transition-colors hover:bg-theme-accent-dark disabled:opacity-60"
          :disabled="guardandoInline"
          @click="confirmarNuevoDetalle"
        >
          {{ guardandoInline ? 'Guardando...' : 'Agregar detalle' }}
        </button>
      </div>
    </div>
    <!-- Modal: decidir opción -->
    <div v-if="decisionCtx" class="fixed inset-0 z-50 flex items-end justify-center">
      <div class="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm" @click="cancelarDecision"></div>
      <div class="relative w-full max-w-lg rounded-t-3xl border-t border-theme-border bg-theme-card p-5 pb-8 space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold text-theme-text">
            {{ decisionCtx.tipo === 'comprar' ? 'Comprar ya' : 'Enviar al planificador' }}
          </h3>
          <button class="text-theme-text-sec hover:text-theme-text transition-colors" @click="cancelarDecision">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p class="text-xs text-theme-text-sec">
          {{ decisionCtx.proyecto.tipoGasto }} › {{ decisionCtx.detalle.nombre }} › <span class="text-theme-text">{{ decisionCtx.opcion.nombre }}</span>
        </p>
        <p class="text-[11px] text-theme-text-muted">
          {{ decisionCtx.tipo === 'comprar'
            ? 'Se registrara como gasto real y el detalle quedara marcado como comprado. Las demas opciones se eliminaran.'
            : 'Se creara un gasto planificado en el mes de la fecha elegida. Las demas opciones se eliminaran.' }}
        </p>
        <div>
          <label class="mb-1 block text-[11px] text-theme-text-muted">Monto *</label>
          <input
            v-model="decisionForm.monto"
            type="number"
            min="0"
            step="0.01"
            class="w-full rounded-xl border border-theme-border bg-theme-input px-4 py-3 text-sm text-theme-text focus:outline-none focus:border-theme-accent transition-colors"
          />
        </div>
        <div>
          <label class="mb-1 block text-[11px] text-theme-text-muted">
            {{ decisionCtx.tipo === 'comprar' ? 'Fecha de compra *' : 'Fecha probable de pago *' }}
          </label>
          <input
            v-model="decisionForm.fecha"
            type="date"
            class="w-full rounded-xl border border-theme-border bg-theme-input px-4 py-3 text-sm text-theme-text focus:outline-none focus:border-theme-accent transition-colors"
          />
        </div>
        <textarea
          v-model="decisionForm.notas"
          rows="2"
          placeholder="Notas (opcional)"
          class="w-full resize-none rounded-xl border border-theme-border bg-theme-input px-4 py-3 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-theme-accent transition-colors"
        ></textarea>
        <p v-if="errorPanel" class="text-xs text-red-400">{{ errorPanel }}</p>
        <button
          class="w-full rounded-xl py-3 text-sm font-semibold text-theme-text transition-colors disabled:opacity-60"
          :class="decisionCtx.tipo === 'comprar' ? 'bg-emerald-500/80 hover:bg-emerald-500' : 'bg-sky-500/80 hover:bg-sky-500'"
          :disabled="decidiendo"
          @click="confirmarDecision"
        >
          {{ decidiendo ? 'Guardando...' : (decisionCtx.tipo === 'comprar' ? 'Registrar compra' : 'Crear gasto planificado') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const emit = defineEmits(['editar'])

const { gastosFuturos, resumenFuturos, updateGastoFuturo, deleteGastoFuturo, decidirOpcionFutura, isLoading } = usePlanificador()
const { currencySymbol, formatMonto } = useCurrency()
const { success, error: toastError } = useToast()

const ahorroPotencial = computed(() => {
  const max = resumenFuturos.value.totalMaximo || 0
  const min = resumenFuturos.value.totalMinimo || 0
  return max > min ? Math.round((max - min + Number.EPSILON) * 100) / 100 : 0
})

const desglose = computed(() => {
  let compradas = 0
  let planificadas = 0
  let pendientes = 0
  for (const proyecto of gastosFuturos.value) {
    for (const detalle of proyecto.detalles || []) {
      if (detalle.estadoDecision === 'comprada') compradas++
      else if (detalle.estadoDecision === 'planificada') planificadas++
      else pendientes++
    }
  }
  return { compradas, planificadas, pendientes }
})

const busqueda = ref('')
const busquedaDebounced = useDebouncedRef(busqueda, 200)
const filtroActual = ref('todos')
const ordenActual = ref('reciente')
const ordenes = [
  { value: 'reciente', label: 'Reciente' },
  { value: 'prom_desc', label: 'Mayor $' },
  { value: 'prom_asc', label: 'Menor $' },
  { value: 'nombre', label: 'Nombre' },
]
const ordenLabel = computed(() => ordenes.find(o => o.value === ordenActual.value)?.label || 'Reciente')
function ciclarOrden() {
  const idx = ordenes.findIndex(o => o.value === ordenActual.value)
  ordenActual.value = ordenes[(idx + 1) % ordenes.length].value
}

function progresoProyecto(proyecto) {
  const total = proyecto.detalles?.length || 0
  if (total === 0) return { total: 0, decididos: 0, porcentaje: 0 }
  const decididos = proyecto.detalles.filter(d => d.estadoDecision).length
  return { total, decididos, porcentaje: Math.round((decididos / total) * 100) }
}

function proyectoTieneDecididos(p) { return p.detalles?.some(d => d.estadoDecision) }
function proyectoCompletamenteDecidido(p) {
  return p.detalles?.length > 0 && p.detalles.every(d => d.estadoDecision)
}

const filtrosProyecto = computed(() => {
  const all = gastosFuturos.value
  const count = (pred) => all.filter(pred).length
  return [
    { value: 'todos', label: 'Todos', count: all.length },
    { value: 'alta', label: 'Alta', count: count(p => p.prioridad === 3), accent: 'bg-red-500 text-white' },
    { value: 'pendientes', label: 'Pendientes', count: count(p => !proyectoCompletamenteDecidido(p)) },
    { value: 'decididos', label: 'Decididos', count: count(proyectoTieneDecididos), accent: 'bg-sky-500 text-white' },
  ]
})

const menuProyectoAbierto = ref(null)
const menuDetalleAbierto = ref(null)
const menuOpcionAbierto = ref(null)
function toggleMenuProyecto(id) {
  menuProyectoAbierto.value = menuProyectoAbierto.value === id ? null : id
  menuDetalleAbierto.value = null
  menuOpcionAbierto.value = null
}
function cerrarMenuProyecto() {
  menuProyectoAbierto.value = null
}
function toggleMenuDetalle(id) {
  menuDetalleAbierto.value = menuDetalleAbierto.value === id ? null : id
  menuProyectoAbierto.value = null
  menuOpcionAbierto.value = null
}
function cerrarMenuDetalle() {
  menuDetalleAbierto.value = null
}
function toggleMenuOpcion(id) {
  menuOpcionAbierto.value = menuOpcionAbierto.value === id ? null : id
  menuProyectoAbierto.value = null
  menuDetalleAbierto.value = null
}
function cerrarMenuOpcion() {
  menuOpcionAbierto.value = null
}
function cerrarTodosMenus() {
  menuProyectoAbierto.value = null
  menuDetalleAbierto.value = null
  menuOpcionAbierto.value = null
}

const expandido = ref({})
// Selección "tap-to-reveal" por detalle: { [detalleId]: opcionId }
const opcionSeleccionadaPorDetalle = ref({})
function seleccionarOpcion(detalleId, opcionId) {
  const actual = opcionSeleccionadaPorDetalle.value[detalleId]
  opcionSeleccionadaPorDetalle.value = {
    ...opcionSeleccionadaPorDetalle.value,
    [detalleId]: actual === opcionId ? null : opcionId,
  }
  // Cualquier cambio de selección cierra el menú · · · de opción
  menuOpcionAbierto.value = null
}
function estaSeleccionada(detalleId, opcionId) {
  return opcionSeleccionadaPorDetalle.value[detalleId] === opcionId
}

function puntoDetalleColor(detalle) {
  if (detalle.estadoDecision === 'comprada') return 'bg-emerald-400'
  if (detalle.estadoDecision === 'planificada') return 'bg-sky-400'
  if (detalle.prioridad === 3) return 'bg-red-400'
  if (detalle.prioridad === 2) return 'bg-amber-400'
  if (detalle.prioridad === 1) return 'bg-emerald-400'
  return 'bg-gray-500'
}
const proyectoAEliminar = ref(null)
const detalleAEliminar = ref(null) // { proyecto, detalle }
const opcionAEliminar = ref(null) // { proyecto, detalle, opcion }
const eliminando = ref(false)
const guardandoInline = ref(false)
const errorPanel = ref('')

const prioridadOpcionesDetalle = [
  { value: 3, label: 'Alta', activo: 'bg-red-500/15 border-red-500/40 text-red-400' },
  { value: 2, label: 'Media', activo: 'bg-amber-500/15 border-amber-500/40 text-amber-300' },
  { value: 1, label: 'Baja', activo: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' },
  { value: 0, label: 'Sin def.', activo: 'bg-theme-input border-theme-border text-theme-text-sec' },
]

// Edición inline de detalle
const detalleEditando = ref(null) // { detalleId, nombre, notas, prioridad }

// Edición inline de opción
const opcionEditando = ref(null) // { opcionId, nombre, referenciaUrl, ... }

// Nuevo detalle
const nuevoDetalleCtx = ref(null) // { proyecto }
const nuevoDetalle = ref({ nombre: '', notas: '', prioridad: 0 })

// Nueva opción
const nuevaOpcionCtx = ref(null) // { proyecto, detalle }
const nuevaOpcion = ref(opcionVacia())

// Decisión de opción
const decisionCtx = ref(null) // { proyecto, detalle, opcion, tipo }
const decisionForm = ref({ monto: '', fecha: '', notas: '' })
const decidiendo = ref(false)

watch(gastosFuturos, (items) => {
  if (!items.length) {
    expandido.value = {}
    opcionSeleccionadaPorDetalle.value = {}
  }
}, { immediate: true })

const gastosFiltrados = computed(() => {
  const term = (busquedaDebounced.value || '').trim().toLowerCase()
  let result = gastosFuturos.value

  // Filtro por prioridad/estado
  if (filtroActual.value === 'alta') result = result.filter(p => p.prioridad === 3)
  else if (filtroActual.value === 'media') result = result.filter(p => p.prioridad === 2)
  else if (filtroActual.value === 'baja') result = result.filter(p => p.prioridad === 1)
  else if (filtroActual.value === 'pendientes') result = result.filter(p => !proyectoCompletamenteDecidido(p))
  else if (filtroActual.value === 'decididos') result = result.filter(proyectoTieneDecididos)

  // Búsqueda
  if (term) {
    result = result.filter((proyecto) => {
      const hayEnProyecto = [proyecto.tipoGasto, proyecto.descripcion, proyecto.categoriaNombre]
        .some(v => (v || '').toLowerCase().includes(term))
      if (hayEnProyecto) return true
      return proyecto.detalles.some(d =>
        (d.nombre || '').toLowerCase().includes(term)
        || (d.notas || '').toLowerCase().includes(term)
        || d.opciones.some(o =>
          (o.nombre || '').toLowerCase().includes(term)
          || (o.notas || '').toLowerCase().includes(term)
          || (o.referenciaUrl || '').toLowerCase().includes(term)
        )
      )
    })
  }

  // Ordenamiento — la prioridad siempre manda (alta > media > baja > sin def.)
  // y el modo elegido por el usuario actúa como criterio secundario.
  const sorted = [...result]
  const cmpPrioridad = (a, b) => (b.prioridad ?? 0) - (a.prioridad ?? 0)
  let cmpSecundario
  if (ordenActual.value === 'prom_desc') {
    cmpSecundario = (a, b) => (b.resumen?.totalPromedio || 0) - (a.resumen?.totalPromedio || 0)
  } else if (ordenActual.value === 'prom_asc') {
    cmpSecundario = (a, b) => (a.resumen?.totalPromedio || 0) - (b.resumen?.totalPromedio || 0)
  } else if (ordenActual.value === 'nombre') {
    cmpSecundario = (a, b) => (a.tipoGasto || '').localeCompare(b.tipoGasto || '')
  } else {
    // 'reciente'
    cmpSecundario = (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
  }
  sorted.sort((a, b) => cmpPrioridad(a, b) || cmpSecundario(a, b))
  return sorted
})

function toggleExpandido(id) {
  expandido.value = { ...expandido.value, [id]: !expandido.value[id] }
}

function estaExpandido(id) {
  return !!expandido.value[id]
}

const { rankearOpciones: rankearOpcionesHelper } = useOpcionesScoring()
// `rankearOpciones` se usa SOLO para identificar la mejor opción
// (badge visual). NO reordena el array — eso preservaría la
// flecha "subir/bajar" del usuario.
function esMejorOpcion(detalle, opcion) {
  const opciones = detalle?.opciones
  if (!Array.isArray(opciones) || opciones.length < 2) return false
  const ranked = rankearOpcionesHelper(opciones)
  if (!ranked.length) return false
  return ranked[0]?.id === opcion?.id
}

function prioridadBadge(valor) {
  switch (valor) {
    case 3: return { label: '● Alta', clases: 'bg-red-500/15 text-red-400' }
    case 2: return { label: '● Media', clases: 'bg-amber-500/15 text-amber-300' }
    case 1: return { label: '● Baja', clases: 'bg-emerald-500/15 text-emerald-400' }
    default: return null
  }
}

function hostDeUrl(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return 'Abrir enlace' }
}

function opcionVacia() {
  return { nombre: '', referenciaUrl: '', imagenUrl: '', precioMinimo: '', precioPromedio: '', precioMaximo: '', notas: '' }
}

function parseAmount(value) {
  if (value === '' || value === null || value === undefined) return null
  const n = Number(value)
  return Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : null
}

function opcionToPayload(o) {
  return {
    nombre: o.nombre,
    referenciaUrl: o.referenciaUrl || null,
    imagenUrl: o.imagenUrl || null,
    precioMinimo: o.precioMinimo ?? null,
    precioPromedio: o.precioPromedio ?? null,
    precioMaximo: o.precioMaximo ?? null,
    notas: o.notas || null,
  }
}

// Construye el payload completo del proyecto con detalles/opciones sobreescritos según necesidad
function buildPayload(proyecto, overrides = {}) {
  return {
    categoriaId: proyecto.categoriaId,
    tipoGasto: proyecto.tipoGasto,
    descripcion: proyecto.descripcion,
    prioridad: proyecto.prioridad ?? 0,
    detalles: (overrides.detalles ?? proyecto.detalles).map(d => {
      const detalleOverride = overrides.detalleId === d.id ? overrides : null
      const useOverrideOpciones = overrides.opcionesDetalleId && d.id && overrides.opcionesDetalleId === d.id
      return {
        id: d.id,
        nombre: detalleOverride?.nombre ?? d.nombre,
        notas: detalleOverride?.notas ?? d.notas ?? null,
        prioridad: detalleOverride?.prioridad ?? d.prioridad ?? 0,
        opciones: (useOverrideOpciones ? overrides.opciones : (d.opciones || [])).map(opcionToPayload),
      }
    }),
  }
}

// ── Detalle: editar ──────────────────────────────────────────────
function iniciarEdicionDetalle(detalle) {
  opcionEditando.value = null
  detalleEditando.value = { detalleId: detalle.id, nombre: detalle.nombre, notas: detalle.notas || '', prioridad: detalle.prioridad ?? 0 }
}

function cancelarEdicionDetalle() {
  detalleEditando.value = null
}

async function guardarEdicionDetalle(proyecto, detalle) {
  const nombre = detalleEditando.value.nombre.trim()
  if (!nombre) { toastError('El nombre del detalle es obligatorio'); return }

  guardandoInline.value = true
  try {
    await updateGastoFuturo(proyecto.id, buildPayload(proyecto, {
      detalleId: detalle.id,
      nombre,
      notas: detalleEditando.value.notas.trim() || null,
      prioridad: detalleEditando.value.prioridad ?? 0,
    }))
    detalleEditando.value = null
    success('Detalle actualizado')
  } catch (e) {
    toastError(e?.data?.message || e?.message || 'No se pudo guardar')
  } finally {
    guardandoInline.value = false
  }
}

// ── Detalle: eliminar ────────────────────────────────────────────
function eliminarDetalleInline(proyecto, detalle) {
  if (proyecto.detalles.length <= 1) {
    toastError('El proyecto debe tener al menos un detalle')
    return
  }
  detalleAEliminar.value = { proyecto, detalle }
}

async function confirmarEliminarDetalle() {
  if (!detalleAEliminar.value) return
  const { proyecto, detalle } = detalleAEliminar.value
  guardandoInline.value = true
  try {
    await updateGastoFuturo(proyecto.id, buildPayload(proyecto, {
      detalles: proyecto.detalles.filter(d => d.id !== detalle.id),
    }))
    success('Detalle eliminado')
    detalleAEliminar.value = null
  } catch (e) {
    toastError(e?.data?.message || e?.message || 'No se pudo eliminar')
  } finally {
    guardandoInline.value = false
  }
}

// ── Detalle: nuevo ───────────────────────────────────────────────
function abrirNuevoDetalle(proyecto) {
  nuevoDetalleCtx.value = { proyecto }
  nuevoDetalle.value = { nombre: '', notas: '', prioridad: 0 }
  errorPanel.value = ''
}

function cancelarNuevoDetalle() {
  nuevoDetalleCtx.value = null
  errorPanel.value = ''
}

async function confirmarNuevoDetalle() {
  const nombre = nuevoDetalle.value.nombre.trim()
  if (!nombre) { errorPanel.value = 'El nombre del detalle es obligatorio'; return }

  const { proyecto } = nuevoDetalleCtx.value
  const detalleNuevo = { nombre, notas: nuevoDetalle.value.notas.trim() || null, prioridad: nuevoDetalle.value.prioridad ?? 0, opciones: [] }

  guardandoInline.value = true
  errorPanel.value = ''
  try {
    await updateGastoFuturo(proyecto.id, buildPayload(proyecto, {
      detalles: [...proyecto.detalles, detalleNuevo],
    }))
    nuevoDetalleCtx.value = null
    success('Detalle agregado')
  } catch (e) {
    errorPanel.value = e?.data?.message || e?.message || 'No se pudo agregar'
  } finally {
    guardandoInline.value = false
  }
}

// ── Opción: reordenar ────────────────────────────────────────────
async function moverOpcion(proyecto, detalle, opcion, direction) {
  const idx = detalle.opciones.indexOf(opcion)
  const newIdx = idx + direction
  if (newIdx < 0 || newIdx >= detalle.opciones.length) return

  const reordered = [...detalle.opciones]
  ;[reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]]

  guardandoInline.value = true
  try {
    await updateGastoFuturo(proyecto.id, buildPayload(proyecto, {
      opcionesDetalleId: detalle.id,
      opciones: reordered.map(opcionToPayload),
    }))
  } catch (e) {
    toastError(e?.data?.message || e?.message || 'No se pudo reordenar')
  } finally {
    guardandoInline.value = false
  }
}

// ── Opción: editar ───────────────────────────────────────────────
function iniciarEdicionOpcion(opcion) {
  detalleEditando.value = null
  opcionEditando.value = {
    opcionId: opcion.id,
    nombre: opcion.nombre,
    referenciaUrl: opcion.referenciaUrl || '',
    imagenUrl: opcion.imagenUrl || '',
    precioMinimo: opcion.precioMinimo ?? '',
    precioPromedio: opcion.precioPromedio ?? '',
    precioMaximo: opcion.precioMaximo ?? '',
    notas: opcion.notas || '',
  }
}

function cancelarEdicionOpcion() {
  opcionEditando.value = null
}

async function guardarEdicionOpcion(proyecto, detalle) {
  const nombre = opcionEditando.value.nombre.trim()
  if (!nombre) { toastError('El nombre de la opcion es obligatorio'); return }

  const opcionActualizada = {
    nombre,
    referenciaUrl: opcionEditando.value.referenciaUrl.trim() || null,
    imagenUrl: opcionEditando.value.imagenUrl.trim() || null,
    precioMinimo: parseAmount(opcionEditando.value.precioMinimo),
    precioPromedio: parseAmount(opcionEditando.value.precioPromedio),
    precioMaximo: parseAmount(opcionEditando.value.precioMaximo),
    notas: opcionEditando.value.notas.trim() || null,
  }

  const nuevasOpciones = detalle.opciones.map(o =>
    o.id === opcionEditando.value.opcionId ? opcionActualizada : opcionToPayload(o)
  )

  guardandoInline.value = true
  try {
    await updateGastoFuturo(proyecto.id, buildPayload(proyecto, {
      opcionesDetalleId: detalle.id,
      opciones: nuevasOpciones,
    }))
    opcionEditando.value = null
    success('Opcion actualizada')
  } catch (e) {
    toastError(e?.data?.message || e?.message || 'No se pudo guardar')
  } finally {
    guardandoInline.value = false
  }
}

// ── Opción: eliminar ─────────────────────────────────────────────
function eliminarOpcionInline(proyecto, detalle, opcion) {
  opcionAEliminar.value = { proyecto, detalle, opcion }
}

async function confirmarEliminarOpcion() {
  if (!opcionAEliminar.value) return
  const { proyecto, detalle, opcion } = opcionAEliminar.value
  const nuevasOpciones = detalle.opciones.filter(o => o.id !== opcion.id).map(opcionToPayload)

  guardandoInline.value = true
  try {
    await updateGastoFuturo(proyecto.id, buildPayload(proyecto, {
      opcionesDetalleId: detalle.id,
      opciones: nuevasOpciones,
    }))
    success('Opcion eliminada')
    opcionAEliminar.value = null
  } catch (e) {
    toastError(e?.data?.message || e?.message || 'No se pudo eliminar')
  } finally {
    guardandoInline.value = false
  }
}

// ── Opción: nueva ────────────────────────────────────────────────
function abrirNuevaOpcion(proyecto, detalle) {
  nuevaOpcionCtx.value = { proyecto, detalle }
  nuevaOpcion.value = opcionVacia()
  errorPanel.value = ''
}

function cancelarNuevaOpcion() {
  nuevaOpcionCtx.value = null
  errorPanel.value = ''
}

async function confirmarNuevaOpcion() {
  const nombre = nuevaOpcion.value.nombre.trim()
  if (!nombre) { errorPanel.value = 'El nombre de la opcion es obligatorio'; return }

  const { proyecto, detalle } = nuevaOpcionCtx.value
  const opcionNueva = {
    nombre,
    referenciaUrl: nuevaOpcion.value.referenciaUrl.trim() || null,
    imagenUrl: nuevaOpcion.value.imagenUrl.trim() || null,
    precioMinimo: parseAmount(nuevaOpcion.value.precioMinimo),
    precioPromedio: parseAmount(nuevaOpcion.value.precioPromedio),
    precioMaximo: parseAmount(nuevaOpcion.value.precioMaximo),
    notas: nuevaOpcion.value.notas.trim() || null,
  }

  guardandoInline.value = true
  errorPanel.value = ''
  try {
    await updateGastoFuturo(proyecto.id, buildPayload(proyecto, {
      opcionesDetalleId: detalle.id,
      opciones: [...detalle.opciones.map(opcionToPayload), opcionNueva],
    }))
    nuevaOpcionCtx.value = null
    success('Opcion agregada')
  } catch (e) {
    errorPanel.value = e?.data?.message || e?.message || 'No se pudo agregar'
  } finally {
    guardandoInline.value = false
  }
}

// ── Decisión de opción ───────────────────────────────────────────
function abrirDecision(proyecto, detalle, opcion, tipo) {
  const { fechaHoy } = useFechaPeru()
  const hoy = fechaHoy()
  decisionCtx.value = { proyecto, detalle, opcion, tipo }
  decisionForm.value = {
    monto: opcion.precioPromedio ?? opcion.precioMinimo ?? opcion.precioMaximo ?? '',
    fecha: hoy,
    notas: '',
  }
  errorPanel.value = ''
}

function cancelarDecision() {
  decisionCtx.value = null
  errorPanel.value = ''
}

async function confirmarDecision() {
  const ctx = decisionCtx.value
  if (!ctx) return
  const monto = parseAmount(decisionForm.value.monto)
  if (!monto || monto <= 0) { errorPanel.value = 'El monto debe ser mayor a 0'; return }
  if (!decisionForm.value.fecha) { errorPanel.value = 'La fecha es obligatoria'; return }

  decidiendo.value = true
  errorPanel.value = ''
  try {
    await decidirOpcionFutura(ctx.proyecto.id, ctx.detalle.id, {
      tipo: ctx.tipo,
      opcionId: ctx.opcion.id,
      monto,
      fecha: decisionForm.value.fecha,
      notas: decisionForm.value.notas.trim() || null,
    })
    success(ctx.tipo === 'comprar' ? 'Opcion comprada y registrada' : 'Opcion planificada')
    decisionCtx.value = null
  } catch (e) {
    errorPanel.value = e?.data?.message || e?.message || 'No se pudo decidir'
  } finally {
    decidiendo.value = false
  }
}

function detallesOrdenados(detalles) {
  return [...detalles].sort((a, b) => {
    const dp = (b.prioridad ?? 0) - (a.prioridad ?? 0)
    if (dp !== 0) return dp
    const dorden = (a.orden ?? 0) - (b.orden ?? 0)
    if (dorden !== 0) return dorden
    return new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
  })
}

function decisionBadge(detalle) {
  if (detalle.estadoDecision === 'comprada') return { label: 'Elegida · Comprada', clases: 'bg-emerald-500/15 text-emerald-400' }
  if (detalle.estadoDecision === 'planificada') return { label: 'Elegida · Planificada', clases: 'bg-sky-500/15 text-sky-300' }
  return null
}

// ── Proyecto: eliminar ───────────────────────────────────────────
async function confirmarEliminar() {
  if (!proyectoAEliminar.value) return
  eliminando.value = true
  try {
    await deleteGastoFuturo(proyectoAEliminar.value.id)
    success('Gasto futuro eliminado')
    proyectoAEliminar.value = null
  } catch (e) {
    toastError(e?.data?.message || e?.message || 'No se pudo eliminar el gasto futuro')
  } finally {
    eliminando.value = false
  }
}
</script>
