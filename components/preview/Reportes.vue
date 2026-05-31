<template>
  <div class="px-4 pt-3 pb-28">
    <h1 class="text-2xl font-extrabold text-gradient-blue leading-tight mb-0.5">Reportes</h1>
    <p class="text-[0.78rem] text-theme-text-sec mb-4">Resumen mensual en PDF o Excel</p>

    <div class="rounded-2xl border border-theme-border bg-theme-card p-3.5 mb-3 text-[0.74rem] text-theme-text-sec">
      Generando para: <span class="text-theme-text font-semibold">Yo</span>. Cambia el perfil arriba si quieres el de otro familiar.
    </div>

    <p class="text-[0.6rem] uppercase tracking-wider font-bold text-theme-text-muted mb-2 px-1">Módulo</p>
    <div class="grid grid-cols-2 gap-2.5 mb-4">
      <button
        v-for="m in modulos"
        :key="m.id"
        class="rounded-2xl border p-3.5 flex items-center gap-2.5 transition-colors"
        :class="modulo === m.id ? 'border-theme-accent bg-theme-accent-bg' : 'border-theme-border bg-theme-card'"
        @click="modulo = m.id"
      >
        <span class="text-lg">{{ m.icon }}</span>
        <span class="text-sm font-medium" :class="modulo === m.id ? 'text-theme-accent' : 'text-theme-text'">{{ m.label }}</span>
      </button>
    </div>

    <div class="grid grid-cols-2 gap-2.5 mb-4">
      <div>
        <p class="text-[0.6rem] uppercase tracking-wider font-bold text-theme-text-muted mb-2 px-1">Mes</p>
        <div class="rounded-xl border border-theme-border bg-theme-input px-4 py-3 text-sm text-theme-text">{{ MESES[mes - 1] }}</div>
      </div>
      <div>
        <p class="text-[0.6rem] uppercase tracking-wider font-bold text-theme-text-muted mb-2 px-1">Año</p>
        <div class="rounded-xl border border-theme-border bg-theme-input px-4 py-3 text-sm text-theme-text">{{ anio }}</div>
      </div>
    </div>

    <p class="text-[0.6rem] uppercase tracking-wider font-bold text-theme-text-muted mb-2 px-1">Formato</p>
    <div class="grid grid-cols-2 gap-2.5 mb-5">
      <button
        v-for="f in formatos"
        :key="f"
        class="rounded-2xl border py-3 text-sm font-semibold transition-colors"
        :class="formato === f ? 'border-theme-accent text-theme-accent bg-theme-accent-bg' : 'border-theme-border text-theme-text bg-theme-card'"
        @click="formato = f"
      >{{ f }}</button>
    </div>

    <button class="w-full rounded-2xl py-3.5 text-sm font-bold text-white bg-emerald-500 flex items-center justify-center gap-2 mb-2.5">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a10 10 0 00-8.5 15.3L2 22l4.8-1.5A10 10 0 1012 2z"/></svg>
      Compartir por WhatsApp
    </button>
    <button class="w-full rounded-2xl py-3.5 text-sm font-semibold text-theme-text bg-theme-card border border-theme-border">
      Descargar
    </button>
  </div>
</template>

<script setup>
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const hoy = new Date()
const mes = ref(hoy.getUTCMonth() + 1)
const anio = ref(hoy.getUTCFullYear())
const modulo = ref('registro')
const formato = ref('PDF')
const modulos = [
  { id: 'registro', label: 'Registro', icon: '🎤' },
  { id: 'planificador', label: 'Planificador', icon: '📋' },
  { id: 'ahorro', label: 'Ahorro', icon: '🐷' },
  { id: 'deudas', label: 'Deudas', icon: '💳' },
]
const formatos = ['PDF', 'Excel']
</script>
