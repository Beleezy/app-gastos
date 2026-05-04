<template>
  <div ref="detalleRoot" class="px-4 py-3" data-testid="detalle-persona">
    <!-- Back button + Person header -->
    <div class="mb-4">
      <button class="flex items-center gap-1.5 text-theme-text-muted text-sm mb-3 active:text-theme-text transition-colors" @click="volverALista">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Volver
      </button>

      <!-- Person card -->
      <div class="bg-theme-card rounded-2xl p-4">
        <!-- Name row -->
        <div class="flex items-center gap-3 mb-2">
          <div
            class="w-14 h-14 rounded-full flex items-center justify-center text-xl font-semibold shrink-0"
            :class="tabActual === 'me_deben' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'"
          >
            {{ getInitials(personaSeleccionada.nombre) }}
          </div>
          <div class="flex-1 min-w-0">
            <h2 class="text-lg font-semibold text-theme-text break-words">{{ personaSeleccionada.nombre }}</h2>
            <p v-if="personaSeleccionada.contacto" class="text-xs text-theme-text-sec truncate">{{ personaSeleccionada.contacto }}</p>
            <!-- Badge vinculado inline -->
            <span v-if="personaSeleccionada.vinculadoUsuarioId" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-theme-accent-bg text-theme-accent text-[0.625rem] font-medium mt-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Vinculado
            </span>
          </div>
        </div>

        <!-- Action buttons row -->
        <div class="flex items-center gap-1.5 flex-wrap mb-3 pl-1">
          <!-- Export multi-formato (only me_deben) -->
          <SharedExportButton
            v-if="tabActual === 'me_deben' && totalPendientePersona > 0"
            :formats="['pdf', 'excel', 'csv']"
            label="Exportar"
            @select="exportarFormato"
          />
          <!-- Share WhatsApp -->
          <button
            v-if="tabActual === 'me_deben' && totalPendientePersona > 0"
            class="min-h-[40px] h-10 px-3 rounded-lg bg-theme-border-md flex items-center gap-1.5 text-theme-text-sec hover:text-emerald-400 transition-colors text-[0.7rem] font-medium"
            title="Enviar por WhatsApp"
            aria-label="Compartir resumen por WhatsApp"
            @click="enviarWhatsapp"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            WhatsApp
          </button>
          <!-- Vincular con usuario -->
          <button
            v-if="!personaSeleccionada.vinculadoUsuarioId"
            class="min-h-[40px] h-10 px-3 rounded-lg bg-theme-border-md flex items-center gap-1.5 text-theme-text-sec hover:text-theme-accent transition-colors text-[0.7rem] font-medium"
            title="Vincular con usuario"
            aria-label="Vincular esta persona con otra cuenta"
            @click="showSolicitudVinculo = true"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Vincular
          </button>
          <!-- Desvincular -->
          <button
            v-if="personaSeleccionada.vinculadoUsuarioId"
            class="min-h-[40px] h-10 px-3 rounded-lg bg-theme-border-md flex items-center gap-1.5 text-theme-text-sec hover:text-orange-400 transition-colors text-[0.7rem] font-medium"
            title="Desvincular"
            aria-label="Desvincular esta persona"
            @click="showDesvincular = true"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
            </svg>
            Desvincular
          </button>
          <!-- Edit persona -->
          <button
            class="min-h-[40px] h-10 px-3 rounded-lg bg-theme-border-md flex items-center gap-1.5 text-theme-text-sec hover:text-amber-400 transition-colors text-[0.7rem] font-medium"
            title="Editar persona"
            aria-label="Editar datos de la persona"
            @click="showEditarPersona = true"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar
          </button>
          <!-- Delete persona -->
          <button
            class="min-h-[40px] h-10 px-3 rounded-lg bg-theme-border-md flex items-center gap-1.5 text-theme-text-sec hover:text-red-400 transition-colors text-[0.7rem] font-medium"
            title="Eliminar persona"
            aria-label="Eliminar persona y sus deudas"
            @click="confirmarEliminarPersona"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Eliminar
          </button>
          <!-- Historial PDF (deudas + pagos completos) -->
          <button
            v-if="(deudasActivasPersona.length + deudasSaldadasPersona.length) > 0"
            class="min-h-[40px] h-10 px-3 rounded-lg bg-theme-border-md flex items-center gap-1.5 text-theme-text-sec hover:text-blue-400 transition-colors text-[0.7rem] font-medium"
            title="Historial completo en PDF"
            aria-label="Descargar historial completo en PDF"
            :disabled="generandoHistorial"
            @click="descargarHistorialPdf"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {{ generandoHistorial ? 'Generando…' : 'Historial PDF' }}
          </button>
        </div>

        <!-- Total pendiente -->
        <div class="bg-theme-input rounded-xl p-3">
          <div class="flex items-center justify-between">
            <span class="text-xs text-theme-text-sec">Total pendiente</span>
            <span
              class="text-lg font-bold"
              :class="tabActual === 'me_deben' ? 'text-emerald-400' : 'text-red-400'"
            >
              {{ currencySymbol }} {{ formatMonto(totalPendientePersona) }}
            </span>
          </div>
          <!-- Pago global button -->
          <button
            v-if="deudasActivasPersona.length > 1 && totalPendientePersona > 0"
            class="w-full mt-2 py-2 rounded-lg bg-theme-accent-bg text-theme-accent text-xs font-medium hover:bg-theme-accent-bg transition-colors flex items-center justify-center gap-1.5"
            @click="emit('pagoGlobal')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Registrar pago global
          </button>
        </div>
      </div>
    </div>

    <!-- Stats: progress + breakdown -->
    <DeudasStatsPersona
      v-if="!isLoading"
      :deudas-activas="deudasActivasPersona"
      :deudas-saldadas="deudasSaldadasPersona"
      :tab-actual="tabActual"
    />

    <!-- Loading state -->
    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 2" :key="i" class="bg-theme-card rounded-xl p-4 animate-pulse">
        <div class="space-y-2">
          <div class="h-4 bg-theme-border-md rounded w-3/4"></div>
          <div class="h-3 bg-theme-border-md rounded w-1/2"></div>
        </div>
      </div>
    </div>

    <template v-else>
      <!-- Active debts section -->
      <div v-if="deudasActivasPersona.length > 0" class="mb-5">
        <div class="flex items-center gap-2 mb-2.5">
          <span class="w-1.5 h-1.5 rounded-full" :class="tabActual === 'me_deben' ? 'bg-emerald-400' : 'bg-red-400'"></span>
          <h3 class="text-xs font-semibold text-theme-text-muted uppercase tracking-wider">Pendientes</h3>
          <span class="text-xs text-theme-text-sec ml-auto">{{ deudasActivasPersona.length }}</span>
        </div>

        <div v-for="deuda in deudasActivasPersona" :key="deuda.id" class="bg-theme-card rounded-xl p-3.5 mb-2 border border-theme-border" data-testid="deuda-item">
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-theme-text">{{ deuda.concepto }}</p>
              <p class="text-xs text-theme-text-sec mt-0.5">
                {{ formatFecha(deuda.fechaCreacion) }}
                <span class="text-theme-text-muted">· {{ formatRelativo(deuda.fechaCreacion) }}</span>
              </p>
              <div v-if="deuda.fechaPago" class="flex items-center gap-1.5 mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" :class="esVencida(deuda) ? 'text-red-400' : 'text-theme-accent'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p class="text-[0.625rem] font-medium" :class="esVencida(deuda) ? 'text-red-400' : 'text-theme-accent'">
                  {{ esVencida(deuda) ? 'Vencida:' : 'Pago:' }} {{ formatFecha(deuda.fechaPago) }}
                </p>
                <span v-if="esVencida(deuda)" class="text-[0.5625rem] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-semibold">VENCIDA</span>
              </div>
              <div v-if="deuda.notas" class="mt-1">
                <p class="text-[0.625rem] text-theme-text-muted italic">{{ deuda.notas }}</p>
              </div>
            </div>
            <div class="text-right shrink-0 ml-3">
              <p class="text-sm font-semibold text-theme-text">{{ currencySymbol }} {{ formatMonto(deuda.montoOriginal) }}</p>
              <p v-if="deuda.estado === 'parcial'" class="text-[0.625rem] text-orange-400 mt-0.5">
                Pendiente: {{ currencySymbol }} {{ formatMonto(deuda.montoPendiente) }}
              </p>
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.625rem] font-medium mt-1"
                :class="deuda.estado === 'parcial' ? 'bg-orange-500/15 text-orange-400' : 'bg-yellow-500/15 text-yellow-400'"
              >
                {{ deuda.estado === 'parcial' ? 'Parcial' : 'Pendiente' }}
              </span>
            </div>
          </div>

          <!-- Progress bar for partial payments -->
          <div v-if="deuda.montoOriginal !== deuda.montoPendiente" class="mt-2.5">
            <div class="w-full h-1.5 bg-theme-input rounded-full overflow-hidden">
              <div
                class="h-full rounded-full bg-gradient-to-r from-theme-accent to-theme-accent transition-all duration-500"
                :style="{ width: ((1 - deuda.montoPendiente / deuda.montoOriginal) * 100) + '%' }"
              ></div>
            </div>
            <p class="text-[0.625rem] text-theme-text-muted mt-0.5">
              {{ ((1 - deuda.montoPendiente / deuda.montoOriginal) * 100).toFixed(0) }}% pagado
            </p>
          </div>

          <!-- Actions (44x44px targets) -->
          <div class="flex items-center justify-end gap-1 mt-2 pt-2 border-t border-theme-border">
            <button
              class="min-w-[44px] h-11 px-3 flex items-center justify-center gap-1.5 rounded-xl text-xs font-medium text-theme-accent bg-theme-accent-bg hover:bg-theme-accent-bg active:bg-theme-accent-bg transition-colors"
              data-testid="btn-nuevo-pago"
              @click="emit('registrarPago', deuda)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Pago
            </button>
            <button
              class="min-w-[44px] h-11 px-3 flex items-center justify-center gap-1.5 rounded-xl text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 transition-colors"
              data-testid="btn-editar-deuda"
              @click="emit('editarDeuda', deuda)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </button>
            <button
              class="min-w-[44px] h-11 px-3 flex items-center justify-center gap-1.5 rounded-xl text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 active:bg-emerald-500/30 transition-colors"
              @click="confirmarSaldar(deuda)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Saldar
            </button>
            <button
              class="min-w-[44px] h-11 px-3 flex items-center justify-center rounded-xl text-theme-text-muted hover:text-red-400 hover:bg-red-500/10 active:bg-red-500/20 transition-colors"
              data-testid="btn-eliminar-deuda"
              @click="confirmarEliminarDeuda(deuda)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Mini gráfico de evolución del saldo -->
      <DeudasGraficoEvolucionDeuda
        :pagos="pagosPersona"
        :monto-original-total="deudasPersona.reduce((s, d) => s + d.montoOriginal, 0)"
        :monto-actual="totalPendientePersona"
        :color="tabActual === 'me_deben' ? '#10b981' : '#ef4444'"
      />

      <!-- Payment history section (timeline) -->
      <DeudasHistorialPagosPersona :pagos="pagosPersona" />

      <!-- Auditoría de vínculo -->
      <DeudasAuditoriaVinculo
        v-if="personaSeleccionada.vinculadoUsuarioId"
        :persona-id="personaSeleccionada.id"
        :auditoria="auditoriaPersona"
      />

      <!-- Puntos de guardado (solo personas vinculadas) -->
      <DeudasCheckpointsVinculo
        v-if="personaSeleccionada.vinculadoUsuarioId"
        :persona-id="personaSeleccionada.id"
        @restaurado="onCheckpointRestaurado"
        @creado="onCheckpointCreado"
      />

      <!-- Settled debts section -->
      <div v-if="deudasSaldadasPersona.length > 0">
        <button
          class="flex items-center gap-2 mb-2.5 w-full"
          @click="showSaldadas = !showSaldadas"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-gray-600"></span>
          <h3 class="text-xs font-semibold text-theme-text-sec uppercase tracking-wider">Saldadas</h3>
          <span class="text-xs text-theme-text-muted">{{ deudasSaldadasPersona.length }}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-3 h-3 text-theme-text-muted ml-auto transition-transform"
            :class="showSaldadas ? 'rotate-180' : ''"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div v-if="showSaldadas">
          <div v-for="deuda in deudasSaldadasPersona" :key="deuda.id" class="bg-theme-card rounded-xl p-3.5 mb-2 border border-theme-border opacity-60">
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-theme-text-muted line-through">{{ deuda.concepto }}</p>
                <p class="text-xs text-theme-text-muted mt-0.5">{{ formatFecha(deuda.fechaCreacion) }}</p>
              </div>
              <div class="text-right shrink-0 ml-3">
                <p class="text-sm font-semibold text-theme-text-sec">{{ currencySymbol }} {{ formatMonto(deuda.montoOriginal) }}</p>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.625rem] font-medium mt-1 bg-emerald-500/15 text-emerald-400">
                  {{ deuda.estado === 'archivado' ? 'Archivada' : 'Pagada' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty debts state -->
      <div v-if="deudasActivasPersona.length === 0 && deudasSaldadasPersona.length === 0" class="text-center py-8">
        <p class="text-theme-text-sec text-sm">No hay deudas registradas</p>
        <p class="text-theme-text-muted text-xs mt-1">Agrega un concepto de deuda con el boton +</p>
      </div>

      <!-- Bottom spacer -->
      <div class="h-16"></div>
    </template>

    <!-- Solicitud vinculo -->
    <DeudasSolicitudVinculo
      v-if="showSolicitudVinculo"
      :persona-entidad-id="personaSeleccionada.id"
      :persona-nombre="personaSeleccionada.nombre"
      @close="showSolicitudVinculo = false"
      @enviada="showSolicitudVinculo = false"
    />

    <!-- Editar persona -->
    <DeudasFormEditarPersona
      v-if="showEditarPersona"
      :persona="personaSeleccionada"
      @close="showEditarPersona = false"
      @saved="onPersonaEditada"
    />

    <!-- Confirm saldar deuda -->
    <SharedConfirmDialog
      v-model="showSaldarConfirm"
      title="Saldar deuda"
      :message="`¿Registrar pago de ${currencySymbol} ${formatMonto(deudaParaAccion?.montoPendiente)} y marcar como pagada?`"
      confirm-label="Saldar deuda"
      variant="success"
      :loading="procesandoAccion"
      @confirm="ejecutarSaldar"
    />

    <!-- Confirm eliminar deuda -->
    <SharedConfirmDialog
      v-model="showEliminarDeudaConfirm"
      title="Eliminar deuda"
      :message="`¿Eliminar '${deudaParaAccion?.concepto}'? Esta acción no se puede deshacer.`"
      confirm-label="Eliminar"
      variant="danger"
      :loading="procesandoAccion"
      @confirm="ejecutarEliminarDeuda"
    />

    <!-- Desvincular confirmation -->
    <div v-if="showDesvincular" class="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div class="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm" @click="showDesvincular = false"></div>
      <div class="relative bg-theme-card rounded-2xl p-5 w-full max-w-sm border border-theme-border">
        <h3 class="text-base font-semibold text-theme-text mb-2">Desvincular usuario</h3>
        <p class="text-sm text-theme-text-muted mb-2">El vínculo con <span class="text-theme-text font-medium">{{ personaSeleccionada.nombre }}</span> se disolverá.</p>
        <ul class="text-xs text-theme-text-sec space-y-1 mb-5 list-disc pl-4">
          <li>Tus deudas y pagos se mantienen intactos</li>
          <li>Los datos del otro usuario también se conservan</li>
          <li>Podrás volver a vincular enviando una nueva solicitud</li>
        </ul>
        <div class="space-y-2">
          <button
            class="w-full py-2.5 rounded-xl bg-orange-500/15 text-orange-400 text-sm font-medium hover:bg-orange-500/25 transition-colors disabled:opacity-50"
            :disabled="desvinculando"
            @click="ejecutarDesvincular"
          >
            {{ desvinculando ? 'Desvinculando...' : 'Confirmar desvincular' }}
          </button>
          <button
            class="w-full py-2.5 rounded-xl text-theme-text-sec text-sm font-medium hover:text-theme-text-sec transition-colors"
            @click="showDesvincular = false"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>

    <!-- Delete persona confirmation -->
    <div v-if="showDeletePersona" class="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div class="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm" @click="showDeletePersona = false"></div>
      <div class="relative bg-theme-card rounded-2xl p-5 w-full max-w-sm border border-theme-border">
        <h3 class="text-base font-semibold text-theme-text mb-2">Eliminar persona</h3>
        <p class="text-sm text-theme-text-muted mb-5">Se eliminaran todas las deudas y pagos asociados a <span class="text-theme-text font-medium">{{ personaSeleccionada.nombre }}</span>.</p>
        <div class="space-y-2">
          <button
            class="w-full py-2.5 rounded-xl bg-red-500/15 text-red-400 text-sm font-medium hover:bg-red-500/25 transition-colors"
            @click="ejecutarEliminarPersona"
          >
            Eliminar todo
          </button>
          <button
            class="w-full py-2.5 rounded-xl text-theme-text-sec text-sm font-medium hover:text-theme-text-sec transition-colors"
            @click="showDeletePersona = false"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const emit = defineEmits(['registrarPago', 'agregarDeuda', 'editarDeuda', 'pagoGlobal'])

const {
  tabActual, personaSeleccionada,
  deudasPersona, deudasActivasPersona, deudasSaldadasPersona,
  totalPendientePersona, isLoading,
  volverALista, deleteDeuda, archivarDeuda, deletePersona,
  registrarPago, pagosPersona, auditoriaPersona,
  desvincularPersona, fetchAuditoriaPersona,
} = useDeudas()

const { descargarPdf, compartirWhatsapp } = useDeudaPdf()

const showSaldadas = ref(false)
const showDeletePersona = ref(false)
const showEditarPersona = ref(false)
const showSolicitudVinculo = ref(false)
const showDesvincular = ref(false)

useOverlayBack(showDesvincular, () => { showDesvincular.value = false })
useOverlayBack(showDeletePersona, () => { showDeletePersona.value = false })
const showSaldarConfirm = ref(false)
const showEliminarDeudaConfirm = ref(false)
const deudaParaAccion = ref(null)
const procesandoAccion = ref(false)
const desvinculando = ref(false)

// Cargar auditoría cuando la persona tiene vínculo
watch(() => personaSeleccionada.value?.id, (newId) => {
  if (newId && personaSeleccionada.value?.vinculadoUsuarioId) {
    fetchAuditoriaPersona(newId)
  }
}, { immediate: true })

const { fechaHoy: fechaHoyPeru } = useFechaPeru()
const hoy = fechaHoyPeru()
function esVencida(deuda) {
  return !!deuda.fechaPago && deuda.fechaPago < hoy
}

async function exportarPdf() {
  await descargarPdf(personaSeleccionada.value, deudasActivasPersona.value, deudasSaldadasPersona.value)
}

const exportandoFormato = ref(false)
async function exportarFormato(formato) {
  if (exportandoFormato.value) return
  exportandoFormato.value = true
  try {
    const persona = personaSeleccionada.value
    if (!persona) return
    const activas = deudasActivasPersona.value || []
    const safeName = (persona.nombre || 'deudas').replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase()

    if (formato === 'pdf') {
      await descargarPdf(persona, activas, deudasSaldadasPersona.value)
      return
    }
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
  } finally {
    exportandoFormato.value = false
  }
}

async function enviarWhatsapp() {
  await compartirWhatsapp(personaSeleccionada.value, deudasActivasPersona.value, deudasSaldadasPersona.value)
}

const generandoHistorial = ref(false)
const { generar: generarHistorialPdf } = useHistorialPdf()

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
      if (Array.isArray(r)) {
        pagos.push(...r)
      } else if (Array.isArray(r?.pagos)) {
        pagos.push(...r.pagos)
      }
    } catch {
      // si falla el fetch, generar PDF solo con deudas
    }
    await generarHistorialPdf({
      persona: personaSeleccionada.value,
      deudas: todasDeudas,
      pagos,
      titulo: `Historial de ${personaSeleccionada.value.nombre}`,
    })
  } finally {
    generandoHistorial.value = false
  }
}

