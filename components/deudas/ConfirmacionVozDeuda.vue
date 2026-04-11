<template>
  <div v-if="showConfirmVoz" class="fixed inset-0 z-50 flex items-end justify-center">
    <div class="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm" @click="cerrarConfirmVoz"></div>
    <div class="relative w-full max-w-lg bg-theme-card rounded-t-3xl border-t border-theme-border max-h-[80vh] overflow-y-auto animate-slide-up">
      <div class="flex justify-center pt-3 pb-1">
        <div class="w-10 h-1 rounded-full bg-theme-border-md"></div>
      </div>
      <div class="px-5 pb-6">
        <h2 class="text-lg font-semibold text-theme-text mb-1">
          {{
            pagosParseados.length > 0 && deudasParseadas.length === 0
              ? 'Pagos detectados'
              : deudasParseadas.length > 0 && pagosParseados.length > 0
                ? 'Deudas y pagos detectados'
                : 'Deudas detectadas'
          }}
        </h2>
        <p class="text-xs text-theme-text-sec mb-4 italic">"{{ vozTranscript }}"</p>

        <div v-if="vozParsing" class="flex items-center justify-center py-8">
          <div class="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <span class="ml-3 text-sm text-theme-text-muted">Interpretando...</span>
        </div>

        <div v-else-if="vozError" class="text-center py-6">
          <p class="text-sm text-red-400 mb-3">{{ vozError }}</p>
          <button class="px-4 py-2 rounded-xl bg-purple-500/20 text-purple-400 text-sm" @click="reintentarParse">Reintentar</button>
        </div>

        <div v-else-if="deudasParseadas.length > 0 || pagosParseados.length > 0" class="space-y-3">
          <!-- Deudas nuevas -->
          <template v-if="deudasParseadas.length > 0">
            <p class="text-xs text-theme-text-sec font-medium uppercase tracking-wider">Deudas nuevas</p>
            <div v-for="(d, i) in deudasParseadas" :key="'d-'+i"
              class="bg-theme-input rounded-xl p-3 border border-theme-border">
              <div class="flex items-center gap-2 mb-2">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-medium"
                  :class="d.tipo === 'me_deben' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'">
                  {{ d.tipo === 'me_deben' ? 'Me debe' : 'Yo debo' }}
                </span>
              </div>
              <div class="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <label class="text-[10px] text-theme-text-sec">Persona</label>
                  <input v-model="d.persona" class="w-full px-2 py-1.5 rounded-lg bg-theme-card border border-theme-border text-theme-text text-xs" />
                </div>
                <div>
                  <label class="text-[10px] text-theme-text-sec">Monto</label>
                  <input v-model.number="d.monto" type="number" step="0.01" class="w-full px-2 py-1.5 rounded-lg bg-theme-card border border-theme-border text-theme-text text-xs" />
                </div>
                <div class="col-span-2">
                  <label class="text-[10px] text-theme-text-sec">Concepto</label>
                  <input v-model="d.concepto" class="w-full px-2 py-1.5 rounded-lg bg-theme-card border border-theme-border text-theme-text text-xs" />
                </div>
              </div>
            </div>
          </template>

          <!-- Pagos -->
          <template v-if="pagosParseados.length > 0">
            <p class="text-xs text-theme-text-sec font-medium uppercase tracking-wider">Pagos</p>
            <div v-for="(p, i) in pagosParseados" :key="'p-'+i"
              class="bg-theme-input rounded-xl p-3 border border-theme-accent">
              <div class="flex items-center gap-2 mb-2">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-theme-accent-bg text-theme-accent">Pago</span>
              </div>
              <div class="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <label class="text-[10px] text-theme-text-sec">Persona</label>
                  <input v-model="p.persona" class="w-full px-2 py-1.5 rounded-lg bg-theme-card border border-theme-border text-theme-text text-xs" />
                </div>
                <div>
                  <label class="text-[10px] text-theme-text-sec">Monto</label>
                  <input v-model.number="p.monto" type="number" step="0.01" class="w-full px-2 py-1.5 rounded-lg bg-theme-card border border-theme-border text-theme-text text-xs" />
                </div>
                <div class="col-span-2">
                  <label class="text-[10px] text-theme-text-sec">Notas</label>
                  <input v-model="p.notas" placeholder="Opcional..." class="w-full px-2 py-1.5 rounded-lg bg-theme-card border border-theme-border text-theme-text text-xs placeholder-gray-600" />
                </div>
              </div>
            </div>
          </template>

          <div class="flex gap-3 mt-4">
            <button class="flex-1 py-2.5 rounded-xl text-sm text-theme-text-muted border border-theme-border hover:bg-theme-border-md" @click="cerrarConfirmVoz">
              Descartar
            </button>
            <button
              class="flex-1 py-2.5 rounded-xl text-sm text-white bg-purple-500 hover:bg-purple-600 font-medium"
              :disabled="guardando"
              @click="confirmarDeudasVoz"
            >
              {{ guardando ? 'Guardando...' : 'Confirmar' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const {
  showConfirmVoz, vozTranscript, vozParsing, vozError,
  deudasParseadas, pagosParseados, guardando,
  cerrarConfirmVoz, reintentarParse, confirmarDeudasVoz,
} = useVoiceDeuda()
</script>

<style scoped>
.animate-slide-up {
  animation: slideUp 0.3s ease-out;
}
@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
</style>
