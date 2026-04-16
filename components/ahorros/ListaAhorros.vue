<template>
  <div class="px-4 lg:px-0 pb-4">
    <h3 class="text-xs font-semibold text-theme-text-muted uppercase tracking-wider mb-3">
      Registros del mes
      <span v-if="ahorrosList.length" class="text-theme-text-sec">({{ ahorrosList.length }})</span>
    </h3>

    <div v-if="isLoading" class="space-y-2">
      <div v-for="i in 3" :key="i" class="h-16 rounded-xl bg-theme-card border border-theme-border animate-pulse"></div>
    </div>

    <div v-else-if="ahorrosList.length > 0" class="space-y-2">
      <AhorrosAhorroItem
        v-for="ahorro in ahorrosList"
        :key="ahorro.id"
        :ahorro="ahorro"
        @editar="$emit('editar', $event)"
        @eliminar="$emit('eliminar', $event)"
      />
    </div>

    <div v-else class="text-center py-8">
      <div class="w-16 h-16 mx-auto mb-3 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
        <span class="text-2xl">💰</span>
      </div>
      <p class="text-sm font-medium text-theme-text-muted">Sin ahorros este mes</p>
      <p class="text-xs text-theme-text-sec mt-1">Pulsa + para registrar tu primer ahorro</p>
    </div>
  </div>
</template>

<script setup>
defineEmits(['editar', 'eliminar'])

const { ahorrosList, isLoading } = useAhorros()
</script>