import { getInitials } from '~/utils/constants'

const { currencySymbol, formatMonto } = useCurrency()
const { formatRelativo } = useFechaRelativa()

function formatFecha(fecha) {
  if (!fecha) return ''
  const d = new Date(fecha + 'T00:00:00')
  const dia = d.getDate()
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${dia} de ${meses[d.getMonth()]}, ${d.getFullYear()}`
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
      await registrarPago(deuda.id, {
        monto: deuda.montoPendiente,
        fecha: fechaHoyPeru(),
      })
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
  // Actualizar nombre en la persona seleccionada localmente
  if (personaSeleccionada.value) {
    personaSeleccionada.value.nombre = updated.nombre
    personaSeleccionada.value.contacto = updated.contacto
    personaSeleccionada.value.notas = updated.notas
    personaSeleccionada.value.tipo = updated.tipo
  }
}

function confirmarEliminarPersona() {
  showDeletePersona.value = true
}

async function ejecutarEliminarPersona() {
  showDeletePersona.value = false
  await deletePersona(personaSeleccionada.value.id)
}

async function ejecutarDesvincular() {
  desvinculando.value = true
  try {
    await desvincularPersona(personaSeleccionada.value.id)
    showDesvincular.value = false
  } finally {
    desvinculando.value = false
  }
}

async function onCheckpointRestaurado() {
  if (personaSeleccionada.value?.vinculadoUsuarioId) {
    await fetchAuditoriaPersona(personaSeleccionada.value.id)
  }
}

async function onCheckpointCreado() {
  if (personaSeleccionada.value?.vinculadoUsuarioId) {
    await fetchAuditoriaPersona(personaSeleccionada.value.id)
  }
}

// Swipe right → go back
const detalleRoot = ref(null)
const { attach: attachSwipe, detach: detachSwipe } = useSwipeMonth(volverALista, () => {}, { threshold: 80, verticalTolerance: 60 })

onMounted(() => attachSwipe(detalleRoot.value))
onUnmounted(() => detachSwipe(detalleRoot.value))
</script>
