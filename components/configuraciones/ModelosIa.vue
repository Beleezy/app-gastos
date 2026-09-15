<template>
  <section
    v-if="esSuperadmin"
    class="bg-theme-card rounded-2xl p-5 border border-theme-accent/30 mt-4"
    data-testid="modelos-ia"
  >
    <div class="flex items-start justify-between gap-3 mb-3">
      <div class="min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <h3 class="font-semibold text-theme-text">Modelos de IA</h3>
          <span
            class="px-2 py-0.5 rounded-full bg-theme-accent text-theme-on-accent text-[0.6875rem] font-bold uppercase tracking-wider shrink-0"
            >Superadmin</span
          >
        </div>
        <p class="text-sm text-theme-text-sec leading-relaxed">
          Qué modelos de Google usa el registro por voz y foto, en orden. Un modelo que falla
          {{ maxFallos }} veces seguidas se apaga solo; el descubrimiento semanal da de alta los
          nuevos y retira los que Google ya no lista.
        </p>
      </div>
    </div>

    <div class="flex flex-wrap gap-2 mb-4">
      <button
        type="button"
        class="px-3 py-2.5 rounded-xl bg-theme-accent text-theme-on-accent text-sm font-semibold disabled:opacity-50 tap-target"
        :disabled="descubriendo || !descubrimientoDisponible"
        :title="descubrimientoDisponible ? '' : 'Falta GEMINI_API_KEY en el servidor'"
        data-testid="modelos-descubrir"
        @click="descubrir"
      >
        {{ descubriendo ? 'Consultando a Google...' : 'Descubrir modelos ahora' }}
      </button>
      <form class="flex gap-2 flex-1 min-w-[220px]" @submit.prevent="agregar">
        <input
          v-model="nuevoNombre"
          type="text"
          placeholder="gemini-2.5-flash-lite"
          class="flex-1 min-w-0 px-3 py-2 rounded-xl bg-theme-input border border-theme-border text-theme-text text-sm focus:outline-none focus:border-theme-accent"
          aria-label="Nombre del modelo a añadir"
          data-testid="modelos-nuevo-nombre"
        />
        <button
          type="submit"
          class="px-3 py-2 rounded-xl bg-theme-border-md text-theme-text text-sm font-semibold disabled:opacity-50 tap-target"
          :disabled="!nuevoNombre.trim() || agregando"
          data-testid="modelos-agregar"
        >
          Añadir
        </button>
      </form>
    </div>

    <p
      v-if="resumenDescubrimiento"
      class="text-xs text-theme-text-sec mb-3"
      data-testid="modelos-resumen"
    >
      {{ resumenDescubrimiento }}
    </p>

    <div v-if="cargando" class="space-y-2" aria-busy="true">
      <div v-for="i in 2" :key="i" class="h-16 rounded-xl bg-theme-border-md shimmer"></div>
    </div>

    <p v-else-if="!modelos.length" class="text-sm text-theme-text-muted">
      No hay modelos en el catálogo. Descubre o añade uno.
    </p>

    <ul v-else class="space-y-2">
      <li
        v-for="m in modelos"
        :key="m.id"
        class="rounded-xl border border-theme-border p-3 flex flex-col gap-2"
        :class="m.activo ? '' : 'opacity-75'"
        data-testid="modelo-item"
      >
        <div class="flex items-center gap-2 min-w-0">
          <span class="font-mono text-sm text-theme-text truncate flex-1 min-w-0" :title="m.nombre">
            {{ m.nombre }}
          </span>
          <span
            class="text-[0.6875rem] px-1.5 py-0.5 rounded-full leading-none shrink-0"
            :class="estadoDe(m).clase"
            >{{ estadoDe(m).etiqueta }}</span
          >
        </div>
        <p
          v-if="m.ultimoError"
          class="text-[0.6875rem] text-theme-text-muted truncate"
          :title="m.ultimoError"
        >
          Último error: {{ m.ultimoError }}
        </p>
        <div class="flex items-center gap-2 flex-wrap">
          <label class="flex items-center gap-1.5 text-xs text-theme-text-sec">
            Prioridad
            <input
              type="number"
              min="0"
              max="1000"
              :value="m.prioridad"
              class="w-20 px-2 py-1.5 rounded-lg bg-theme-input border border-theme-border text-theme-text text-sm"
              :aria-label="`Prioridad de ${m.nombre}`"
              @change="cambiarPrioridad(m, $event)"
            />
          </label>
          <span class="text-[0.6875rem] text-theme-text-muted">{{ origenLabel(m.origen) }}</span>
          <span class="flex-1"></span>
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold tap-target"
            :class="
              m.activo
                ? 'bg-theme-border-md text-theme-text'
                : 'bg-theme-accent text-theme-on-accent'
            "
            :data-testid="`modelo-toggle-${m.nombre}`"
            @click="alternar(m)"
          >
            {{ m.activo ? 'Apagar' : 'Encender' }}
          </button>
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 bg-red-500/10 tap-target"
            :aria-label="`Quitar ${m.nombre}`"
            @click="quitar(m)"
          >
            Quitar
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup>
// Catálogo de modelos de IA (tabla modelos_llm). Solo superadmin: el
// endpoint responde 403 al resto, y aquí ni se pinta.
const { esSuperadmin, fetchMe } = useSuperadmin()
const { apiFetch } = useApiFetch()
const toast = useToast()

