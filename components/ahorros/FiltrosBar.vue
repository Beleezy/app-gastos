<template>
  <div class="px-4 lg:px-0">
    <div class="flex items-center gap-2">
      <button
        class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors shrink-0"
        :class="[
          mostrarFiltros || tieneFiltrosActivos
            ? 'bg-theme-accent-bg text-theme-accent border-theme-accent'
            : 'bg-theme-card text-theme-text-sec border-theme-border'
        ]"
        @click="toggle"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Filtros
        <span v-if="conteoFiltrosActivos > 0" class="w-4 h-4 rounded-full bg-theme-accent text-theme-on-accent text-[9px] flex items-center justify-center font-bold leading-none">
          {{ conteoFiltrosActivos }}
        </span>
      </button>

      <div class="flex-1 relative">
        <input
          :value="modelBusqueda"
          type="text"
          placeholder="Buscar ahorro..."
          class="w-full pl-9 pr-8 py-2 rounded-xl bg-theme-card border border-theme-border text-theme-text placeholder-gray-600 text-sm focus:outline-none focus:border-theme-accent transition-all"
          @input="$emit('update:busqueda', $event.target.value)"
        />
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-sec" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <button
          v-if="modelBusqueda"
          class="absolute right-2.5 top-1/2 -translate-y-1/2 text-theme-text-sec"
          @click="$emit('update:busqueda', '')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <Transition name="expand">
      <div v-if="mostrarFiltros" class="mt-2 space-y-2 overflow-hidden">
        <!-- Rangos rápidos -->
        <div class="flex gap-1.5 flex-wrap">
          <button
            v-for="r in rangosRapidos"
            :key="r.value"
            class="flex-1 lg:flex-none lg:px-4 py-1.5 rounded-lg text-xs font-medium transition-colors"
            :class="rangoActivo === r.value ? 'bg-theme-accent-bg text-theme-accent border border-theme-accent' : 'bg-theme-card text-theme-text-sec border border-theme-border'"
            @click="$emit('update:rango', r.value)"
          >
            {{ r.label }}
          </button>
          <button
            v-if="tieneFiltrosActivos"
            class="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
            @click="$emit('limpiar')"
          >
            Limpiar
          </button>
        </div>

        <!-- Filtro por medio -->
        <div v-if="medios.length > 0" class="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            class="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            :class="!medioActivo ? 'bg-theme-accent-bg text-theme-accent border border-theme-accent' : 'bg-theme-card text-theme-text-sec border border-theme-border'"
            @click="$emit('update:medio', null)"
          >
            Todos
          </button>
          <button
            v-for="m in medios"
            :key="m.id"
            class="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            :class="medioActivo === m.id ? 'bg-theme-accent-bg text-theme-accent border border-theme-accent' : 'bg-theme-card text-theme-text-sec border border-theme-border'"
            @click="$emit('update:medio', m.id)"
          >
            <span>{{ m.icono || '💰' }}</span>
            {{ m.nombre }}
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
defineProps({
  modelBusqueda: { type: String, default: '' },
  rangoActivo: { type: String, required: true },
  rangosRapidos: { type: Array, required: true },
  medioActivo: { type: Number, default: null },
  medios: { type: Array, default: () => [] },
  tieneFiltrosActivos: { type: Boolean, default: false },
  conteoFiltrosActivos: { type: Number, default: 0 },
})
defineEmits(['update:busqueda', 'update:rango', 'update:medio', 'limpiar'])

const { vibrate } = useHaptic()
const mostrarFiltros = ref(false)

function toggle() {
  vibrate(10)
  mostrarFiltros.value = !mostrarFiltros.value
}
</script>

<style scoped>
.expand-enter-active, .expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.expand-enter-from, .expand-leave-to {
  opacity: 0;
  max-height: 0;
}
.expand-enter-to, .expand-leave-from {
  opacity: 1;
  max-height: 500px;
}
</style>
