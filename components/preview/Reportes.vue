<template>
  <div class="px-4 pt-3 pb-32">
    <PreviewPageHeader icon="📄" title="Reportes" subtitle="Resumen mensual en PDF o Excel" />

    <p class="text-[0.66rem] uppercase tracking-wider font-bold text-theme-text-muted mb-2 px-1">Módulo</p>
    <div class="grid grid-cols-2 gap-2.5 mb-4">
      <button
        v-for="m in modulos"
        :key="m.id"
        class="rounded-2xl border p-3.5 min-h-[56px] flex items-center gap-2.5 transition-colors"
        :class="modulo === m.id ? 'border-theme-accent bg-theme-accent-bg' : 'border-theme-border bg-theme-card'"
        @click="modulo = m.id"
      >
        <span class="text-lg shrink-0">{{ m.icon }}</span>
        <span class="text-sm font-medium min-w-0 truncate" :class="modulo === m.id ? 'text-theme-accent' : 'text-theme-text'">{{ m.label }}</span>
      </button>
    </div>

    <div class="grid grid-cols-2 gap-2.5 mb-4">
      <div class="min-w-0">
        <p class="text-[0.66rem] uppercase tracking-wider font-bold text-theme-text-muted mb-2 px-1">Mes</p>
        <select v-model.number="mes" class="w-full rounded-xl border border-theme-border bg-theme-input px-3 py-3 text-sm text-theme-text outline-none">
          <option v-for="(m, i) in MESES" :key="m" :value="i + 1">{{ m }}</option>
        </select>
      </div>
      <div class="min-w-0">
        <p class="text-[0.66rem] uppercase tracking-wider font-bold text-theme-text-muted mb-2 px-1">Año</p>
        <select v-model.number="anio" class="w-full rounded-xl border border-theme-border bg-theme-input px-3 py-3 text-sm text-theme-text outline-none">
          <option v-for="a in anios" :key="a" :value="a">{{ a }}</option>
        </select>
      </div>
    </div>

    <p class="text-[0.66rem] uppercase tracking-wider font-bold text-theme-text-muted mb-2 px-1">Formato</p>
    <div class="grid grid-cols-2 gap-2.5 mb-5">
      <button
        v-for="f in formatos"
        :key="f"
        class="rounded-2xl border min-h-[48px] text-sm font-semibold transition-colors"
        :class="formato === f ? 'border-theme-accent text-theme-accent bg-theme-accent-bg' : 'border-theme-border text-theme-text bg-theme-card'"
        @click="formato = f"
      >{{ f }}</button>
    </div>

    <button
      class="w-full rounded-2xl min-h-[52px] text-sm font-bold text-white bg-emerald-500 flex items-center justify-center gap-2 mb-2.5 active:scale-[0.99] transition-transform disabled:opacity-60"
      :disabled="generando"
      @click="ejecutar('compartir')"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a10 10 0 00-8.5 15.3L2 22l4.8-1.5A10 10 0 1012 2z"/></svg>
      {{ generando === 'compartir' ? 'Generando…' : 'Compartir por WhatsApp' }}
    </button>
    <button
      class="w-full rounded-2xl min-h-[52px] text-sm font-semibold text-theme-text bg-theme-card border border-theme-border active:scale-[0.99] transition-transform disabled:opacity-60"
      :disabled="generando"
      @click="ejecutar('descargar')"
    >
      {{ generando === 'descargar' ? 'Generando…' : 'Descargar' }}
    </button>
  </div>
</template>

<script setup>
// Reportes V5: genera de verdad con el mismo composable de producción.
const { generar } = useReportes()
const toast = useToast()

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const hoy = new Date()
const mes = ref(hoy.getUTCMonth() + 1)
const anio = ref(hoy.getUTCFullYear())
const anios = Array.from({ length: 4 }, (_, i) => hoy.getUTCFullYear() - i)
const modulo = ref('registro')
const formato = ref('PDF')
const generando = ref(null)

const modulos = [
  { id: 'registro', label: 'Registro', icon: '🎙️' },
  { id: 'planificador', label: 'Planificador', icon: '📋' },
  { id: 'ahorro', label: 'Ahorro', icon: '🐷' },
  { id: 'deudas', label: 'Deudas', icon: '💳' },
]
const formatos = ['PDF', 'Excel']

async function ejecutar(accion) {
  if (generando.value) return
  generando.value = accion
  try {
    await generar({
      modulo: modulo.value,
      mes: mes.value,
      anio: anio.value,
      formato: formato.value.toLowerCase() === 'excel' ? 'excel' : 'pdf',
      accion,
    })
  } catch (e) {
    toast.error(e?.message || 'No se pudo generar el reporte')
  } finally {
    generando.value = null
  }
}
</script>