const modelos = ref([])
const maxFallos = ref(3)
const descubrimientoDisponible = ref(false)
const cargando = ref(false)
const descubriendo = ref(false)
const agregando = ref(false)
const nuevoNombre = ref('')
const resumenDescubrimiento = ref('')

async function cargar() {
  cargando.value = true
  try {
    const data = await apiFetch('/api/superadmin/modelos', { query: { _t: Date.now() } })
    modelos.value = data.modelos || []
    maxFallos.value = data.maxFallos ?? 3
    descubrimientoDisponible.value = !!data.descubrimientoDisponible
  } catch (e) {
    toast.error(handleApiError(e, 'No se pudo cargar el catálogo de modelos'))
  } finally {
    cargando.value = false
  }
}

function estadoDe(m) {
  if (m.activo) return { etiqueta: 'Activo', clase: 'bg-emerald-500/15 text-emerald-400' }
  if (m.desactivadoAuto)
    return { etiqueta: 'Apagado por fallos', clase: 'bg-red-500/15 text-red-400' }
  return { etiqueta: 'Apagado', clase: 'bg-theme-border-md text-theme-text-muted' }
}

function origenLabel(origen) {
  return (
    { entorno: 'de la configuración', descubierto: 'descubierto', manual: 'añadido a mano' }[
      origen
    ] || ''
  )
}

async function alternar(m) {
  try {
    const fila = await apiFetch(`/api/superadmin/modelos/${m.id}`, {
      method: 'PATCH',
      body: { activo: !m.activo },
    })
    modelos.value = modelos.value.map((x) => (x.id === m.id ? fila : x))
  } catch (e) {
    toast.error(handleApiError(e, 'No se pudo cambiar el modelo'))
  }
}

async function cambiarPrioridad(m, ev) {
  const prioridad = parseInt(ev.target.value, 10)
  if (!Number.isFinite(prioridad) || prioridad === m.prioridad) return
  try {
    const fila = await apiFetch(`/api/superadmin/modelos/${m.id}`, {
      method: 'PATCH',
      body: { prioridad },
    })
    modelos.value = modelos.value
      .map((x) => (x.id === m.id ? fila : x))
      .sort((a, b) => a.prioridad - b.prioridad || a.nombre.localeCompare(b.nombre))
  } catch (e) {
    toast.error(handleApiError(e, 'No se pudo cambiar la prioridad'))
  }
}

async function quitar(m) {
  try {
    await apiFetch(`/api/superadmin/modelos/${m.id}`, { method: 'DELETE' })
    modelos.value = modelos.value.filter((x) => x.id !== m.id)
  } catch (e) {
    toast.error(handleApiError(e, 'No se pudo quitar el modelo'))
  }
}

async function agregar() {
  const nombre = nuevoNombre.value.trim()
  if (!nombre) return
  agregando.value = true
  try {
    await apiFetch('/api/superadmin/modelos', { method: 'POST', body: { nombre } })
    nuevoNombre.value = ''
    await cargar()
  } catch (e) {
    toast.error(handleApiError(e, 'No se pudo añadir el modelo'))
  } finally {
    agregando.value = false
  }
}

async function descubrir() {
  descubriendo.value = true
  resumenDescubrimiento.value = ''
  try {
    const r = await apiFetch('/api/superadmin/modelos/descubrir', { method: 'POST' })
    const partes = [`${r.encontrados} modelos con generateContent en Google`]
    if (r.nuevos?.length) partes.push(`nuevos: ${r.nuevos.join(', ')}`)
    if (r.activadosAuto?.length) partes.push(`encendidos: ${r.activadosAuto.join(', ')}`)
    if (r.retirados?.length) partes.push(`retirados: ${r.retirados.join(', ')}`)
    if (r.reactivados?.length) partes.push(`reactivados: ${r.reactivados.join(', ')}`)
    resumenDescubrimiento.value = partes.join(' · ')
    await cargar()
  } catch (e) {
    toast.error(handleApiError(e, 'No se pudo consultar a Google'))
  } finally {
    descubriendo.value = false
  }
}

onMounted(async () => {
  if (!esSuperadmin.value) await fetchMe()
  if (esSuperadmin.value) await cargar()
})
</script>
