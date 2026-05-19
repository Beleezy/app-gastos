<template>
  <div class="min-h-screen pb-32">
    <!-- Header -->
    <div class="px-5 pt-8 pb-3 relative overflow-hidden">
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/10 rounded-full blur-3xl"></div>
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
        <div class="w-11 h-11 rounded-2xl flex items-center justify-center bg-amber-500/15">
          <span class="text-xl">🗑️</span>
        </div>
        <div class="flex-1 min-w-0">
          <h1 class="text-xl font-bold text-theme-text">Papelera</h1>
          <p class="text-[11px] text-theme-text-sec mt-0.5">Recupera lo eliminado (30 días)</p>
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div v-if="isLoading" class="px-5 space-y-2">
      <div v-for="i in 3" :key="i" class="h-16 bg-theme-card rounded-xl shimmer"></div>
    </div>

    <div v-else-if="totalItems === 0" class="text-center py-16">
      <div class="w-14 h-14 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center mb-3">
        <span class="text-2xl">🗑️</span>
      </div>
      <p class="text-sm text-theme-text-sec">La papelera está vacía</p>
      <p class="text-[11px] text-theme-text-muted mt-1">Los registros eliminados aparecen aquí 30 días</p>
    </div>

    <!-- Gastos eliminados -->
    <div v-if="data.gastos?.length" class="px-5 mb-5">
      <p class="text-[10px] text-theme-text-muted uppercase tracking-wider font-medium mb-2">
        Gastos ({{ data.gastos.length }})
      </p>
      <div class="space-y-2">
        <div
          v-for="g in data.gastos"
          :key="g.id"
          class="bg-theme-card border border-theme-border rounded-xl p-3 flex items-center gap-3"
        >
          <div class="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
            <span class="text-base">{{ g.categoriaIcono || '💸' }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-theme-text font-medium truncate">{{ g.concepto }}</p>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-[10px] text-theme-text-muted">{{ formatFechaCorta(g.fecha) }}</span>
              <span v-if="g.categoriaNombre" class="text-[10px] text-theme-text-muted">· {{ g.categoriaNombre }}</span>
              <span class="text-[10px] text-amber-400">Eliminado {{ fechaRelativa(g.deletedAt) }}</span>
            </div>
          </div>
          <p class="text-sm font-semibold text-theme-text shrink-0 line-through opacity-60">{{ currencySymbol }} {{ formatMonto(g.monto) }}</p>
          <button
            class="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-semibold shrink-0"
            @click="restaurar('gasto', g.id, g.concepto)"
            :disabled="restaurando === g.id"
          >{{ restaurando === g.id ? '...' : 'Restaurar' }}</button>
        </div>
      </div>
    </div>

    <!-- Deudas eliminadas -->
    <div v-if="data.deudas?.length" class="px-5 mb-5">
      <p class="text-[10px] text-theme-text-muted uppercase tracking-wider font-medium mb-2">
        Deudas ({{ data.deudas.length }})
      </p>
      <div class="space-y-2">
        <div
          v-for="d in data.deudas"
          :key="d.id"
          class="bg-theme-card border border-theme-border rounded-xl p-3 flex items-center gap-3"
        >
          <div class="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
            <span class="text-base">{{ d.tipoDeuda === 'me_deben' ? '📥' : '📤' }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-theme-text font-medium truncate">{{ d.concepto }}</p>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-[10px] text-theme-text-muted">{{ d.tipoDeuda === 'me_deben' ? 'Me deben' : 'Yo debo' }}</span>
              <span class="text-[10px] text-amber-400">Eliminada {{ fechaRelativa(d.deletedAt) }}</span>
            </div>
          </div>
          <p class="text-sm font-semibold text-theme-text shrink-0 line-through opacity-60">{{ currencySymbol }} {{ formatMonto(d.montoPendiente) }}</p>
          <button
            class="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-semibold shrink-0"
            @click="restaurar('deuda', d.id, d.concepto)"
            :disabled="restaurando === d.id"
          >{{ restaurando === d.id ? '...' : 'Restaurar' }}</button>
        </div>
      </div>
    </div>

    <!-- Info -->
    <div v-if="totalItems > 0" class="px-5 mt-4">
      <p class="text-[10px] text-theme-text-muted text-center">
        Los registros se eliminan permanentemente a los 30 días.
      </p>
    </div>
  </div>
</template>

<script setup>
useHead({ title: 'Papelera · Mis Finanzas' })

const { apiFetch } = useApiFetch()
const { currencySymbol, formatMonto } = useCurrency()
const toast = useToast()

const isLoading = ref(true)
const restaurando = ref(null)
const data = ref({ gastos: [], deudas: [] })

const totalItems = computed(() => (data.value.gastos?.length || 0) + (data.value.deudas?.length || 0))

async function cargar() {
  isLoading.value = true
  try {
    data.value = await apiFetch('/api/papelera')
  } catch (e) {
    toast.error(e?.data?.message || 'No se pudo cargar la papelera')
    data.value = { gastos: [], deudas: [] }
  } finally {
    isLoading.value = false
  }
}

async function restaurar(entidad, id, concepto) {
  restaurando.value = id
  try {
    await apiFetch('/api/papelera/restaurar', { method: 'POST', body: { entidad, id } })
    toast.success(`"${concepto}" restaurado`)
    if (entidad === 'gasto') data.value.gastos = data.value.gastos.filter((g) => g.id !== id)
    else data.value.deudas = data.value.deudas.filter((d) => d.id !== id)
  } catch (e) {
    toast.error(e?.data?.message || 'No se pudo restaurar')
  } finally {
    restaurando.value = null
  }
}

function formatFechaCorta(fecha) {
  if (!fecha) return ''
  const [, m, d] = fecha.split('-').map(Number)
  return `${d}/${String(m).padStart(2, '0')}`
}

function fechaRelativa(timestamp) {
  if (!timestamp) return ''
  const d = new Date(timestamp)
  const diffMs = Date.now() - d.getTime()
  const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (dias === 0) return 'hoy'
  if (dias === 1) return 'ayer'
  if (dias < 7) return `hace ${dias} días`
  return `hace ${Math.floor(dias / 7)} sem`
}

onMounted(cargar)
</script>
