<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header with gradient accent -->
    <div class="relative px-5 pt-8 pb-6 overflow-hidden">
      <!-- Subtle background glow -->
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-blue-500/8 rounded-full blur-3xl"></div>

      <div class="relative flex items-center gap-3 mb-3">
        <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500/25 to-indigo-500/15 flex items-center justify-center border border-blue-500/10">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-bold text-gradient-blue">Mis Finanzas</h1>
          <p class="text-[11px] text-gray-500 mt-0.5">Tu asistente financiero personal</p>
        </div>
      </div>

      <!-- Greeting -->
      <p class="relative text-sm text-gray-400">{{ saludo }}, bienvenido de vuelta</p>
    </div>

    <!-- Modules -->
    <div class="px-5 space-y-3 flex-1">
      <NuxtLink
        v-for="(modulo, idx) in modulos"
        :key="modulo.to"
        :to="modulo.to"
        class="group block rounded-2xl p-4 transition-all duration-300 active:scale-[0.98] module-card"
        :class="modulo.cardClass"
        :style="{ animationDelay: `${idx * 80}ms` }"
      >
        <div class="flex items-start gap-4">
          <div
            class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105"
            :class="modulo.iconBg"
          >
            <span class="text-2xl">{{ modulo.icon }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h3 class="text-base font-semibold text-white">{{ modulo.titulo }}</h3>
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-gray-600 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p class="text-xs text-gray-400 leading-relaxed">{{ modulo.descripcion }}</p>
          </div>
        </div>
      </NuxtLink>
    </div>

    <!-- Settings link -->
    <div class="px-5 py-6">
      <NuxtLink
        to="/configuraciones"
        class="group flex items-center justify-center gap-2 w-full py-3 rounded-xl glass-card text-gray-500 text-sm hover:text-gray-300 transition-all duration-300"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 transition-transform duration-500 group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Configuraciones
      </NuxtLink>
    </div>
  </div>
</template>

<script setup>
const saludo = computed(() => {
  const hora = new Date().getHours()
  if (hora < 12) return 'Buenos dias'
  if (hora < 18) return 'Buenas tardes'
  return 'Buenas noches'
})

const modulos = [
  {
    to: '/planificador',
    icon: '\uD83D\uDCCB',
    iconBg: 'bg-gradient-to-br from-blue-500/20 to-indigo-500/10',
    cardClass: 'bg-gradient-to-br from-primary-800 to-primary-800/80 border border-blue-500/10 hover:border-blue-500/20',
    titulo: 'Planificador',
    descripcion: 'Organiza tu presupuesto mensual y distribuye tus gastos planificados por categoria.',
  },
  {
    to: '/registro',
    icon: '\uD83C\uDF99\uFE0F',
    iconBg: 'bg-gradient-to-br from-emerald-500/20 to-teal-500/10',
    cardClass: 'bg-gradient-to-br from-primary-800 to-primary-800/80 border border-emerald-500/10 hover:border-emerald-500/20',
    titulo: 'Registro de Gastos',
    descripcion: 'Registra tus gastos por voz o manualmente. Controla lo que gastas cada dia.',
  },
  {
    to: '/deudas',
    icon: '\uD83D\uDCB3',
    iconBg: 'bg-gradient-to-br from-amber-500/20 to-orange-500/10',
    cardClass: 'bg-gradient-to-br from-primary-800 to-primary-800/80 border border-amber-500/10 hover:border-amber-500/20',
    titulo: 'Deudas y Pagos',
    descripcion: 'Lleva el control de quien te debe y a quien le debes con detalle de cada concepto.',
  },
]
</script>

<style scoped>
.module-card {
  animation: fadeInUp 0.5s ease-out both;
}
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
