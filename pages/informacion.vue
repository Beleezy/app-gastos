<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header -->
    <div class="relative px-5 pt-8 pb-4 overflow-hidden">
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-theme-accent-bg rounded-full blur-3xl"></div>
      <div class="relative flex items-center gap-3">
        <NuxtLink
          to="/"
          class="w-9 h-9 rounded-xl bg-theme-card border border-theme-border flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Volver"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-theme-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </NuxtLink>
        <div>
          <h1 class="text-xl font-bold text-gradient-blue">Información</h1>
          <p class="text-[11px] text-theme-text-sec mt-0.5">Cómo funciona cada módulo</p>
        </div>
      </div>
    </div>

    <!-- Contenido -->
    <div class="px-5 pb-6 space-y-3 flex-1">
      <div
        v-for="modulo in modulos"
        :key="modulo.titulo"
        class="rounded-2xl border border-theme-border bg-theme-card p-4"
      >
        <div class="flex items-center gap-3 mb-2.5">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" :class="modulo.iconBg">
            <component :is="modulo.icon" class="w-5 h-5" :class="modulo.iconColor" />
          </div>
          <h2 class="text-sm font-semibold text-theme-text">{{ modulo.titulo }}</h2>
        </div>
        <p class="text-xs text-theme-text-muted leading-relaxed">{{ modulo.descripcion }}</p>
      </div>

      <NuxtLink
        to="/"
        class="mt-4 w-full h-11 rounded-xl bg-theme-card border border-theme-border flex items-center justify-center gap-2 text-sm font-medium text-theme-text active:scale-[0.98] transition-transform"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Regresar
      </NuxtLink>
    </div>
  </div>
</template>

<script setup>
import { h } from 'vue'

const makeIcon = (d) => () => h('svg', {
  xmlns: 'http://www.w3.org/2000/svg',
  fill: 'none',
  viewBox: '0 0 24 24',
  'stroke-width': '1.75',
  stroke: 'currentColor'
}, [h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d })])

const IconClipboard = makeIcon('M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z')
const IconMic = makeIcon('M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z')
const IconCreditCard = makeIcon('M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z')

const modulos = [
  {
    icon: IconClipboard,
    iconBg: 'bg-theme-accent-bg',
    iconColor: 'text-theme-accent',
    titulo: 'Planificador',
    descripcion: 'Aquí defines tu presupuesto mensual y distribuyes tus gastos planificados por categoría. Es una hoja de ruta: anota cuánto piensas gastar en cada cosa y marca los ítems conforme los vas pagando.',
  },
  {
    icon: IconMic,
    iconBg: 'bg-emerald-500/15',
    iconColor: 'text-emerald-400',
    titulo: 'Registro de Gastos',
    descripcion: 'Registra tus gastos reales del día a día, ya sea dictando por voz o ingresándolos manualmente. La IA interpreta lo que dices y extrae automáticamente el monto, la categoría y la fecha.',
  },
  {
    icon: IconCreditCard,
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-400',
    titulo: 'Deudas y Pagos',
    descripcion: 'Lleva el control de lo que te deben y lo que debes. Puedes registrar múltiples conceptos por persona, hacer pagos parciales y ver el historial de cada deuda.',
  },
]
</script>
