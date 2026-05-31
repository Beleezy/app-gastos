<template>
  <div class="px-4 pt-3 pb-28">
    <h1 class="text-2xl font-extrabold text-gradient-blue leading-tight mb-0.5">Ingresos</h1>
    <p class="text-[0.78rem] text-theme-text-sec mb-4">Tu flujo neto del mes</p>

    <PreviewMonthNav :label="mesLabel" @prev="cambiar(-1)" @next="cambiar(1)" />

    <div v-if="loading" class="space-y-3">
      <div class="h-32 rounded-2xl bg-theme-card shimmer"></div>
      <div class="h-20 rounded-2xl bg-theme-card shimmer"></div>
    </div>

    <template v-else>
      <!-- Saldo neto -->
      <div class="rounded-2xl border border-theme-border bg-gradient-to-br from-emerald-500/5 to-theme-card p-4 mb-3">
        <p class="text-[0.6rem] uppercase tracking-wider font-bold text-theme-text-muted">Saldo neto</p>
        <SharedMoney :value="resumen.saldoNeto" signo tone="auto" class="text-2xl font-extrabold block mt-1" />
        <p class="text-[0.66rem] mt-0.5" :class="resumen.porcentajeAhorro >= 0 ? 'text-emerald-400' : 'text-red-400'">
          {{ resumen.porcentajeAhorro }}% de ahorro sobre ingresos
        </p>
        <div class="grid grid-cols-2 gap-3 mt-3">
          <div class="rounded-xl bg-theme-input p-3">
            <p class="text-[0.58rem] uppercase tracking-wide text-theme-text-muted">Ingresos</p>
            <SharedMoney :value="resumen.totalIngresos" tone="green" class="text-base font-bold block mt-0.5" />
          </div>
          <div class="rounded-xl bg-theme-input p-3">
            <p class="text-[0.58rem] uppercase tracking-wide text-theme-text-muted">Gastos</p>
            <SharedMoney :value="resumen.totalGastos" tone="red" class="text-base font-bold block mt-0.5" />
          </div>
        </div>
      </div>

      <!-- Lista de ingresos -->
      <div v-if="ingresos.length === 0" class="rounded-2xl border border-dashed border-theme-border bg-theme-card p-8 text-center">
        <p class="text-sm text-theme-text-sec">Sin ingresos este mes</p>
      </div>
      <div v-else class="space-y-2">
        <div v-for="ing in ingresos" :key="ing.id" class="rounded-2xl border border-theme-border bg-theme-card p-3.5 flex items-center gap-3">
          <span class="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0 text-base">{{ iconoOrigen(ing.origen) }}</span>
          <div class="min-w-0 flex-1">
            <p class="text-sm text-theme-text font-medium line-clamp-2 break-words leading-snug">{{ ing.concepto }}</p>
            <p class="text-[0.62rem] text-theme-text-muted mt-0.5">{{ fechaCorta(ing.fecha) }}<span v-if="ing.origen"> · {{ labelOrigen(ing.origen) }}</span></p>
          </div>
          <SharedMoney :value="ing.monto" signo tone="green" class="text-base font-bold shrink-0" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
const { apiFetch } = useApiFetch()
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

const hoy = new Date()
const mes = ref(hoy.getUTCMonth() + 1)
const anio = ref(hoy.getUTCFullYear())
const loading = ref(true)
const ingresos = ref([])
const resumen = ref({ totalIngresos: 0, totalGastos: 0, saldoNeto: 0, porcentajeAhorro: 0 })

const mesLabel = computed(() => `${MESES[mes.value - 1]} ${anio.value}`)

const ORIGENES = { salario: ['💼', 'Salario'], freelance: ['💻', 'Freelance'], inversion: ['📈', 'Inversión'], otro: ['💰', 'Otro'] }
const iconoOrigen = (o) => (ORIGENES[o]?.[0]) || '💰'
const labelOrigen = (o) => (ORIGENES[o]?.[1]) || 'Otro'
function fechaCorta(f) {
  if (!f) return ''
  const [, m, d] = f.split('-').map(Number)
  return `${d}/${String(m).padStart(2, '0')}`
}

function cambiar(delta) {
  let m = mes.value + delta, a = anio.value
  if (m < 1) { m = 12; a-- }
  if (m > 12) { m = 1; a++ }
  mes.value = m; anio.value = a
  cargar()
}

async function cargar() {
  loading.value = true
  try {
    const [lista, res] = await Promise.all([
      apiFetch('/api/ingresos', { query: { mes: mes.value, anio: anio.value } }),
      apiFetch('/api/ingresos/resumen', { query: { mes: mes.value, anio: anio.value } }),
    ])
    ingresos.value = Array.isArray(lista) ? lista : []
    resumen.value = res || resumen.value
  } catch {
    ingresos.value = []
  } finally {
    loading.value = false
  }
}

onMounted(cargar)
</script>
