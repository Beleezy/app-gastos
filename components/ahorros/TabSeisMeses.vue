<template>
  <AhorrosGraficoAhorroMensual
    @editar="$emit('editar', $event)"
    @eliminar="$emit('eliminar', $event)"
  />
</template>

<script setup>
defineEmits(['editar', 'eliminar'])
</script>
