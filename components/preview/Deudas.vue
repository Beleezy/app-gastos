<template>
  <div class="px-4 pt-3 pb-32">
    <!-- ───── Sub-vista: detalle de una persona ───── -->
    <template v-if="personaSel">
      <button
        class="flex items-center gap-1.5 min-h-[44px] text-[0.78rem] font-medium text-theme-text-sec mb-2 -ml-1 px-1"
        @click="personaSel = null"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
        Volver a deudas
      </button>

      <div class="flex items-start gap-3 mb-4">
        <div
          class="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0"
          :class="tab === 'me_deben' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'"
        >{{ iniciales(personaSel.nombre) }}</div>
        <div class="min-w-0">
          <h1 class="text-base font-extrabold text-theme-text leading-snug break-words">{{ personaSel.nombre }}</h1>
          <p v-if="personaSel.contacto" class="text-[0.7rem] text-theme-text-muted mt-0.5 truncate">{{ personaSel.contacto }}</p>
        </div>
      </div>

      <div class="rounded-3xl border border-theme-border bg-gradient-to-br from-theme-card to-theme-card/60 p-4 mb-3">
        <p class="text-[0.66rem] uppercase tracking-wider font-bold text-theme-text-muted">Total pendiente</p>
        <PreviewMoney
          :value="totalPendienteDetalle"
          :tone="tab === 'me_deben' ? 'green' : 'red'"
          class="text-[1.7rem] font-extrabold block mt-1"
        />
        <template v-if="progresoCobro !== null">
          <div class="h-2 w-full rounded-full bg-theme-input overflow-hidden mt-3">
            <div class="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400" :style="{ width: progresoCobro + '%' }"></div>
          </div>
          <div class="flex items-center justify-between gap-2 mt-1.5 text-[0.7rem] text-theme-text-muted">
            <span class="min-w-0 truncate"><PreviewMoney :value="totalCobrado" entero /> {{ tab === 'me_deben' ? 'cobrado' : 'pagado' }}</span>
            <span class="shrink-0 tabular-nums">{{ progresoCobro }}%</span>
          </div>
        </template>
        <div class="grid grid-cols-2 gap-2 mt-3">
          <button
            class="min-h-[44px] rounded-xl bg-theme-accent text-theme-on-accent text-[0.78rem] font-semibold active:scale-[0.98] transition-transform"
            @click="pagoGlobalAbierto = true"
          >Pago global</button>
          <button
            class="min-h-[44px] rounded-xl bg-theme-input text-theme-text text-[0.78rem] font-semibold active:scale-[0.98] transition-transform"
            @click="abrirNuevaDeuda"
          >+ Nueva deuda</button>
        </div>
      </div>

      <p class="text-[0.66rem] uppercase tracking-wider font-bold text-theme-text-muted mb-2 px-1">
        Conceptos ({{ deudasPersona.length }})
      </p>
      <div v-if="cargandoDetalle" class="space-y-2">
        <div class="h-24 rounded-2xl bg-theme-card shimmer"></div>
        <div class="h-24 rounded-2xl bg-theme-card shimmer"></div>
      </div>
      <div v-else-if="deudasPersona.length === 0" class="rounded-2xl border border-dashed border-theme-border bg-theme-card p-8 text-center">
        <p class="text-sm text-theme-text-sec">Sin deudas activas</p>
      </div>
      <div v-else class="space-y-2">
        <article v-for="de in deudasPersona" :key="de.id" class="rounded-2xl border border-theme-border bg-theme-card p-4">
          <p class="text-sm text-theme-text leading-snug line-clamp-3 break-words">{{ de.concepto }}</p>
          <div class="flex items-center justify-between gap-2 mt-2">
            <span class="flex items-center gap-1.5 min-w-0">
              <span class="text-[0.62rem] font-semibold px-1.5 py-0.5 rounded-full shrink-0" :class="chipEstado(de.estado)">{{ labelEstado(de.estado) }}</span>
              <span class="text-[0.66rem] text-theme-text-muted truncate">{{ fechaCorta(de.fechaCreacion) }}</span>
            </span>
            <div class="text-right shrink-0">
              <PreviewMoney :value="de.montoPendiente" :tone="tab === 'me_deben' ? 'green' : 'red'" class="text-sm font-bold" />
              <p v-if="Number(de.montoPendiente) !== Number(de.montoOriginal)" class="text-[0.62rem] text-theme-text-muted">
                de <PreviewMoney :value="de.montoOriginal" entero />
              </p>
            </div>
          </div>
          <div v-if="pctPagado(de) > 0" class="h-1.5 w-full rounded-full bg-theme-input overflow-hidden mt-2.5">
            <div class="h-full rounded-full bg-sky-400" :style="{ width: pctPagado(de) + '%' }"></div>
          </div>
          <div v-if="Number(de.montoPendiente) > 0" class="flex items-center justify-end mt-2">
            <button
              class="min-h-[40px] px-3 rounded-lg bg-emerald-500/15 text-emerald-400 text-[0.74rem] font-semibold active:scale-[0.97] transition-transform"
              @click="deudaPagar = de"
            >✓ Registrar pago</button>
          </div>
        </article>
      </div>
    </template>

    <!-- ───── Vista principal: balance + personas ───── -->
    <template v-else>
      <PreviewPageHeader icon="💳" title="Deudas" subtitle="Lo que te deben y lo que debes" />

      <div v-if="loading" class="space-y-3">
        <div class="h-32 rounded-2xl bg-theme-card shimmer"></div>
        <div class="h-24 rounded-2xl bg-theme-card shimmer"></div>
        <div class="h-24 rounded-2xl bg-theme-card shimmer"></div>
      </div>

      <template v-else>
        <!-- Balance global -->
        <div class="rounded-3xl border border-theme-border bg-gradient-to-br from-theme-card to-theme-card/60 p-4 mb-3">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[0.66rem] uppercase tracking-wider font-bold text-theme-text-muted">Balance neto</span>
            <PreviewMoney :value="balance.balanceNeto" signo tone="auto" class="text-sm font-bold shrink-0" />
          </div>
          <div class="grid grid-cols-2 gap-2.5 mt-3">
            <div class="rounded-xl bg-theme-input p-3 min-w-0">
              <p class="text-[0.62rem] uppercase tracking-wide text-theme-text-muted">Me deben</p>
              <PreviewMoney :value="balance.totalMeDeben" compact entero tone="green" class="text-lg font-extrabold block mt-0.5" />
            </div>
            <div class="rounded-xl bg-theme-input p-3 min-w-0">
              <p class="text-[0.62rem] uppercase tracking-wide text-theme-text-muted">Yo debo</p>
              <PreviewMoney :value="balance.totalYoDebo" compact entero tone="red" class="text-lg font-extrabold block mt-0.5" />
            </div>
          </div>
        </div>

        <!-- Tabs me deben / yo debo -->
        <div class="flex gap-2 mb-3 p-1 rounded-2xl bg-theme-input">
          <button
            v-for="t in tabs"
            :key="t.id"
            class="flex-1 min-h-[44px] rounded-xl text-[0.8rem] font-semibold transition-colors"
            :class="tab === t.id ? 'bg-theme-card text-theme-text shadow-sm' : 'text-theme-text-muted'"
            @click="tab = t.id"
          >
            {{ t.label }}
          </button>
        </div>

        <!-- Lista de personas -->
        <div v-if="personasTab.length === 0" class="rounded-2xl border border-dashed border-theme-border bg-theme-card p-8 text-center">
          <p class="text-sm text-theme-text">Sin deudas en esta sección</p>
          <button class="mt-3 min-h-[44px] px-4 rounded-xl bg-theme-accent text-theme-on-accent text-sm font-semibold active:scale-[0.98] transition-transform" @click="abrirNuevaDeuda">
            + Registrar una deuda
          </button>
        </div>
        <div v-else class="space-y-2">
          <button
            v-for="p in personasTab"
            :key="p.id"
            class="w-full text-left rounded-2xl border bg-theme-card p-4 active:scale-[0.99] transition-transform"
            :class="p.tieneVencidas ? 'border-red-500/40' : 'border-theme-border'"
            @click="abrirPersona(p)"
          >
            <div class="flex items-start gap-3">
              <div
                class="w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0"
                :class="tab === 'me_deben' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'"
              >{{ iniciales(p.nombre) }}</div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-theme-text leading-snug line-clamp-2 break-words">{{ p.nombre }}</p>
                <p class="text-[0.7rem] text-theme-text-muted mt-0.5">
                  {{ p.deudasActivas }} deuda{{ p.deudasActivas !== 1 ? 's' : '' }}
                  <span v-if="p.tieneVencidas" class="text-red-400 font-medium"> · {{ p.countVencidas }} vencida{{ p.countVencidas !== 1 ? 's' : '' }}</span>
                </p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-theme-text-muted shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
            </div>
            <div class="flex items-center justify-between gap-2 mt-2.5 pt-2.5 border-t border-theme-border/50">
              <span class="text-[0.66rem] uppercase tracking-wide text-theme-text-muted">Pendiente</span>
              <PreviewMoney :value="p.totalPendiente" :tone="tab === 'me_deben' ? 'green' : 'red'" class="text-base font-extrabold shrink-0" />
            </div>
          </button>
        </div>
      </template>
    </template>

    <!-- FAB: nueva deuda con el formulario REAL -->
    <button
      class="fixed bottom-24 right-4 z-20 w-14 h-14 rounded-full bg-theme-accent text-theme-on-accent shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      aria-label="Agregar nueva deuda"
      @click="abrirNuevaDeuda"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
    </button>

    <DeudasFormDeuda
      v-if="formDeudaAbierto"
      :persona-predefinida="personaSel"
      @close="cerrarForms"
      @saved="onGuardado"
    />
    <DeudasFormPago
      v-if="deudaPagar"
      :deuda="deudaPagar"
      @close="cerrarForms"
      @saved="onGuardado"
    />
    <DeudasFormPagoGlobal
      v-if="pagoGlobalAbierto && personaSel"
      :persona="personaSel"
      :total-pendiente="totalPendienteDetalle"
      :deudas-activas="deudasActivasDetalle"
      @close="cerrarForms"
      @saved="onGuardado"
    />
  </div>
