<template>
  <div class="bg-theme-card rounded-2xl p-5 border border-theme-border">
    <!-- Header -->
    <div class="flex items-center gap-2 mb-1">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <label class="text-sm font-medium text-theme-text flex-1">Google Calendar</label>
      <span
        v-if="estado.conectado && !estado.ultimoError"
        class="flex items-center gap-1 text-[10px] text-emerald-400"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Conectado
      </span>
      <span
        v-else-if="estado.conectado && estado.ultimoError"
        class="flex items-center gap-1 text-[10px] text-red-400"
        :title="estado.ultimoError"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-red-400"></span> Error
      </span>
    </div>

    <p v-if="!estado.conectado && !estado.loading" class="text-xs text-theme-text-sec mb-3">
      Sincroniza tus gastos planificados con tu calendario para recibir recordatorios el dia que toca pagar.
    </p>

    <!-- Loading -->
    <div v-if="estado.loading" class="h-10 bg-theme-input animate-pulse rounded-xl"></div>

    <!-- Desconectado -->
    <button
      v-else-if="!estado.conectado"
      class="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
      :disabled="conectando"
      @click="onConectar"
    >
      {{ conectando ? 'Abriendo Google...' : 'Conectar Google Calendar' }}
    </button>

    <!-- Conectado -->
    <div v-else class="space-y-3">
      <!-- Banner de token expirado -->
      <div
        v-if="estado.ultimoError && estado.ultimoError.toLowerCase().includes('expirado')"
        class="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-300"
      >
        <p class="font-semibold mb-1">Conexion expirada</p>
        <p class="mb-2">Tu acceso a Google Calendar caduco. Reconecta para reanudar la sincronizacion.</p>
        <button
          class="bg-red-500 hover:bg-red-600 text-white rounded-lg px-3 py-1 text-xs font-semibold transition-colors"
          @click="onConectar"
        >
          Reconectar
        </button>
      </div>

      <div class="text-xs text-theme-text-sec">
        <p>Calendario: <span class="text-theme-text">{{ estado.calendarNombre }}</span></p>
        <p>Ultima sync: {{ ultimaSyncTexto }}</p>
      </div>

      <div>
        <p class="text-xs text-theme-text font-medium mb-2">Recordatorios</p>
        <ConfiguracionesEditorRecordatorios
          :recordatorios="estado.recordatoriosConfig || []"
          @guardar="onGuardarRecordatorios"
        />
      </div>

      <div class="flex gap-2 pt-1">
        <button
          class="flex-1 bg-theme-input border border-theme-border hover:border-theme-accent rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
          :disabled="sincronizando"
          @click="onResincronizar"
        >
          {{ sincronizando ? 'Sincronizando...' : 'Sincronizar ahora' }}
        </button>
        <button
          class="bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl px-3 py-2 text-xs font-semibold transition-colors"
          @click="onDesconectarClick"
        >
          Desconectar
        </button>
      </div>
    </div>

    <!-- Dialogos de desconexion (dos pasos) -->
    <SharedConfirmDialog
      v-model="dialogoDesconectar"
      title="Desconectar Google Calendar"
      message="Dejaras de recibir recordatorios. Continuar?"
      confirm-label="Si, desconectar"
      variant="warning"
      @confirm="onConfirmarDesconectar"
    />
    <SharedConfirmDialog
      v-model="dialogoBorrarCal"
      title="Borrar tambien el calendario en Google?"
      message='Esto elimina "Mis Finanzas - Gastos planificados" y todos sus eventos de tu cuenta de Google. Si dices que no, el calendario queda intacto pero ya no se actualizara desde la app.'
      confirm-label="Si, borrarlo"
      variant="danger"
      @confirm="onConfirmarBorrarCalendario"
    />
  </div>
</template>

<script setup>
const { estado, fetchEstado, conectar, desconectar, resincronizar, actualizarRecordatorios } = useGoogleCalendar()
const toast = useToast()
const route = useRoute()
const router = useRouter()

const conectando = ref(false)
const sincronizando = ref(false)
const dialogoDesconectar = ref(false)
const dialogoBorrarCal = ref(false)

const ultimaSyncTexto = computed(() => {
  if (!estado.value.ultimaSync) return 'nunca'
  const diff = Date.now() - new Date(estado.value.ultimaSync).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'hace unos segundos'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  return new Date(estado.value.ultimaSync).toLocaleDateString('es-PE')
})

async function onConectar() {
  conectando.value = true
  try {
    await conectar()
  } catch (e) {
    toast.error('No se pudo iniciar la conexion: ' + (e?.message || e))
    conectando.value = false
  }
}

async function onResincronizar() {
  sincronizando.value = true
  try {
    const r = await resincronizar()
    toast.success(`Sincronizado: ${r.creados} creados, ${r.actualizados} actualizados, ${r.eliminados} eliminados`)
  } catch (e) {
    toast.error('Error al sincronizar: ' + (e?.message || e))
  } finally {
    sincronizando.value = false
  }
}

function onDesconectarClick() {
  dialogoDesconectar.value = true
}

function onConfirmarDesconectar() {
  dialogoDesconectar.value = false
  dialogoBorrarCal.value = true
}

async function onConfirmarBorrarCalendario() {
  await aplicarDesconexion(true)
}

// Si el usuario cierra el segundo dialogo sin confirmar, debe quedar la desconexion "solo desconectar"
// Lo manejamos con un watch
watch(dialogoBorrarCal, async (val, oldVal) => {
  if (oldVal && !val && !borrandoCal.value) {
    // El dialogo se cerro sin que el usuario confirmara: tomar como "no borrar"
    await aplicarDesconexion(false)
  }
})

const borrandoCal = ref(false)

async function aplicarDesconexion(borrarCalendario) {
  if (borrandoCal.value) return
  borrandoCal.value = true
  try {
    await desconectar(borrarCalendario)
    toast.success('Desconectado de Google Calendar')
  } catch (e) {
    toast.error('Error al desconectar: ' + (e?.message || e))
  } finally {
    borrandoCal.value = false
    dialogoBorrarCal.value = false
  }
}

async function onGuardarRecordatorios(recordatorios) {
  try {
    const r = await actualizarRecordatorios(recordatorios)
    toast.success(`Recordatorios guardados: aplicados a ${r.actualizados} eventos`)
  } catch (e) {
    toast.error('Error al guardar: ' + (e?.message || e))
  }
}

onMounted(async () => {
  await fetchEstado()
  if (route.query.gcal === 'conectado') {
    toast.success('Google Calendar conectado, sincronizando...')
    router.replace({ query: { ...route.query, gcal: undefined } })
    onResincronizar()
  } else if (route.query.gcal === 'error') {
    toast.error(`Conexion fallida: ${route.query.motivo || 'desconocido'}`)
    router.replace({ query: { ...route.query, gcal: undefined, motivo: undefined } })
  }
})
</script>
