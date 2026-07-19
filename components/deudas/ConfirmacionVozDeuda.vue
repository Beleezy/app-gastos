<template>
  <SharedBaseBottomSheet v-if="showConfirmVoz" :title="tituloConfirm" @close="cerrarConfirmVoz">
    <p class="text-xs text-theme-text-sec italic">"{{ vozTranscript }}"</p>

    <div v-if="vozParsing" class="flex items-center justify-center py-8">
      <div
        class="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"
      ></div>
      <span class="ml-3 text-sm text-theme-text-muted">Interpretando...</span>
    </div>

    <div v-else-if="vozError" class="text-center py-6">
      <p class="text-sm text-red-400 mb-3">{{ vozError }}</p>
      <button
        class="px-4 py-2 rounded-xl bg-purple-500/20 text-purple-400 text-sm"
        @click="reintentarParse"
      >
        Reintentar
      </button>
    </div>

    <div v-else-if="deudasParseadas.length > 0 || pagosParseados.length > 0" class="space-y-3">
      <!-- Deudas nuevas -->
      <template v-if="deudasParseadas.length > 0">
        <p class="text-xs text-theme-text-sec font-medium uppercase tracking-wider">
          Deudas nuevas
        </p>
        <div
          v-for="(d, i) in deudasParseadas"
          :key="'d-' + i"
          class="bg-theme-input rounded-xl p-3 border border-theme-border"
        >
          <div class="flex items-center gap-2 mb-2">
            <span
              class="px-2 py-0.5 rounded-full text-[0.6875rem] font-medium"
              :class="
                d.tipo === 'me_deben'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/20 text-red-400'
              "
            >
              {{ d.tipo === 'me_deben' ? 'Me debe' : 'Yo debo' }}
            </span>
          </div>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div>
              <label class="text-[0.6875rem] text-theme-text-sec">Persona</label>
              <input
                v-model="d.persona"
                class="w-full px-2 py-1.5 rounded-lg bg-theme-card border border-theme-border text-theme-text text-xs"
              />
            </div>
            <div>
              <label class="text-[0.6875rem] text-theme-text-sec">Monto</label>
              <input
                v-model.number="d.monto"
                type="number"
                step="0.01"
                class="w-full px-2 py-1.5 rounded-lg bg-theme-card border border-theme-border text-theme-text text-xs"
              />
            </div>
            <div class="col-span-2">
              <label class="text-[0.6875rem] text-theme-text-sec">Concepto</label>
              <input
                v-model="d.concepto"
                class="w-full px-2 py-1.5 rounded-lg bg-theme-card border border-theme-border text-theme-text text-xs"
              />
            </div>
          </div>
        </div>
      </template>

      <!-- Pagos -->
      <template v-if="pagosParseados.length > 0">
        <p class="text-xs text-theme-text-sec font-medium uppercase tracking-wider">Pagos</p>
        <div
          v-for="(p, i) in pagosParseados"
          :key="'p-' + i"
          class="bg-theme-input rounded-xl p-3 border border-theme-accent"
        >
          <div class="flex items-center gap-2 mb-2">
            <span
              class="px-2 py-0.5 rounded-full text-[0.6875rem] font-medium bg-theme-accent-bg text-theme-accent"
              >Pago</span
            >
          </div>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div>
              <label class="text-[0.6875rem] text-theme-text-sec">Persona</label>
              <input
                v-model="p.persona"
                class="w-full px-2 py-1.5 rounded-lg bg-theme-card border border-theme-border text-theme-text text-xs"
              />
            </div>
            <div>
              <label class="text-[0.6875rem] text-theme-text-sec">Monto</label>
              <input
                v-model.number="p.monto"
                type="number"
                step="0.01"
                class="w-full px-2 py-1.5 rounded-lg bg-theme-card border border-theme-border text-theme-text text-xs"
              />
            </div>
            <div class="col-span-2">
              <label class="text-[0.6875rem] text-theme-text-sec">Notas</label>
              <input
                v-model="p.notas"
                placeholder="Opcional..."
                class="w-full px-2 py-1.5 rounded-lg bg-theme-card border border-theme-border text-theme-text text-xs placeholder-gray-600"
              />
            </div>
          </div>
        </div>
      </template>
    </div>

    <template #footer>
      <div class="flex gap-3">
        <button
          class="flex-1 py-2.5 rounded-xl text-sm text-theme-text-muted border border-theme-border hover:bg-theme-border-md"
          @click="cerrarConfirmVoz"
        >
          Descartar
        </button>
        <button
          class="flex-1 py-2.5 rounded-xl text-sm text-white bg-purple-500 hover:bg-purple-600 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="
            guardando || vozParsing || (deudasParseadas.length === 0 && pagosParseados.length === 0)
          "
          @click="confirmarDeudasVoz"
        >
          {{ guardando ? 'Guardando...' : 'Confirmar' }}
        </button>
      </div>
    </template>
  </SharedBaseBottomSheet>
</template>

<script setup>
const {
  showConfirmVoz,
  vozTranscript,
  vozParsing,
  vozError,
  deudasParseadas,
  pagosParseados,
  guardando,
  cerrarConfirmVoz,
  reintentarParse,
  confirmarDeudasVoz,
} = useVoiceDeuda()

const tituloConfirm = computed(() => {
  if (pagosParseados.value.length > 0 && deudasParseadas.value.length === 0)
    return 'Pagos detectados'
  if (deudasParseadas.value.length > 0 && pagosParseados.value.length > 0)
    return 'Deudas y pagos detectados'
  return 'Deudas detectadas'
})
</script>