</template>

<script setup>
const { apiFetch } = useApiFetch()

const loading = ref(true)
const balance = ref({ totalMeDeben: 0, totalYoDebo: 0, balanceNeto: 0 })
const personas = ref({ me_deben: [], yo_debo: [] })
const tab = ref('me_deben')

const personaSel = ref(null)
const deudasPersona = ref([])
const cargandoDetalle = ref(false)

const formDeudaAbierto = ref(false)
const deudaPagar = ref(null)
const pagoGlobalAbierto = ref(false)

const tabs = [
  { id: 'me_deben', label: 'Me deben' },
  { id: 'yo_debo', label: 'Yo debo' },
]

const personasTab = computed(() => personas.value[tab.value] || [])

const MES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
function fechaCorta(f) {
  if (!f) return ''
  const [y, m, d] = f.split('-').map(Number)
  return `${d} ${MES_CORTO[m - 1]} ${y}`
}

function iniciales(nombre) {
  if (!nombre) return '?'
  const palabras = nombre.trim().split(/\s+/).filter(w => /[a-zA-Z0-9]/.test(w))
  if (!palabras.length) return nombre.slice(0, 2).toUpperCase()
  if (palabras.length === 1) return palabras[0].slice(0, 2).toUpperCase()
  return (palabras[0][0] + palabras[1][0]).toUpperCase()
}

