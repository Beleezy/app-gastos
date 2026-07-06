<template>
  <div class="min-h-screen pb-4">
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
        <div class="flex-1 min-w-0">
          <h1 class="text-xl font-bold text-theme-text">Reportes</h1>
          <p class="text-[0.6875rem] text-theme-text-sec mt-0.5">Resumen mensual en PDF o Excel</p>
        </div>
      </div>
    </div>

    <div class="px-5 space-y-4">
      <!-- Contexto del perfil -->
      <div class="rounded-2xl border border-theme-border bg-theme-card p-3 text-xs text-theme-text-sec">
        Generando para: <strong class="text-theme-text">{{ nombrePerfilActivo }}</strong>.
        <template v-if="perfiles.length > 0">
          Cambia el perfil en la barra "Viendo:" al inicio de la página si quieres el reporte de otro familiar.
        </template>
      </div>

      <!-- Módulo -->
      <div>
        <label class="block text-[0.6875rem] uppercase tracking-wider text-theme-text-muted mb-1.5 px-1">Módulo</label>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="m in MODULOS_REPORTE"
            :key="m.valor"
            class="py-2.5 rounded-xl border text-sm font-medium transition-colors"
            :class="modulo === m.valor ? 'border-theme-accent bg-theme-accent-bg text-theme-accent' : 'border-theme-border bg-theme-card text-theme-text-sec'"
            @click="modulo = m.valor"
          >{{ m.label }}</button>
        </div>
      </div>

      <!-- Mes / Año -->
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[0.6875rem] uppercase tracking-wider text-theme-text-muted mb-1.5 px-1">Mes</label>
          <select v-model.number="mes" class="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-sm text-theme-text">
            <option v-for="(n, i) in MESES" :key="i" :value="i + 1">{{ n }}</option>
          </select>
        </div>
        <div>
          <label class="block text-[0.6875rem] uppercase tracking-wider text-theme-text-muted mb-1.5 px-1">Año</label>
          <select v-model.number="anio" class="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-sm text-theme-text">
            <option v-for="a in anios" :key="a" :value="a">{{ a }}</option>
          </select>
        </div>
      </div>

      <p v-if="modulo === 'deudas'" class="text-[0.6875rem] text-theme-text-muted px-1">
        El reporte de deudas muestra el estado actual de las deudas pendientes (no depende del mes).
      </p>

      <!-- Formato -->
      <div>
        <label class="block text-[0.6875rem] uppercase tracking-wider text-theme-text-muted mb-1.5 px-1">Formato</label>
        <div class="grid grid-cols-2 gap-2">
          <button
            class="py-2.5 rounded-xl border text-sm font-medium transition-colors"
            :class="formato === 'pdf' ? 'border-theme-accent bg-theme-accent-bg text-theme-accent' : 'border-theme-border bg-theme-card text-theme-text-sec'"
            @click="formato = 'pdf'"
          >PDF</button>
          <button
            class="py-2.5 rounded-xl border text-sm font-medium transition-colors"
            :class="formato === 'excel' ? 'border-theme-accent bg-theme-accent-bg text-theme-accent' : 'border-theme-border bg-theme-card text-theme-text-sec'"
            @click="formato = 'excel'"
          >Excel</button>
        </div>
      </div>

      <!-- Acciones -->
      <div class="flex flex-col gap-2 pt-1">
        <button
          class="w-full py-3 rounded-xl bg-emerald-500 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          :disabled="generando"
          @click="ejecutar('compartir')"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-.607z"/></svg>
          {{ generando ? 'Generando…' : 'Compartir por WhatsApp' }}
        </button>
        <button
          class="w-full py-3 rounded-xl bg-theme-card border border-theme-border text-theme-text-sec text-sm font-medium disabled:opacity-50"
          :disabled="generando"
          @click="ejecutar('descargar')"
        >
          Descargar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
useHead({ title: 'Reportes · Mis Finanzas' })

const { generar, MODULOS_REPORTE } = useReportes()
const { nombrePerfilActivo, fetchPerfiles, perfiles } = usePerfiles()
const toast = useToast()

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const hoy = new Date()
const modulo = ref('registro')
const mes = ref(hoy.getMonth() + 1)
const anio = ref(hoy.getFullYear())
const formato = ref('pdf')
const generando = ref(false)
const anios = [0, 1, 2, 3].map((d) => hoy.getFullYear() - d)

onMounted(() => {
  if (!perfiles.value.length) fetchPerfiles()
})

async function ejecutar(accion) {
  generando.value = true
  try {
    await generar({ modulo: modulo.value, mes: mes.value, anio: anio.value, formato: formato.value, accion })
  } catch (e) {
    toast.error(e?.data?.message || 'No se pudo generar el reporte')
  } finally {
    generando.value = false
  }
}
</script>
