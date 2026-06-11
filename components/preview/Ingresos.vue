<template>
  <div class="px-4 pt-3 pb-32">
    <PreviewPageHeader icon="💵" title="Ingresos" subtitle="Tu flujo neto del mes" accent="green" />

    <PreviewMonthNav :label="mesLabel" @prev="cambiar(-1)" @next="cambiar(1)" />

    <div v-if="loading" class="space-y-3">
      <div class="h-36 rounded-2xl bg-theme-card shimmer"></div>
      <div class="h-24 rounded-2xl bg-theme-card shimmer"></div>
    </div>

    <template v-else>
      <!-- Saldo neto -->
      <div class="rounded-3xl border border-theme-border bg-gradient-to-br from-emerald-500/5 to-theme-card p-4 mb-3">
        <p class="text-[0.66rem] uppercase tracking-wider font-bold text-theme-text-muted">Saldo neto</p>
        <PreviewMoney :value="resumen.saldoNeto" signo tone="auto" class="text-[1.7rem] font-extrabold block mt-1" />
        <p class="text-[0.7rem] mt-0.5" :class="resumen.porcentajeAhorro >= 0 ? 'text-emerald-400' : 'text-red-400'">
          {{ resumen.porcentajeAhorro }}% de ahorro sobre ingresos
        </p>
        <div class="grid grid-cols-2 gap-2.5 mt-3">
          <div class="rounded-xl bg-theme-input p-3 min-w-0">
            <p class="text-[0.62rem] uppercase tracking-wide text-theme-text-muted">Ingresos</p>
            <PreviewMoney :value="resumen.totalIngresos" entero tone="green" class="text-base font-bold block mt-0.5" />
          </div>
          <div class="rounded-xl bg-theme-input p-3 min-w-0">
            <p class="text-[0.62rem] uppercase tracking-wide text-theme-text-muted">Gastos</p>
            <PreviewMoney :value="resumen.totalGastos" entero tone="red" class="text-base font-bold block mt-0.5" />
          </div>
        </div>
      </div>

      <!-- Registrar / editar con el formulario REAL -->
      <button
        class="w-full min-h-[52px] rounded-2xl border-2 border-dashed border-emerald-500/40 text-emerald-400 text-sm font-semibold flex items-center justify-center gap-2 mb-3 active:scale-[0.99] transition-transform"
        @click="toggleForm"
      >
        {{ mostrarForm ? '− Cancelar' : (editando ? 'Editar ingreso' : '+ Registrar ingreso') }}
      </button>
      <div v-if="mostrarForm" class="rounded-2xl border border-theme-border bg-theme-card p-4 mb-3">
        <IngresosFormIngreso :editing="editando" @saved="onGuardado" @cancel="cerrarForm" />
      </div>

      <!-- Lista de ingresos -->
      <div v-if="ingresos.length === 0" class="rounded-2xl border border-dashed border-theme-border bg-theme-card p-8 text-center">
        <p class="text-sm text-theme-text-sec">Sin ingresos este mes</p>
      </div>
      <div v-else class="space-y-2">
        <article v-for="ing in ingresos" :key="ing.id" class="rounded-2xl border border-theme-border bg-theme-card p-4">
          <div class="flex items-start gap-3">
            <span class="w-10 h-10 rounded-2xl bg-emerald-500/15 flex items-center justify-center shrink-0 text-base">{{ iconoOrigen(ing.origen) }}</span>
            <div class="min-w-0 flex-1">
              <p class="text-sm text-theme-text font-medium leading-snug line-clamp-2 break-words">{{ ing.concepto }}</p>
              <div class="flex items-center justify-between gap-2 mt-1">
                <p class="text-[0.66rem] text-theme-text-muted truncate">{{ fechaCorta(ing.fecha) }}<span v-if="ing.origen"> · {{ ing.origen }}</span></p>
                <span class="flex items-center gap-0.5 shrink-0">
                  <PreviewMoney :value="ing.monto" signo tone="green" class="text-base font-bold mr-1" />
                  <button class="w-9 h-9 -my-1.5 rounded-lg flex items-center justify-center text-theme-text-muted active:text-theme-accent active:bg-theme-accent-bg transition-colors" aria-label="Editar ingreso" @click="abrirEdicion(ing)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button class="w-9 h-9 -my-1.5 -mr-1.5 rounded-lg flex items-center justify-center text-theme-text-muted active:text-red-400 active:bg-red-500/10 transition-colors" aria-label="Eliminar ingreso" @click="pedirEliminar(ing)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </span>
              </div>
            </div>
          </div>
        </article>
      </div>
    </template>

    <SharedConfirmDialog
      v-model="confirmandoEliminar"
      title="Eliminar ingreso"
      :message="ingresoEliminar ? `¿Eliminar '${ingresoEliminar.concepto}'? Irá a la papelera (30 días).` : ''"
      confirm-label="Eliminar"
      :loading="eliminando"
      @confirm="confirmarEliminar"
    />
  </div>
</template>

<script setup>
const { apiFetch } = useApiFetch()
const { eliminarIngreso } = useIngresos()
const toast = useToast()

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

const hoy = new Date()
const mes = ref(hoy.getUTCMonth() + 1)
const anio = ref(hoy.getUTCFullYear())
const loading = ref(true)
const ingresos = ref([])
const resumen = ref({ totalIngresos: 0, totalGastos: 0, saldoNeto: 0, porcentajeAhorro: 0 })

const mostrarForm = ref(false)
const editando = ref(null)
const confirmandoEliminar = ref(false)
const ingresoEliminar = ref(null)
const eliminando = ref(false)

const mesLabel = computed(() => `${MESES[mes.value - 1]} ${anio.value}`)

const ICONOS_ORIGEN = { trabajo: '💼', salario: '💼', freelance: '💻', inversion: '📈', 'préstamos': '🤝', prestamos: '🤝' }
const iconoOrigen = (o) => ICONOS_ORIGEN[(o || '').toLowerCase()] || '💰'

function fechaCorta(f) {
  if (!f) return ''
  const [, m, d] = f.split('-').map(Number)
  return `${d}/${String(m).padStart(2, '0')}`
}

function toggleForm() {
  if (mostrarForm.value) return cerrarForm()
  editando.value = null
  mostrarForm.value = true
}
function abrirEdicion(ing) {
  editando.value = ing
  mostrarForm.value = true
}
function cerrarForm() {
  mostrarForm.value = false
  editando.value = null
}
function onGuardado() {
  cerrarForm()
  cargar()
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
    await cargar()
  } catch {
    toast.error('No se pudo eliminar el ingreso')
  } finally {
    eliminando.value = false
    confirmandoEliminar.value = false
    ingresoEliminar.value = null
  }
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
