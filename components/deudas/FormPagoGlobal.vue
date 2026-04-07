<template>
  <SharedBaseBottomSheet title="Pago global" @close="$emit('close')">
    <!-- Person info -->
    <div class="bg-primary-900/50 rounded-xl p-3 border border-primary-700/30">
      <p class="text-xs text-gray-500 mb-1">{{ persona.nombre }}</p>
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs text-gray-500">Deudas activas</p>
          <p class="text-sm font-medium text-gray-400">{{ deudasActivas }} concepto{{ deudasActivas !== 1 ? 's' : '' }}</p>
        </div>
        <div class="text-right">
          <p class="text-xs text-gray-500">Total pendiente</p>
          <p class="text-sm font-semibold text-emerald-400">{{ currencySymbol }} {{ formatMonto(totalPendiente) }}</p>
        </div>
      </div>
    </div>

    <!-- Info -->
    <div class="bg-blue-500/10 rounded-xl p-3 border border-blue-500/20">
      <p class="text-xs text-blue-300">
        El monto se distribuira automaticamente: primero a deudas vencidas, luego a las mas antiguas.
      </p>
    </div>

    <!-- Monto del pago -->
    <div>
      <label class="block text-sm font-medium text-gray-400 mb-1.5">Monto recibido</label>
      <div class="relative">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">{{ currencySymbol }}</span>
        <input
          v-model="form.monto"
          type="number"
          step="0.01"
          placeholder="0.00"
          class="w-full pl-9 pr-4 py-3 rounded-xl bg-primary-900/80 border border-primary-700/50 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
        />
      </div>
      <div class="flex gap-2 mt-2 flex-wrap">
        <button
          class="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-900/50 text-gray-400 hover:bg-primary-700 transition-colors"
          @click="form.monto = totalPendiente"
        >
          Todo ({{ currencySymbol }} {{ formatMonto(totalPendiente) }})
        </button>
        <button
          v-if="totalPendiente > 1"
          class="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-900/50 text-gray-400 hover:bg-primary-700 transition-colors"
          @click="form.monto = Math.round(totalPendiente / 2 * 100) / 100"
        >
          Mitad
        </button>
      </div>
    </div>

    <!-- Fecha -->
    <div>
      <label class="block text-sm font-medium text-gray-400 mb-1.5">Fecha del pago</label>
      <input
        v-model="form.fecha"
        type="date"
        class="w-full px-4 py-3 rounded-xl bg-primary-900/80 border border-primary-700/50 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
      />
    </div>

    <!-- Metodo de pago -->
    <div>
      <label class="block text-sm font-medium text-gray-400 mb-1.5">Metodo de pago <span class="text-gray-600">(opcional)</span></label>
      <div class="flex gap-2 flex-wrap">
        <button
          v-for="metodo in metodos"
          :key="metodo"
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          :class="form.metodoPago === metodo ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-primary-900/50 text-gray-500 border border-transparent'"
          @click="form.metodoPago = form.metodoPago === metodo ? null : metodo"
        >
          {{ metodo }}
        </button>
      </div>
    </div>

    <!-- Notas -->
    <div>
      <label class="block text-sm font-medium text-gray-400 mb-1.5">Notas <span class="text-gray-600">(opcional)</span></label>
      <textarea
        v-model="form.notas"
        rows="2"
        placeholder="Agregar notas del pago..."
        class="w-full px-4 py-3 rounded-xl bg-primary-900/80 border border-primary-700/50 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
      ></textarea>
    </div>

    <!-- Simulación en tiempo real -->
    <div v-if="simulacion.length > 0 && !resultado" class="bg-primary-900/50 rounded-xl p-3 border border-primary-700/30 space-y-1.5">
      <p class="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">Vista previa de distribución</p>
      <div v-for="s in simulacion" :key="s.concepto" class="flex items-center justify-between text-xs">
        <div class="flex items-center gap-2 min-w-0">
          <span class="w-1.5 h-1.5 rounded-full shrink-0"
            :class="s.saldado ? 'bg-emerald-400' : 'bg-amber-400'"></span>
          <span class="text-gray-400 truncate">{{ s.concepto }}</span>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="text-white font-medium">{{ currencySymbol }} {{ formatMonto(s.pagado) }}</span>
          <span v-if="s.saldado" class="text-[9px] text-emerald-400">saldado</span>
          <span v-else class="text-[9px] text-gray-600">resta {{ currencySymbol }} {{ formatMonto(s.restante) }}</span>
        </div>
      </div>
      <div v-if="sobrante > 0" class="border-t border-primary-700/30 pt-1.5 mt-1.5">
        <p class="text-xs text-yellow-400">Sobrante: {{ currencySymbol }} {{ formatMonto(sobrante) }}</p>
      </div>
    </div>

    <p v-if="errorMsg" class="text-red-400 text-xs">{{ errorMsg }}</p>

    <!-- Result preview (after success) -->
    <div v-if="resultado" class="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20 space-y-2">
      <p class="text-xs font-medium text-emerald-400">Pago distribuido exitosamente</p>
      <div v-for="pago in resultado.pagos" :key="pago.id" class="flex items-center justify-between text-xs">
        <span class="text-gray-400">{{ pago.concepto }}</span>
        <span class="text-emerald-400 font-medium">{{ currencySymbol }} {{ formatMonto(pago.montoPagado) }}</span>
      </div>
      <div v-if="resultado.montoSobrante > 0" class="border-t border-emerald-500/20 pt-2">
        <p class="text-xs text-yellow-400">Sobrante: {{ currencySymbol }} {{ formatMonto(resultado.montoSobrante) }} (todas las deudas fueron cubiertas)</p>
      </div>
    </div>

    <button
      v-if="!resultado"
      class="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-colors mt-2 flex items-center justify-center gap-2"
      :class="saving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700'"
      :disabled="saving"
      @click="guardar"
    >
      <svg v-if="saving" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
      {{ saving ? 'Procesando...' : 'Distribuir pago' }}
    </button>

    <button
      v-if="resultado"
      class="w-full py-3.5 rounded-xl bg-primary-700 text-white font-semibold text-sm transition-colors hover:bg-primary-600"
      @click="$emit('close')"
    >
      Cerrar
    </button>
  </SharedBaseBottomSheet>
