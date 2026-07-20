<template>
  <div>
    <LayoutAppHeader>
      <template #title>Ingresos</template>
      <template #subtitle>{{ mesLabel }}</template>
    </LayoutAppHeader>

    <div class="max-w-lg mx-auto lg:max-w-2xl pb-4">
      <SharedMonthSelector
        :label="mesLabel"
        :es-actual="esMesActual"
        :disable-next="esMesActual"
        container-class="px-4 py-3 lg:px-0 lg:pt-6"
        @prev="mesAnterior"
        @next="mesSiguiente"
        @go-to-current="irAMesActual"
      />

      <!-- Resumen del mes: ingresos como "presupuesto" del flujo y los gastos
           consumiéndolo (mismo lenguaje visual que Registro/Planificador) -->
      <div class="px-4 lg:px-0 mb-4">
        <div
          class="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-theme-card p-4"
        >
          <div
            class="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none"
          ></div>
          <div class="relative">
            <p class="text-[0.6875rem] uppercase tracking-wider font-semibold text-emerald-300/80">
              Ingresos del mes
            </p>
            <p class="text-3xl font-bold text-emerald-400 mt-0.5 tabular-nums">
              {{ currencySymbol }}&nbsp;{{ formatMonto(resumen.totalIngresos) }}
            </p>

            <template v-if="resumen.totalIngresos > 0">
              <div class="h-2 w-full rounded-full bg-theme-input overflow-hidden mt-3">
                <div
                  class="h-full rounded-full transition-all duration-700"
                  :class="
                    resumen.saldoNeto < 0
                      ? 'bg-gradient-to-r from-red-500 to-rose-400'
                      : 'bg-gradient-to-r from-amber-500 to-amber-400'
                  "
                  :style="{ width: pctGastado + '%' }"
                ></div>
              </div>
              <div class="flex items-center justify-between gap-2 mt-1.5">
                <p class="text-[0.6875rem] text-theme-text-sec min-w-0">
                  Gastado: {{ currencySymbol }}&nbsp;{{ formatMonto(resumen.totalGastos) }}
                </p>
                <p
                  class="text-[0.6875rem] tabular-nums shrink-0"
                  :class="resumen.saldoNeto >= 0 ? 'text-emerald-400' : 'text-red-400'"
                >
                  {{ pctGastado.toFixed(0) }}%
                </p>
              </div>
            </template>
            <p v-else class="text-[0.6875rem] text-theme-text-muted mt-2">
              Gastos del mes: {{ currencySymbol }}&nbsp;{{ formatMonto(resumen.totalGastos) }}
            </p>

            <div class="grid grid-cols-2 gap-2.5 mt-3 pt-3 border-t border-emerald-500/20">
              <div class="min-w-0">
                <p class="text-[0.6875rem] uppercase tracking-wide text-theme-text-muted">
                  Saldo neto
                </p>
                <p
                  class="text-lg font-bold mt-0.5 tabular-nums"
                  :class="resumen.saldoNeto >= 0 ? 'text-emerald-400' : 'text-red-400'"
                >
                  {{ currencySymbol }}&nbsp;{{ formatMonto(resumen.saldoNeto) }}
                </p>
              </div>
              <div class="min-w-0 text-right">
                <p class="text-[0.6875rem] uppercase tracking-wide text-theme-text-muted">Ahorro</p>
                <p
                  class="text-lg font-bold mt-0.5 tabular-nums"
                  :class="resumen.porcentajeAhorro >= 0 ? 'text-emerald-400' : 'text-red-400'"
                >
                  {{ resumen.porcentajeAhorro >= 0 ? '+' : ''
                  }}{{ resumen.porcentajeAhorro.toFixed(1) }}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Por origen -->
      <div v-if="porOrigen.length > 0" class="px-4 lg:px-0 mb-4">
        <p class="text-[0.6875rem] text-theme-text-muted uppercase tracking-wider font-medium mb-2">
          Por origen
        </p>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="p in porOrigen"
            :key="p.origen"
            class="rounded-full bg-emerald-500/10 text-emerald-300 px-2.5 py-1 text-[0.6875rem]"
          >
            {{ iconoOrigen(p.origen) }} {{ labelOrigen(p.origen) }}: {{ currencySymbol }}&nbsp;{{
              formatMonto(p.total)
            }}
          </span>
        </div>
      </div>

      <!-- Lista -->
      <div class="px-4 lg:px-0">
        <p class="text-[0.6875rem] text-theme-text-muted uppercase tracking-wider font-medium mb-2">
          {{ ingresos.length }} ingreso{{ ingresos.length !== 1 ? 's' : '' }} este mes
        </p>

        <div v-if="isLoading && ingresos.length === 0" class="space-y-2">
          <div v-for="i in 3" :key="i" class="h-16 bg-theme-card rounded-xl shimmer"></div>
        </div>

        <div
          v-else-if="ingresos.length === 0"
          class="text-center py-12 rounded-2xl border border-dashed border-theme-border bg-theme-card"
        >
          <div
            class="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center mb-3"
          >
            <span class="text-2xl">💰</span>
          </div>
          <p class="text-sm text-theme-text-sec">Aún no hay ingresos este mes</p>
          <button
            class="mt-3 min-h-[44px] px-4 rounded-xl bg-emerald-500 text-white text-sm font-semibold active:scale-[0.98] transition-transform"
            @click="abrirNuevo"
          >
            + Registrar mi primer ingreso
          </button>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="ing in ingresos"
            :key="ing.id"
            class="bg-theme-card border border-theme-border hover:border-emerald-500/30 transition-colors rounded-xl p-3"
          >
            <div class="flex items-start gap-3">
              <div
                class="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5"
              >
                <span class="text-base">{{ iconoOrigen(ing.origen) }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <!-- Concepto + monto arriba a la derecha (patrón de GastoItem) -->
                <div class="flex items-start justify-between gap-2">
                  <p
                    class="min-w-0 flex-1 text-sm font-medium text-theme-text break-words leading-tight"
                  >
                    {{ ing.concepto }}
                  </p>
                  <p
                    class="shrink-0 text-sm font-bold text-emerald-400 leading-tight whitespace-nowrap"
                  >
                    +{{ currencySymbol }}&nbsp;{{ formatMonto(ing.monto) }}
                  </p>
                </div>
                <!-- Meta a la izquierda, acciones a la derecha -->
                <div class="flex items-center gap-1.5 mt-1">
                  <div class="flex items-center gap-1.5 min-w-0 flex-1 flex-wrap">
                    <span
                      v-if="ing.origen"
                      class="text-[0.6875rem] font-medium px-1.5 py-0.5 rounded-md leading-none bg-emerald-500/10 text-emerald-400"
                    >
                      {{ labelOrigen(ing.origen) }}
                    </span>
                    <span class="text-[0.6875rem] text-theme-text-muted">{{
                      formatFechaCorta(ing.fecha)
                    }}</span>
                    <span
                      v-if="ing.esRecurrente"
                      class="text-[0.6875rem] bg-theme-accent-bg text-theme-accent px-1.5 py-0.5 rounded-full leading-none"
                      >Recurrente</span
                    >
                  </div>
                  <div class="flex items-center gap-0.5 shrink-0">
                    <button
                      class="w-10 h-10 -my-1.5 flex items-center justify-center rounded-md text-theme-text-muted hover:text-theme-accent hover:bg-theme-accent-bg active:scale-90 transition-all"
                      aria-label="Editar"
                      @click="iniciarEdicion(ing)"
                    >
                      <svg
                        class="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </button>
                    <button
                      class="w-10 h-10 -my-1.5 flex items-center justify-center rounded-md text-theme-text-muted hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-all"
                      aria-label="Eliminar"
                      @click="pedirEliminar(ing)"
                    >
                      <svg
                        class="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- FAB: registrar ingreso. Oculto con la lista vacía: el empty state ya
         muestra su propio CTA verde y ambos botones se fundían visualmente. -->
    <SharedFloatingActionStack :visible="ingresos.length > 0">
      <SharedFloatingActionButton
        tone="emerald"
        aria-label="Registrar ingreso"
        @click="abrirNuevo"
      />
    </SharedFloatingActionStack>

    <!-- Form en bottom-sheet, como los demás módulos -->
    <SharedBaseBottomSheet
      v-if="mostrarForm"
      :title="editando ? 'Editar ingreso' : 'Nuevo ingreso'"
      @close="cancelarEdicion"
    >
      <IngresosFormIngreso :editing="editando" @saved="onSaved" @cancel="cancelarEdicion" />
    </SharedBaseBottomSheet>

    <SharedConfirmDialog
      v-model="confirmandoEliminar"
      title="Eliminar ingreso"
      :message="
        ingresoEliminar
          ? `¿Eliminar '${ingresoEliminar.concepto}'? Podrás recuperarlo de la papelera (30 días).`
          : ''
      "
      confirm-label="Eliminar"
      :loading="eliminando"
      @confirm="confirmarEliminar"
    />
  </div>
</template>

<script setup>
useHead({ title: 'Ingresos · Mis Finanzas' })

const ORIGENES_MAP = {
  salario: { label: 'Salario', icon: '💼' },
  freelance: { label: 'Freelance', icon: '💻' },
  inversion: { label: 'Inversión', icon: '📈' },
  regalo: { label: 'Regalo', icon: '🎁' },
  reembolso: { label: 'Reembolso', icon: '↩️' },
  otro: { label: 'Otro', icon: '💰' },
}

const { currencySymbol, formatMonto } = useCurrency()
const toast = useToast()
const {
  ingresos,
  resumen,
  isLoading,
  mesLabel,
  esMesActual,
  porOrigen,
  fetchIngresos,
  fetchResumen,
  mesAnterior,
  mesSiguiente,
  irAMesActual,
  eliminarIngreso,
} = useIngresos()

const mostrarForm = ref(false)
const editando = ref(null)
const confirmandoEliminar = ref(false)
const ingresoEliminar = ref(null)
const eliminando = ref(false)

// Qué proporción de los ingresos ya se gastó (tope visual 100%).
const pctGastado = computed(() => {
  const ing = Number(resumen.value.totalIngresos) || 0
  if (ing <= 0) return 0
  return Math.min((Number(resumen.value.totalGastos) / ing) * 100, 100)
})

// Botón atrás (Android) cierra el sheet en vez de salir de la página
useOverlayBack(mostrarForm, () => cancelarEdicion())

onMounted(() => {
  fetchIngresos()
  fetchResumen()
})

function abrirNuevo() {
  editando.value = null
  mostrarForm.value = true
}

function iniciarEdicion(ing) {
  editando.value = ing
  mostrarForm.value = true
}

function cancelarEdicion() {
  editando.value = null
  mostrarForm.value = false
}

function onSaved() {
  editando.value = null
  mostrarForm.value = false
}

function pedirEliminar(ing) {
  ingresoEliminar.value = ing
  confirmandoEliminar.value = true
}

async function confirmarEliminar() {
  if (!ingresoEliminar.value) return
  eliminando.value = true
  try {
    await eliminarIngreso(ingresoEliminar.value.id)
    toast.success('Ingreso enviado a la papelera')
  } catch {
    toast.error('No se pudo eliminar el ingreso')
  } finally {
    eliminando.value = false
    confirmandoEliminar.value = false
    ingresoEliminar.value = null
  }
}

function labelOrigen(o) {
  return ORIGENES_MAP[o]?.label || o || 'Otro'
}
function iconoOrigen(o) {
  return ORIGENES_MAP[o]?.icon || '💰'
}
function formatFechaCorta(fecha) {
  if (!fecha) return ''
  const [, m, d] = fecha.split('-').map(Number)
  return `${d}/${String(m).padStart(2, '0')}`
}
</script>