const ESTADOS = {
  pendiente: { label: 'Pendiente', clase: 'bg-amber-500/15 text-amber-400' },
  parcial: { label: 'Parcial', clase: 'bg-sky-500/15 text-sky-400' },
  pagado: { label: 'Saldada', clase: 'bg-emerald-500/15 text-emerald-400' },
  archivado: { label: 'Archivada', clase: 'bg-theme-border-md text-theme-text-muted' },
}
const labelEstado = (e) => ESTADOS[e]?.label || e
const chipEstado = (e) => ESTADOS[e]?.clase || 'bg-theme-border-md text-theme-text-muted'

function pctPagado(de) {
  const orig = Number(de.montoOriginal) || 0
  if (orig <= 0) return 0
  return Math.round(((orig - (Number(de.montoPendiente) || 0)) / orig) * 100)
}

const totalOriginal = computed(() => deudasPersona.value.reduce((s, d) => s + (Number(d.montoOriginal) || 0), 0))
const totalPendienteDetalle = computed(() => deudasPersona.value.reduce((s, d) => s + (Number(d.montoPendiente) || 0), 0))
const totalCobrado = computed(() => totalOriginal.value - totalPendienteDetalle.value)
const deudasActivasDetalle = computed(() => deudasPersona.value.filter(d => Number(d.montoPendiente) > 0).length)
const progresoCobro = computed(() => {
  if (cargandoDetalle.value || totalOriginal.value <= 0) return null
  return Math.round((totalCobrado.value / totalOriginal.value) * 100)
})

function abrirNuevaDeuda() {
  formDeudaAbierto.value = true
}
function cerrarForms() {
  formDeudaAbierto.value = false
  deudaPagar.value = null
  pagoGlobalAbierto.value = false
}
async function onGuardado() {
  cerrarForms()
  await cargar()
  if (personaSel.value) await cargarDetalle(personaSel.value.id)
}

async function abrirPersona(p) {
  personaSel.value = p
  await cargarDetalle(p.id)
}

async function cargarDetalle(personaId) {
  cargandoDetalle.value = true
  try {
    const r = await apiFetch('/api/deudas', { query: { personaId } })
    deudasPersona.value = Array.isArray(r) ? r : []
  } catch {
    deudasPersona.value = []
  } finally {
    cargandoDetalle.value = false
  }
}

async function cargar() {
  try {
    const [bal, md, yd] = await Promise.all([
      apiFetch('/api/deudas/balance'),
      apiFetch('/api/deudas/personas', { query: { tipo: 'me_deben' } }),
      apiFetch('/api/deudas/personas', { query: { tipo: 'yo_debo' } }),
    ])
    balance.value = bal || balance.value
    personas.value = {
      me_deben: Array.isArray(md) ? md : [],
      yo_debo: Array.isArray(yd) ? yd : [],
    }
  } catch {
    // preview: silencioso
  } finally {
    loading.value = false
  }
}

onMounted(cargar)
</script>
