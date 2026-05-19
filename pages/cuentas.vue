<template>
  <div class="min-h-screen pb-32">
    <!-- Header -->
    <div class="px-5 pt-8 pb-3 relative overflow-hidden">
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-sky-500/10 rounded-full blur-3xl"></div>
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
        <div class="w-11 h-11 rounded-2xl flex items-center justify-center bg-sky-500/15">
          <span class="text-xl">🏦</span>
        </div>
        <div class="flex-1 min-w-0">
          <h1 class="text-xl font-bold text-theme-text">Cuentas</h1>
          <p class="text-[11px] text-theme-text-sec mt-0.5">Saldo total: {{ currencySymbol }} {{ formatMonto(saldoTotal) }}</p>
        </div>
      </div>
    </div>

    <!-- Botón nueva cuenta -->
    <div class="px-5 mb-4">
      <button
        class="w-full px-4 py-3 rounded-xl border-2 border-dashed border-sky-500/30 text-sky-400 text-sm font-medium flex items-center justify-center gap-2 hover:bg-sky-500/5 transition-colors"
        @click="mostrarForm = !mostrarForm; editando = null"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Nueva cuenta
      </button>
    </div>

    <!-- Form -->
    <div v-if="mostrarForm" class="px-5 mb-6">
      <div class="bg-theme-card border border-theme-border rounded-2xl p-4 space-y-3">
        <input v-model="form.nombre" placeholder="Nombre (p. ej. BCP Soles)" maxlength="80" class="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-sm" />
        <div class="grid grid-cols-2 gap-3">
          <select v-model="form.tipo" class="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-sm">
            <option value="efectivo">Efectivo</option>
            <option value="debito">Débito</option>
            <option value="credito">Crédito</option>
            <option value="ahorros">Ahorros</option>
            <option value="inversion">Inversión</option>
            <option value="otro">Otro</option>
          </select>
          <input v-model.number="form.saldoInicial" type="number" step="0.01" placeholder="Saldo inicial" class="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-sm" />
        </div>
        <label class="flex items-center gap-2 text-xs text-theme-text-muted">
          <input v-model="form.esPredeterminada" type="checkbox" class="h-4 w-4 rounded" />
          <span>Marcar como predeterminada</span>
        </label>
        <div class="flex gap-2">
          <button class="flex-1 px-4 py-2.5 rounded-xl bg-theme-input text-theme-text-sec text-sm" @click="mostrarForm = false">Cancelar</button>
          <button class="flex-1 px-4 py-2.5 rounded-xl bg-sky-500 text-white text-sm font-semibold" @click="guardar" :disabled="!form.nombre || !form.tipo">{{ editando ? 'Guardar' : 'Crear' }}</button>
        </div>
      </div>
    </div>

    <!-- Lista -->
    <div class="px-5 space-y-2">
      <div v-if="isLoading && cuentas.length === 0" class="space-y-2">
        <div v-for="i in 2" :key="i" class="h-20 bg-theme-card rounded-xl shimmer"></div>
      </div>

      <div v-else-if="cuentas.length === 0" class="text-center py-12">
        <div class="w-14 h-14 mx-auto rounded-full bg-sky-500/10 flex items-center justify-center mb-3">
          <span class="text-2xl">🏦</span>
        </div>
        <p class="text-sm text-theme-text-sec">Aún no tienes cuentas</p>
        <p class="text-[11px] text-theme-text-muted mt-1">Crea una para empezar a separar tus movimientos</p>
      </div>

      <div
        v-for="c in cuentasActivas"
        :key="c.id"
        class="bg-theme-card border border-theme-border rounded-xl p-4"
      >
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2 min-w-0">
            <div class="w-9 h-9 rounded-lg bg-sky-500/15 flex items-center justify-center shrink-0">
              <span class="text-base">{{ c.icono || iconoPorTipo(c.tipo) }}</span>
            </div>
            <div class="min-w-0">
              <p class="text-sm text-theme-text font-semibold truncate">{{ c.nombre }}</p>
              <p class="text-[10px] text-theme-text-muted">{{ labelTipo(c.tipo) }} · {{ c.moneda }}</p>
            </div>
            <span v-if="c.esPredeterminada" class="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded-full font-medium">Default</span>
          </div>
          <button
            class="w-8 h-8 rounded-lg flex items-center justify-center text-theme-text-muted hover:text-theme-text hover:bg-theme-border-md"
            @click="iniciarEdicion(c)"
            aria-label="Editar"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
          </button>
        </div>
        <div class="flex items-end justify-between">
          <div>
            <p class="text-[10px] text-theme-text-muted uppercase tracking-wider font-medium">Saldo actual</p>
            <p class="text-xl font-bold mt-0.5" :class="c.saldoActual >= 0 ? 'text-theme-text' : 'text-red-400'">
              {{ currencySymbol }} {{ formatMonto(c.saldoActual) }}
            </p>
          </div>
          <div class="text-right text-[10px] text-theme-text-muted">
            <p>+{{ currencySymbol }} {{ formatMonto(c.totalIngresos) }}</p>
            <p class="text-red-400/70">−{{ currencySymbol }} {{ formatMonto(c.totalGastos) }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ middleware: 'auth' })
useHead({ title: 'Cuentas · Mis Finanzas' })

const TIPOS_LABEL = {
  efectivo: 'Efectivo', debito: 'Débito', credito: 'Crédito',
  ahorros: 'Ahorros', inversion: 'Inversión', otro: 'Otro',
}
const TIPOS_ICONO = {
  efectivo: '💵', debito: '💳', credito: '💳',
  ahorros: '🐷', inversion: '📈', otro: '🏦',
}

const { currencySymbol, formatMonto } = useCurrency()
const toast = useToast()
const { cuentas, cuentasActivas, isLoading, saldoTotal, fetchCuentas, crearCuenta, actualizarCuenta } = useCuentas()

const mostrarForm = ref(false)
const editando = ref(null)
const form = ref({ nombre: '', tipo: 'efectivo', moneda: 'PEN', saldoInicial: 0, esPredeterminada: false })

onMounted(() => fetchCuentas())

function labelTipo(t) { return TIPOS_LABEL[t] || t }
function iconoPorTipo(t) { return TIPOS_ICONO[t] || '🏦' }

function iniciarEdicion(c) {
  editando.value = c
  form.value = {
    nombre: c.nombre, tipo: c.tipo, moneda: c.moneda || 'PEN',
    saldoInicial: parseFloat(c.saldoInicial) || 0,
    esPredeterminada: !!c.esPredeterminada,
  }
  mostrarForm.value = true
}

async function guardar() {
  try {
    if (editando.value) {
      await actualizarCuenta(editando.value.id, form.value)
      toast.success('Cuenta actualizada')
    } else {
      await crearCuenta(form.value)
      toast.success('Cuenta creada')
    }
    mostrarForm.value = false
    editando.value = null
    form.value = { nombre: '', tipo: 'efectivo', moneda: 'PEN', saldoInicial: 0, esPredeterminada: false }
    fetchCuentas(true)
  } catch (e) {
    toast.error(e?.data?.message || e?.message || 'No se pudo guardar')
  }
}
</script>
