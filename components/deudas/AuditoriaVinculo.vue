<template>
  <div v-if="auditoria.length > 0" class="mb-5">
    <button class="flex items-center gap-2 mb-3 w-full" @click="show = !show">
      <span class="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
      <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Auditoría del vínculo</h3>
      <span class="text-xs text-gray-500">{{ auditoria.length }}</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="w-3 h-3 text-gray-600 ml-auto transition-transform"
        :class="show ? 'rotate-180' : ''"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <Transition name="collapse">
      <div v-if="show" class="relative pl-6">
        <div class="absolute left-2 top-2 bottom-2 w-px bg-primary-700/50"></div>

        <div v-for="entrada in auditoria" :key="entrada.id" class="relative mb-3 last:mb-0">
          <!-- Timeline dot -->
          <div
            class="absolute -left-4 top-2.5 w-2 h-2 rounded-full border-2 border-primary-900 z-10"
            :class="getAccionColor(entrada.accion)"
          ></div>

          <div class="bg-primary-800/60 rounded-xl p-3 border border-primary-700/20">
            <div class="flex items-center gap-1.5 mb-1">
              <span
                class="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                :class="getAccionBadgeClass(entrada.accion)"
              >
                {{ getAccionLabel(entrada.accion) }}
              </span>
              <span class="text-[10px] text-gray-500">{{ entrada.esMiAccion ? 'Tú' : entrada.nombreUsuario }}</span>
            </div>
            <p class="text-xs text-gray-300">{{ entrada.descripcion }}</p>
            <!-- Detailed changes for edits -->
            <div v-if="entrada.datos?.cambios && typeof entrada.datos.cambios === 'object' && !Array.isArray(entrada.datos.cambios)" class="mt-1.5 space-y-0.5">
              <div v-for="(cambio, campo) in entrada.datos.cambios" :key="campo" class="text-[10px] text-gray-500 flex items-center gap-1">
                <span class="text-gray-400 font-medium">{{ cambio.label || campo }}:</span>
                <span class="text-red-400/70 line-through">{{ cambio.antes || '(vacío)' }}</span>
                <span class="text-gray-600">&rarr;</span>
                <span class="text-emerald-400/70">{{ cambio.despues || '(vacío)' }}</span>
              </div>
            </div>
            <!-- Detailed debts for global payments -->
            <div v-if="entrada.datos?.deudasPagadas && Array.isArray(entrada.datos.deudasPagadas)" class="mt-1.5 space-y-0.5">
              <div v-for="(dp, idx) in entrada.datos.deudasPagadas" :key="idx" class="text-[10px] text-gray-500 flex items-center gap-1">
                <span class="text-teal-400/70">S/ {{ dp.monto }}</span>
                <span class="text-gray-600">&rarr;</span>
                <span class="text-gray-400">{{ dp.concepto }}</span>
              </div>
            </div>
            <p class="text-[10px] text-gray-600 mt-1">{{ formatFecha(entrada.createdAt) }}</p>
          </div>
        </div>
      </div>
    </Transition>
  </div>

  <!-- Estado vacío solo si hay vínculo activo -->
  <div v-else-if="auditoria.length === 0 && personaId" class="mb-5">
    <div class="flex items-center gap-2 mb-2">
      <span class="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
      <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Auditoría del vínculo</h3>
    </div>
    <p class="text-xs text-gray-600 pl-3">Sin actividad registrada aún.</p>
  </div>
</template>

<script setup>
defineProps({
  personaId: { type: String, required: true },
  auditoria: { type: Array, default: () => [] },
})

const show = ref(false)

function getAccionColor(accion) {
  const map = {
    vinculo_creado: 'bg-blue-500',
    vinculo_disuelto: 'bg-orange-500',
    deuda_creada: 'bg-emerald-500',
    deuda_editada: 'bg-amber-500',
    deuda_eliminada: 'bg-red-500',
    pago_creado: 'bg-teal-500',
    pago_editado: 'bg-yellow-500',
    pago_revertido: 'bg-red-400',
  }
  return map[accion] || 'bg-gray-500'
}

function getAccionBadgeClass(accion) {
  const map = {
    vinculo_creado: 'bg-blue-500/15 text-blue-400',
    vinculo_disuelto: 'bg-orange-500/15 text-orange-400',
    deuda_creada: 'bg-emerald-500/15 text-emerald-400',
    deuda_editada: 'bg-amber-500/15 text-amber-400',
    deuda_eliminada: 'bg-red-500/15 text-red-400',
    pago_creado: 'bg-teal-500/15 text-teal-400',
    pago_editado: 'bg-yellow-500/15 text-yellow-400',
    pago_revertido: 'bg-red-500/15 text-red-400',
  }
  return map[accion] || 'bg-gray-500/15 text-gray-400'
}

function getAccionLabel(accion) {
  const map = {
    vinculo_creado: 'Vínculo',
    vinculo_disuelto: 'Desvinculado',
    deuda_creada: 'Nueva deuda',
    deuda_editada: 'Deuda editada',
    deuda_eliminada: 'Deuda eliminada',
    pago_creado: 'Pago',
    pago_editado: 'Pago editado',
    pago_revertido: 'Pago revertido',
  }
  return map[accion] || accion
}

function formatFecha(fecha) {
  if (!fecha) return ''
  const d = new Date(fecha)
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}
</script>

<style scoped>
.collapse-enter-active,
.collapse-leave-active {
  transition: opacity 0.2s ease, max-height 0.3s ease;
  max-height: 2000px;
  overflow: hidden;
}
.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
