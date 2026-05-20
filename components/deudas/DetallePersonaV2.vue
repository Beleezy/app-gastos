<!--
  DetallePersonaV2 — rediseño del detalle de una persona en /deudas.

  Cambios clave respecto a V1 (DetallePersona.vue):
    • Header limpio: avatar 64px + nombre + badge vinculado + total hero
      grande, todo en una card con color contextual.
    • CTA primario "Registrar pago global" siempre visible cuando hay
      pendientes (V1 lo escondía al final del card).
    • Acciones de persona (compartir/vincular/editar/eliminar) en una
      sola fila de chips de 44px (V1 usaba 4 botones diminutos w-10).

  El resto del componente (lista de deudas, stats, pagos, vínculo) se
  conserva con los sub-componentes existentes para no duplicar lógica.

  Mismos emits que V1: registrarPago, agregarDeuda, editarDeuda, pagoGlobal.
-->
<template>
  <div ref="detalleRoot" class="px-4 py-3" data-testid="detalle-persona-v2">
    <!-- Back + header card -->
    <div class="mb-4">
      <button
        class="inline-flex items-center gap-1.5 text-theme-text-muted text-sm mb-3 active:text-theme-text transition-colors tap-44"
        @click="volverALista"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Volver
      </button>

      <div
        class="relative rounded-3xl border p-5 overflow-hidden"
        :class="tabActual === 'me_deben'
          ? 'bg-gradient-to-br from-theme-card to-emerald-500/[0.06] border-emerald-500/20'
          : 'bg-gradient-to-br from-theme-card to-red-500/[0.06] border-red-500/20'"
      >
        <div
          class="absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl pointer-events-none"
          :class="tabActual === 'me_deben' ? 'bg-emerald-500/10' : 'bg-red-500/10'"
        ></div>

        <!-- Persona row -->
        <div class="relative flex items-start gap-4 mb-4">
          <div
            class="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 text-2xl font-bold"
            :class="tabActual === 'me_deben' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'"
          >{{ getInitials(personaSeleccionada.nombre) }}</div>
          <div class="flex-1 min-w-0">
            <h2 class="text-xl font-bold text-theme-text break-words">{{ personaSeleccionada.nombre }}</h2>
            <p v-if="personaSeleccionada.contacto" class="text-sm text-theme-text-muted truncate mt-0.5">{{ personaSeleccionada.contacto }}</p>
            <span
              v-if="personaSeleccionada.vinculadoUsuarioId"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-theme-accent-bg text-theme-accent text-[11px] font-bold mt-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Vinculado
            </span>
          </div>
        </div>

        <!-- Hero total -->
        <div class="relative">
          <p class="text-hero-label">{{ tabActual === 'me_deben' ? 'Te debe en total' : 'Le debes en total' }}</p>
          <div class="flex items-baseline gap-1 mt-1.5">
            <span class="text-xl font-medium text-theme-text-muted">{{ currencySymbol }}</span>
            <span
              class="text-hero tabular-nums"
              :class="tabActual === 'me_deben' ? 'text-emerald-400' : 'text-red-400'"
            >{{ formatMonto(totalPendientePersona) }}</span>
          </div>
          <p class="text-sm text-theme-text-sec mt-1">
            en <strong class="text-theme-text font-semibold">{{ deudasActivasPersona.length }}</strong>
            {{ deudasActivasPersona.length === 1 ? 'deuda activa' : 'deudas activas' }}
          </p>
        </div>

        <!-- Progress bar -->
        <div v-if="totalOriginalPersona > 0" class="relative mt-4">
          <div class="w-full h-2 bg-theme-input rounded-full overflow-hidden">
            <div
              class="h-full rounded-full bg-gradient-to-r from-theme-accent to-emerald-400 transition-all duration-500"
              :style="{ width: porcentajeCobradoPersona + '%' }"
            ></div>
          </div>
          <div class="flex items-center justify-between mt-1.5">
            <span class="text-[11px] text-theme-text-muted">
              {{ currencySymbol }} {{ formatMonto(totalCobradoPersona) }} {{ tabActual === 'me_deben' ? 'cobrado' : 'pagado' }}
            </span>
            <span class="text-[11px] font-bold tabular-nums"
              :class="porcentajeCobradoPersona > 70 ? 'text-emerald-400' : 'text-theme-accent'"
            >{{ porcentajeCobradoPersona.toFixed(0) }}%</span>
          </div>
        </div>

        <!-- CTA primario -->
        <button
          v-if="deudasActivasPersona.length > 1 && totalPendientePersona > 0"
          class="relative w-full mt-4 h-14 rounded-2xl bg-theme-accent text-theme-on-accent font-bold text-base flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-md shadow-theme-accent/20 tap-44"
          @click="emit('pagoGlobal')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Registrar pago global
        </button>
      </div>

      <!-- Acciones persona (chips 44px) -->
      <div class="flex flex-wrap gap-2 mt-3">
        <SharedExportButton
          v-if="formatosCompartir.length > 0"
          :formats="formatosCompartir"
          label="Compartir"
          align="left"
          :loading="generandoHistorial"
          @select="onCompartir"
        />
        <button
          v-if="!personaSeleccionada.vinculadoUsuarioId"
          class="inline-flex items-center gap-1.5 px-3 h-11 rounded-xl bg-theme-card border border-theme-border text-theme-text-sec text-sm font-medium hover:text-theme-accent hover:border-theme-accent/30 active:scale-95 transition-all tap-44"
          @click="showSolicitudVinculo = true"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Vincular
        </button>
        <button
          v-if="personaSeleccionada.vinculadoUsuarioId"
          class="inline-flex items-center gap-1.5 px-3 h-11 rounded-xl bg-theme-card border border-theme-border text-theme-text-sec text-sm font-medium hover:text-orange-400 active:scale-95 transition-all tap-44"
          @click="showDesvincular = true"
        >
          Desvincular
        </button>
        <button
          class="inline-flex items-center gap-1.5 px-3 h-11 rounded-xl bg-theme-card border border-theme-border text-theme-text-sec text-sm font-medium hover:text-amber-400 hover:border-amber-500/30 active:scale-95 transition-all tap-44"
          @click="showEditarPersona = true"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Editar
        </button>
        <button
          class="ml-auto inline-flex items-center justify-center w-11 h-11 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 active:scale-95 transition-all tap-44"
          aria-label="Eliminar persona"
          @click="confirmarEliminarPersona"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Stats: usamos sub-componente existente -->
    <DeudasStatsPersona v-if="!isLoading" :deudas-activas="deudasActivasPersona" :tab-actual="tabActual" />

    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 2" :key="i" class="bg-theme-card rounded-2xl p-4 animate-pulse">
        <div class="space-y-2">
          <div class="h-4 bg-theme-border-md rounded w-3/4"></div>
          <div class="h-3 bg-theme-border-md rounded w-1/2"></div>
        </div>
      </div>
    </div>

    <template v-else>
      <!-- Deudas activas -->
      <div v-if="deudasActivasPersona.length > 0" class="mb-5">
        <div class="flex items-center gap-2 mb-3">
          <span class="w-1.5 h-1.5 rounded-full" :class="tabActual === 'me_deben' ? 'bg-emerald-400' : 'bg-red-400'"></span>
          <h3 class="text-sm font-bold text-theme-text uppercase tracking-wider">Pendientes</h3>
          <span class="text-xs text-theme-text-muted ml-auto">{{ deudasActivasPersona.length }}</span>
        </div>

        <div
          v-for="deuda in deudasActivasPersona"
          :key="deuda.id"
          class="bg-theme-card rounded-2xl p-4 mb-2.5 border border-theme-border"
          data-testid="deuda-item"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0">
              <p class="text-base font-semibold text-theme-text">{{ deuda.concepto }}</p>
              <p class="text-xs text-theme-text-muted mt-0.5">{{ formatFecha(deuda.fechaCreacion) }} · {{ formatRelativo(deuda.fechaCreacion) }}</p>
              <div v-if="deuda.fechaPago" class="flex items-center gap-1.5 mt-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" :class="esVencida(deuda) ? 'text-red-400' : 'text-theme-accent'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p class="text-xs font-medium" :class="esVencida(deuda) ? 'text-red-400' : 'text-theme-accent'">
                  {{ esVencida(deuda) ? 'Venció:' : 'Pago:' }} {{ formatFecha(deuda.fechaPago) }}
                </p>
              </div>
              <p v-if="deuda.notas" class="text-xs text-theme-text-muted italic mt-1">{{ deuda.notas }}</p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-base font-bold text-theme-text tabular-nums">{{ currencySymbol }} {{ formatMonto(deuda.montoOriginal) }}</p>
              <p v-if="deuda.estado === 'parcial'" class="text-[11px] text-orange-400 mt-0.5 tabular-nums">
                Pend: {{ currencySymbol }} {{ formatMonto(deuda.montoPendiente) }}
              </p>
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold mt-1"
                :class="esVencida(deuda) ? 'bg-red-500/15 text-red-400' : deuda.estado === 'parcial' ? 'bg-orange-500/15 text-orange-400' : 'bg-amber-500/15 text-amber-400'"
              >
                {{ esVencida(deuda) ? 'Vencida' : deuda.estado === 'parcial' ? 'Parcial' : 'Pendiente' }}
              </span>
            </div>
          </div>

          <div v-if="deuda.montoOriginal !== deuda.montoPendiente" class="mt-2.5">
            <div class="w-full h-1.5 bg-theme-input rounded-full overflow-hidden">
              <div
                class="h-full rounded-full bg-gradient-to-r from-theme-accent to-theme-accent transition-all duration-500"
                :style="{ width: ((1 - deuda.montoPendiente / deuda.montoOriginal) * 100) + '%' }"
              ></div>
            </div>
            <p class="text-[11px] text-theme-text-muted mt-1">
              {{ ((1 - deuda.montoPendiente / deuda.montoOriginal) * 100).toFixed(0) }}% pagado
            </p>
          </div>

          <div class="flex items-center gap-1.5 mt-3 pt-3 border-t border-theme-border">
            <button
              class="inline-flex items-center gap-1.5 px-3 h-11 rounded-xl text-xs font-semibold text-theme-accent bg-theme-accent-bg hover:bg-theme-accent-bg-hover active:scale-95 transition-all tap-44"
              data-testid="btn-nuevo-pago"
              @click="emit('registrarPago', deuda)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Pago
            </button>
            <button
              class="inline-flex items-center gap-1.5 px-3 h-11 rounded-xl text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 transition-all tap-44"
              @click="confirmarSaldar(deuda)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Saldar
            </button>
            <button
              class="ml-auto inline-flex items-center justify-center w-11 h-11 rounded-xl text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 transition-all tap-44"
              aria-label="Editar deuda"
              data-testid="btn-editar-deuda"
              @click="emit('editarDeuda', deuda)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              class="inline-flex items-center justify-center w-11 h-11 rounded-xl text-red-400 bg-red-500/10 hover:bg-red-500/20 active:scale-95 transition-all tap-44"
              data-testid="btn-eliminar-deuda"
              aria-label="Eliminar deuda"
              @click="confirmarEliminarDeuda(deuda)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Gráfico de evolución -->
      <DeudasGraficoEvolucionDeuda
        :pagos="pagosPersona"
        :monto-original-total="deudasPersona.reduce((s, d) => s + d.montoOriginal, 0)"
        :monto-actual="totalPendientePersona"
        :color="tabActual === 'me_deben' ? '#10b981' : '#ef4444'"
      />

      <DeudasHistorialPagosPersona :pagos="pagosPersona" />

      <!-- Saldadas -->
      <button
        v-if="deudasSaldadasPersona.length > 0"
        class="w-full mt-3 mb-3 bg-theme-card rounded-2xl border border-theme-border p-4 flex items-center gap-2 text-sm font-medium text-theme-text-sec hover:bg-theme-card-hover active:bg-theme-card-hover transition-colors tap-44"
        @click="showSaldadasModal = true"
      >
        <span class="w-2 h-2 rounded-full bg-gray-500"></span>
        <span class="uppercase tracking-wider text-theme-text-muted text-xs font-bold">Saldadas</span>
        <span class="text-theme-text-muted text-xs">{{ deudasSaldadasPersona.length }}</span>
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 ml-auto text-theme-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <!-- Vínculo (sub-componente existente) -->
      <div v-if="personaSeleccionada.vinculadoUsuarioId" class="mb-5">
        <div class="flex items-center gap-2 mb-3">
          <span class="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
          <h3 class="text-sm font-bold text-theme-text uppercase tracking-wider">Vínculo</h3>
        </div>
        <div class="bg-theme-card rounded-2xl border border-theme-border overflow-hidden">
          <div v-if="puntoActual" class="p-4 border-b border-theme-border">
            <div class="flex items-center gap-2 mb-1.5">
              <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400">Actual</span>
              <span class="text-[11px] text-theme-text-muted">{{ formatFechaHoraCheckpoint(puntoActual.createdAt) }}</span>
            </div>
            <p class="text-sm font-medium text-theme-text break-words">
              {{ puntoActual.descripcion || 'Punto de guardado' }}
            </p>
          </div>
          <div v-else class="p-4 border-b border-theme-border">
            <p class="text-sm text-theme-text-muted">Aún no hay punto de guardado</p>
          </div>
          <div class="grid grid-cols-2 divide-x divide-theme-border">
            <button
              class="flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-violet-400 hover:bg-violet-500/10 active:bg-violet-500/20 tap-44 transition-colors"
              @click="showCheckpointsModal = true"
            >Puntos · {{ checkpoints.length }}</button>
            <button
              class="flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-purple-400 hover:bg-purple-500/10 active:bg-purple-500/20 tap-44 transition-colors"
              @click="showAuditoriaModal = true"
            >Auditoría · {{ auditoriaPersona.length }}</button>
          </div>
        </div>
      </div>

      <div v-if="deudasActivasPersona.length === 0 && deudasSaldadasPersona.length === 0" class="text-center py-10">
        <p class="text-theme-text-sec text-base">No hay deudas registradas</p>
        <p class="text-theme-text-muted text-sm mt-1">Agrega una con el botón +</p>
      </div>

      <div class="h-16"></div>
    </template>

    <!-- Modales (heredamos los de V1) -->
    <SharedBaseBottomSheet v-if="showSaldadasModal" title="Deudas saldadas" @close="showSaldadasModal = false">
      <div v-for="deuda in deudasSaldadasPersona" :key="deuda.id" class="bg-theme-card rounded-xl p-3.5 mb-2 border border-theme-border opacity-80">
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-theme-text-muted line-through">{{ deuda.concepto }}</p>
            <p class="text-xs text-theme-text-muted mt-0.5">{{ formatFecha(deuda.fechaCreacion) }}</p>
          </div>
          <div class="text-right shrink-0 ml-3">
            <p class="text-sm font-semibold text-theme-text-sec">{{ currencySymbol }} {{ formatMonto(deuda.montoOriginal) }}</p>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold mt-1 bg-emerald-500/15 text-emerald-400">
              {{ deuda.estado === 'archivado' ? 'Archivada' : 'Pagada' }}
            </span>
          </div>
        </div>
      </div>
    </SharedBaseBottomSheet>

    <SharedBaseBottomSheet v-if="showCheckpointsModal" title="Puntos de guardado" @close="showCheckpointsModal = false">
      <DeudasCheckpointsVinculo :persona-id="personaSeleccionada.id" embedded @restaurado="onCheckpointRestaurado" @creado="onCheckpointCreado" />
    </SharedBaseBottomSheet>

    <SharedBaseBottomSheet v-if="showAuditoriaModal" title="Auditoría del vínculo" @close="showAuditoriaModal = false">
      <DeudasAuditoriaVinculo :persona-id="personaSeleccionada.id" :auditoria="auditoriaPersona" embedded />
    </SharedBaseBottomSheet>

    <DeudasSolicitudVinculo
      v-if="showSolicitudVinculo"
      :persona-entidad-id="personaSeleccionada.id"
      :persona-nombre="personaSeleccionada.nombre"
      @close="showSolicitudVinculo = false"
      @enviada="showSolicitudVinculo = false"
    />

    <DeudasFormEditarPersona
      v-if="showEditarPersona"
      :persona="personaSeleccionada"
      @close="showEditarPersona = false"
      @saved="onPersonaEditada"
    />

    <SharedConfirmDialog
      v-model="showSaldarConfirm"
      title="Saldar deuda"
      :message="`¿Registrar pago de ${currencySymbol} ${formatMonto(deudaParaAccion?.montoPendiente)} y marcar como pagada?`"
      confirm-label="Saldar deuda"
      variant="success"
      :loading="procesandoAccion"
      @confirm="ejecutarSaldar"
    />

    <SharedConfirmDialog
      v-model="showEliminarDeudaConfirm"
      title="Eliminar deuda"
      :message="`¿Eliminar '${deudaParaAccion?.concepto}'? Esta acción no se puede deshacer.`"
      confirm-label="Eliminar"
      variant="danger"
      :loading="procesandoAccion"
      @confirm="ejecutarEliminarDeuda"
    />

    <div v-if="showDesvincular" class="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div class="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm" @click="showDesvincular = false"></div>
      <div class="relative bg-theme-card rounded-2xl p-5 w-full max-w-sm border border-theme-border">
        <h3 class="text-base font-semibold text-theme-text mb-2">Desvincular usuario</h3>
        <p class="text-sm text-theme-text-muted mb-2">El vínculo con <span class="text-theme-text font-medium">{{ personaSeleccionada.nombre }}</span> se disolverá.</p>
        <ul class="text-xs text-theme-text-sec space-y-1 mb-5 list-disc pl-4">
          <li>Tus deudas y pagos se mantienen intactos</li>
          <li>Los datos del otro usuario también se conservan</li>
        </ul>
        <div class="space-y-2">
          <button class="w-full py-3 rounded-xl bg-orange-500/15 text-orange-400 text-sm font-medium hover:bg-orange-500/25 transition-colors disabled:opacity-50 tap-44" :disabled="desvinculando" @click="ejecutarDesvincular">
            {{ desvinculando ? 'Desvinculando...' : 'Confirmar desvincular' }}
          </button>
          <button class="w-full py-3 rounded-xl text-theme-text-sec text-sm font-medium tap-44" @click="showDesvincular = false">Cancelar</button>
        </div>
      </div>
    </div>

    <div v-if="showDeletePersona" class="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div class="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm" @click="showDeletePersona = false"></div>
      <div class="relative bg-theme-card rounded-2xl p-5 w-full max-w-sm border border-theme-border">
        <h3 class="text-base font-semibold text-theme-text mb-2">Eliminar persona</h3>
        <p class="text-sm text-theme-text-muted mb-5">Se eliminaran todas las deudas y pagos asociados a <span class="text-theme-text font-medium">{{ personaSeleccionada.nombre }}</span>.</p>
        <div class="space-y-2">
          <button class="w-full py-3 rounded-xl bg-red-500/15 text-red-400 text-sm font-medium hover:bg-red-500/25 transition-colors tap-44" @click="ejecutarEliminarPersona">
            Eliminar todo
          </button>
          <button class="w-full py-3 rounded-xl text-theme-text-sec text-sm font-medium tap-44" @click="showDeletePersona = false">Cancelar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { getInitials } from '~/utils/constants'