</template>

<script setup>
const props = defineProps({
  persona: { type: Object, required: true },
  totalPendiente: { type: Number, required: true },
  deudasActivas: { type: Number, required: true },
})

const emit = defineEmits(['close', 'saved'])

const { fetchResumen, fetchPersonas, fetchDeudasPersona, deudasActivasPersona: deudasActivasList } = useDeudas()

const metodos = ['Efectivo', 'Yape', 'Plin', 'Transferencia', 'Tarjeta']

const form = reactive({
  monto: null,
  fecha: new Date().toISOString().split('T')[0],
  metodoPago: null,
  notas: '',
})

const saving = ref(false)
const errorMsg = ref('')
const resultado = ref(null)

const { currencySymbol, formatMonto } = useCurrency()

const simulacion = computed(() => {
  const monto = parseFloat(form.monto) || 0
  if (monto <= 0 || deudasActivasList.value.length === 0) return []

  const hoy = new Date().toISOString().split('T')[0]

  const sorted = [...deudasActivasList.value].sort((a, b) => {
    const aVencida = a.fechaPago && a.fechaPago <= hoy
    const bVencida = b.fechaPago && b.fechaPago <= hoy
    if (aVencida && !bVencida) return -1
    if (!aVencida && bVencida) return 1
    if (!a.fechaPago && b.fechaPago) return -1
    if (a.fechaPago && !b.fechaPago) return 1
    return new Date(a.fechaCreacion) - new Date(b.fechaCreacion)
  })

  let restante = monto
  return sorted.map(d => {
    const pendiente = d.montoPendiente || 0
    const pagado = Math.min(restante, pendiente)
    restante -= pagado
    return {
      concepto: d.concepto,
      pagado,
      restante: pendiente - pagado,
      saldado: pagado >= pendiente,
    }
  }).filter(s => s.pagado > 0)
})

const sobrante = computed(() => {
  const monto = parseFloat(form.monto) || 0
  const totalAplicado = simulacion.value.reduce((sum, s) => sum + s.pagado, 0)
  return Math.max(0, monto - totalAplicado)
})

async function guardar() {
  errorMsg.value = ''

  if (!form.monto || form.monto <= 0) {
    errorMsg.value = 'Ingresa un monto valido'
    return
  }

  saving.value = true
  try {
    resultado.value = await $fetch(`/api/deudas/personas/${props.persona.id}/pago-global`, {
      method: 'POST',
      body: {
        monto: parseFloat(form.monto),
        fecha: form.fecha,
        metodoPago: form.metodoPago,
        notas: form.notas?.trim() || null,
      },
    })
    await Promise.all([
      fetchResumen(),
      fetchPersonas(),
      fetchDeudasPersona(props.persona.id),
    ])
    emit('saved')
  } catch (e) {
    errorMsg.value = handleApiError(e)
  } finally {
    saving.value = false
  }
}
</script>
