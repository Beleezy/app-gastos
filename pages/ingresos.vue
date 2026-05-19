<template>
  <div class="min-h-screen pb-32">
    <!-- Header -->
    <div class="px-5 pt-8 pb-3 relative overflow-hidden">
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
      <div class="relative flex items-center gap-3 mb-1">
        <button
          class="w-9 h-9 rounded-lg flex items-center justify-center text-theme-text-muted hover:text-theme-text hover:bg-theme-border-md transition-colors shrink-0"
          @click="$router.back()"
          aria-label="Volver"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div class="w-11 h-11 rounded-2xl flex items-center justify-center bg-emerald-500/15">
          <span class="text-xl">💰</span>
        </div>
        <div class="flex-1 min-w-0">
          <h1 class="text-xl font-bold text-theme-text">Ingresos</h1>
          <p class="text-[11px] text-theme-text-sec mt-0.5">{{ mesLabel }}</p>
        </div>
      </div>
    </div>

    <!-- Resumen flujo neto -->
    <div class="px-5 mb-4">
      <div class="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-2xl p-4 border border-emerald-500/20">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <p class="text-[10px] text-emerald-300/70 uppercase tracking-wider font-medium">Ingresos</p>
            <p class="text-xl font-bold text-emerald-400 mt-0.5">{{ currencySymbol }} {{ formatMonto(resumen.totalIngresos) }}</p>
          </div>
          <div>
            <p class="text-[10px] text-theme-text-muted uppercase tracking-wider font-medium">Gastos</p>
            <p class="text-xl font-bold text-theme-text mt-0.5">{{ currencySymbol }} {{ formatMonto(resumen.totalGastos) }}</p>
          </div>
        </div>
        <div class="mt-3 pt-3 border-t border-emerald-500/20">
          <div class="flex items-end justify-between">
            <div>
              <p class="text-[10px] text-theme-text-muted uppercase tracking-wider font-medium">Saldo neto</p>
              <p class="text-2xl font-bold mt-0.5" :class="resumen.saldoNeto >= 0 ? 'text-emerald-400' : 'text-red-400'">
                {{ currencySymbol }} {{ formatMonto(resumen.saldoNeto) }}
              </p>
            </div>
            <p class="text-[11px]" :class="resumen.porcentajeAhorro >= 0 ? 'text-emerald-400' : 'text-red-400'">
              {{ resumen.porcentajeAhorro >= 0 ? '+' : '' }}{{ resumen.porcentajeAhorro.toFixed(1) }}% ahorro
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Selector de mes -->
    <div class="px-5 mb-4">
      <MonthSelector
        :mes="mesSeleccionado"
        :anio="anioSeleccionado"
        @change="cambiarMes"
      />
    </div>

    <!-- Toggle form -->
    <div class="px-5 mb-4">
      <button
        class="w-full px-4 py-3 rounded-xl border-2 border-dashed border-emerald-500/30 text-emerald-400 text-sm font-medium flex items-center justify-center gap-2 hover:bg-emerald-500/5 transition-colors"
        @click="mostrarForm = !mostrarForm"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path v-if="!mostrarForm" stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          <path v-else stroke-linecap="round" stroke-linejoin="round" d="M19.5 12h-15" />
        </svg>
        {{ mostrarForm ? 'Cancelar' : (editando ? 'Editar ingreso' : 'Registrar ingreso') }}
      </button>
    </div>

    <div v-if="mostrarForm" class="px-5 mb-6">
      <div class="bg-theme-card border border-theme-border rounded-2xl p-4">
        <FormIngreso :editing="editando" @saved="onSaved" @cancel="cancelarEdicion" />
      </div>
    </div>

    <!-- Por origen -->
    <div v-if="porOrigen.length > 0" class="px-5 mb-4">
      <p class="text-[10px] text-theme-text-muted uppercase tracking-wider font-medium mb-2">Por origen</p>
      <div class="flex flex-wrap gap-1.5">
        <span
          v-for="p in porOrigen"
          :key="p.origen"
          class="rounded-full bg-emerald-500/10 text-emerald-300 px-2.5 py-1 text-[10px]"
        >
          {{ labelOrigen(p.origen) }}: {{ currencySymbol }} {{ formatMonto(p.total) }}
        </span>
      </div>
    </div>

    <!-- Lista -->
    <div class="px-5">
      <p class="text-[10px] text-theme-text-muted uppercase tracking-wider font-medium mb-2">
        {{ ingresos.length }} ingreso{{ ingresos.length !== 1 ? 's' : '' }} este mes
      </p>

      <div v-if="isLoading && ingresos.length === 0" class="space-y-2">
        <div v-for="i in 3" :key="i" class="h-16 bg-theme-card rounded-xl shimmer"></div>
      </div>

      <div v-else-if="ingresos.length === 0" class="text-center py-12">
        <div class="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
          <span class="text-2xl">💰</span>
        </div>
        <p class="text-sm text-theme-text-sec">Aún no hay ingresos este mes</p>
        <p class="text-[11px] text-theme-text-muted mt-1">Registra tu primer ingreso para ver el flujo neto</p>
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="ing in ingresos"
          :key="ing.id"
          class="bg-theme-card border border-theme-border rounded-xl p-3 flex items-center gap-3"
        >
          <div class="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
            <span class="text-base">{{ iconoOrigen(ing.origen) }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-theme-text font-medium truncate">{{ ing.concepto }}</p>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-[10px] text-theme-text-muted">{{ formatFechaCorta(ing.fecha) }}</span>
              <span v-if="ing.origen" class="text-[10px] text-emerald-400">{{ labelOrigen(ing.origen) }}</span>
            </div>
          </div>
          <div class="text-right shrink-0">
            <p class="text-base font-semibold text-emerald-400">+{{ currencySymbol }} {{ formatMonto(ing.monto) }}</p>
          </div>
          <div class="flex gap-1 shrink-0">
            <button
              class="w-8 h-8 rounded-lg flex items-center justify-center text-theme-text-muted hover:text-theme-text hover:bg-theme-border-md"
              @click="iniciarEdicion(ing)"
              aria-label="Editar"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
            </button>
            <button
              class="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/10"
              @click="confirmEliminar(ing)"
              aria-label="Eliminar"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ middleware: 'auth' })
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
const {
  ingresos, resumen, isLoading,
  mesSeleccionado, anioSeleccionado, mesLabel,
  porOrigen,
  fetchIngresos, fetchResumen, cambiarMes,
  eliminarIngreso,
} = useIngresos()

const mostrarForm = ref(false)
const editando = ref(null)

onMounted(() => {
  fetchIngresos()
  fetchResumen()
})

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

async function confirmEliminar(ing) {
  if (!confirm(`¿Eliminar "${ing.concepto}"? Podrás recuperarlo de la papelera.`)) return
  try {
    await eliminarIngreso(ing.id)
  } catch (e) {
    console.error(e)
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