const emit = defineEmits(['registrarPago', 'agregarDeuda', 'editarDeuda', 'pagoGlobal'])

const {
  tabActual, personaSeleccionada,
  deudasPersona, deudasActivasPersona, deudasSaldadasPersona,
  totalPendientePersona, isLoading,
  volverALista, deleteDeuda, archivarDeuda, deletePersona,
  registrarPago, pagosPersona, auditoriaPersona,
  desvincularPersona, fetchAuditoriaPersona,
  checkpoints, fetchCheckpoints,
} = useDeudas()

const puntoActual = computed(() => (checkpoints.value || []).find(c => c.tipo === 'actual'))

const todasDeudasPersona = computed(() => [
  ...(deudasActivasPersona.value || []),
  ...(deudasSaldadasPersona.value || []),
])
const totalOriginalPersona = computed(() => todasDeudasPersona.value.reduce((s, d) => s + d.montoOriginal, 0))
const totalCobradoPersona = computed(() => todasDeudasPersona.value.reduce((s, d) => s + (d.montoOriginal - d.montoPendiente), 0))
const porcentajeCobradoPersona = computed(() => totalOriginalPersona.value > 0 ? (totalCobradoPersona.value / totalOriginalPersona.value) * 100 : 0)

function formatFechaHoraCheckpoint(fechaStr) {
  if (!fechaStr) return ''
  const d = new Date(fechaStr)
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const hora = d.getHours().toString().padStart(2, '0')
  const min = d.getMinutes().toString().padStart(2, '0')
  return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}, ${hora}:${min}`
}

const { descargarPdf, compartirWhatsapp } = useDeudaPdf()

const showSaldadasModal = ref(false)
const showDeletePersona = ref(false)
const showEditarPersona = ref(false)
const showSolicitudVinculo = ref(false)
const showDesvincular = ref(false)
const showCheckpointsModal = ref(false)
const showAuditoriaModal = ref(false)

useOverlayBack(showDesvincular, () => { showDesvincular.value = false })
useOverlayBack(showDeletePersona, () => { showDeletePersona.value = false })

const showSaldarConfirm = ref(false)
const showEliminarDeudaConfirm = ref(false)
const deudaParaAccion = ref(null)
const procesandoAccion = ref(false)
const desvinculando = ref(false)

watch(() => personaSeleccionada.value?.id, (newId) => {
  if (newId && personaSeleccionada.value?.vinculadoUsuarioId) {
    fetchAuditoriaPersona(newId)
    fetchCheckpoints(newId)
  }
}, { immediate: true })

const { fechaHoy: fechaHoyPeru } = useFechaPeru()
const hoy = fechaHoyPeru()
function esVencida(d) { return !!d.fechaPago && d.fechaPago < hoy }

const formatosCompartir = computed(() => {
  const tienePendientes = tabActual.value === 'me_deben' && totalPendientePersona.value > 0
  const tieneAlguna = (deudasActivasPersona.value.length + deudasSaldadasPersona.value.length) > 0
  const formatos = []
  if (tienePendientes) formatos.push('pdf', 'excel', 'csv', 'whatsapp')
  if (tieneAlguna) formatos.push('historial-pdf')
  return formatos
})

const exportandoFormato = ref(false)
const generandoHistorial = ref(false)
const { generar: generarHistorialPdf } = useHistorialPdf()

async function onCompartir(formato) {
  if (exportandoFormato.value || generandoHistorial.value) return
  const persona = personaSeleccionada.value
  if (!persona) return

  if (formato === 'historial-pdf') { await descargarHistorialPdf(); return }
  if (formato === 'whatsapp') {
    await compartirWhatsapp(persona, deudasActivasPersona.value, deudasSaldadasPersona.value)
    return
  }

  exportandoFormato.value = true
  try {
    const activas = deudasActivasPersona.value || []
    const safeName = (persona.nombre || 'deudas').replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase()
    if (formato === 'pdf') { await descargarPdf(persona, activas, deudasSaldadasPersona.value); return }
    if (formato === 'excel') {
      const { exportar } = useDeudasExcel()
      await exportar({ nombreArchivo: `deudas_${safeName}`, deudas: activas, persona })
      return
    }
    if (formato === 'csv') {
      const { descargar } = useExportCsv()
      const columnas = [
        { label: 'Concepto', getValue: (d) => d.concepto },
        { label: 'Monto pendiente', getValue: (d) => d.montoPendiente },
        { label: 'Monto original', getValue: (d) => d.montoOriginal ?? d.monto ?? '' },
        { label: 'Estado', getValue: (d) => d.estado || '' },
        { label: 'Fecha creación', getValue: (d) => d.fechaCreacion || '' },
        { label: 'Fecha vencimiento', getValue: (d) => d.fechaVencimiento || '' },
        { label: 'Notas', getValue: (d) => d.notas || '' },
      ]
      descargar({ nombreArchivo: `deudas_${safeName}`, columnas, filas: activas })
      return
    }
  } finally { exportandoFormato.value = false }
}

async function descargarHistorialPdf() {
  if (!personaSeleccionada.value) return
  generandoHistorial.value = true
  try {
    const todasDeudas = [
      ...(deudasActivasPersona.value || []),
      ...(deudasSaldadasPersona.value || []),
    ]
    const pagos = []
    try {
      const r = await $fetch(`/api/deudas/personas/${personaSeleccionada.value.id}/pagos-historial`)
      if (Array.isArray(r)) pagos.push(...r)
      else if (Array.isArray(r?.pagos)) pagos.push(...r.pagos)
    } catch { /* sigue sin pagos */ }
    await generarHistorialPdf({
      persona: personaSeleccionada.value,
      deudas: todasDeudas,
      pagos,
      titulo: `Historial de ${personaSeleccionada.value.nombre}`,
    })
  } finally { generandoHistorial.value = false }
}

const { currencySymbol, formatMonto } = useCurrency()
const { formatRelativo } = useFechaRelativa()

function formatFecha(fecha) {
  if (!fecha) return ''
  const d = new Date(fecha + 'T00:00:00')
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${d.getDate()} de ${meses[d.getMonth()]}, ${d.getFullYear()}`
}

function confirmarSaldar(deuda) {
  deudaParaAccion.value = deuda
  showSaldarConfirm.value = true
}

async function ejecutarSaldar() {
  if (!deudaParaAccion.value) return
  procesandoAccion.value = true
  try {
    const deuda = deudaParaAccion.value
    if (deuda.montoPendiente > 0) {
      await registrarPago(deuda.id, { monto: deuda.montoPendiente, fecha: fechaHoyPeru() })
    } else {
      await archivarDeuda(deuda.id)
    }
  } finally {
    procesandoAccion.value = false
    showSaldarConfirm.value = false
    deudaParaAccion.value = null
  }
}

function confirmarEliminarDeuda(deuda) {
  deudaParaAccion.value = deuda
  showEliminarDeudaConfirm.value = true
}

async function ejecutarEliminarDeuda() {
  if (!deudaParaAccion.value) return
  procesandoAccion.value = true
  try {
    await deleteDeuda(deudaParaAccion.value.id)
  } finally {
    procesandoAccion.value = false
    showEliminarDeudaConfirm.value = false
    deudaParaAccion.value = null
  }
}

function onPersonaEditada(updated) {
  if (personaSeleccionada.value) {
    personaSeleccionada.value.nombre = updated.nombre
    personaSeleccionada.value.contacto = updated.contacto
    personaSeleccionada.value.notas = updated.notas
    personaSeleccionada.value.tipo = updated.tipo
  }
}

function confirmarEliminarPersona() { showDeletePersona.value = true }

async function ejecutarEliminarPersona() {
  showDeletePersona.value = false
  await deletePersona(personaSeleccionada.value.id)
}

async function ejecutarDesvincular() {
  desvinculando.value = true
  try {
    await desvincularPersona(personaSeleccionada.value.id)
    showDesvincular.value = false
  } finally { desvinculando.value = false }
}

async function onCheckpointRestaurado() {
  if (personaSeleccionada.value?.vinculadoUsuarioId) await fetchAuditoriaPersona(personaSeleccionada.value.id)
}
async function onCheckpointCreado() {
  if (personaSeleccionada.value?.vinculadoUsuarioId) await fetchAuditoriaPersona(personaSeleccionada.value.id)
}

const detalleRoot = ref(null)
const { attach: attachSwipe, detach: detachSwipe } = useSwipeMonth(volverALista, () => {}, { threshold: 80, verticalTolerance: 60 })

onMounted(() => attachSwipe(detalleRoot.value))
onUnmounted(() => detachSwipe(detalleRoot.value))
</script>
