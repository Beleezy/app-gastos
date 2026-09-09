<template>
  <div>
    <SharedTabBar
      v-model="tab"
      :tabs="tabs"
      aria-label="Vistas de compartido"
      container-class="flex items-center gap-2 mb-4"
    />

    <Transition name="page" mode="out-in">
      <div :key="tab" class="space-y-4">
        <!-- ── Lo que veo ── -->
        <template v-if="tab === 'veo'">
          <CompartidoInvitacionesPendientes
            :invitaciones="invitacionesRecibidas"
            @respondida="recargar"
          />

          <SharedEmptyState
            v-if="!meComparten.length && !invitacionesRecibidas.length"
            title="Nadie comparte contigo todavía"
            message="Cuando alguien te dé acceso a sus gastos, vas a poder ver cómo va su mes y avisarle a tiempo."
            action-label="Compartir yo primero"
            @action="tab = 'comparto'"
          />

          <CompartidoConexionCard
            v-for="conexion in meComparten"
            :key="conexion.id"
            :conexion="conexion"
            @avisar="abrirAviso"
          />

          <section v-if="meComparten.length" class="pt-2">
            <h2 class="text-sm font-semibold text-theme-text-sec mb-2">Avisos</h2>
            <SharedTabBar
              v-if="meComparten.length > 1"
              v-model="conexionAvisos"
              :tabs="tabsConexiones"
              variant="underline"
              aria-label="Conexión para los avisos"
              container-class="flex items-center gap-2 mb-3 overflow-x-auto scrollbar-hide"
            />
            <CompartidoListaAvisos v-if="conexionAvisos" :conexion-id="conexionAvisos" />
          </section>
        </template>

        <!-- ── Lo que comparto ── -->
        <template v-else>
          <CompartidoGuiaInicio v-if="!compartoCon.length" @empezar="mostrarInvitacion = true" />

          <article
            v-for="conexion in compartoCon"
            :key="conexion.id"
            class="rounded-2xl bg-theme-card border border-theme-border p-4"
          >
            <div class="flex items-start gap-3">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-theme-text truncate">
                  {{ conexion.receptorEmail }}
                </p>
                <p class="text-[0.6875rem] text-theme-text-muted mt-0.5">
                  {{ estadoTexto(conexion) }}
                </p>
              </div>
              <SharedChip :variant="conexion.pausada ? 'warning' : 'success'" size="sm">
                {{
                  conexion.pausada
                    ? 'Pausado'
                    : conexion.estado === 'pendiente'
                      ? 'Invitado'
                      : 'Activo'
                }}
              </SharedChip>
            </div>

            <!-- Panel "qué está viendo": evita el olvido -->
            <p class="text-xs text-theme-text-sec mt-2.5">{{ resumenAlcance(conexion) }}</p>

            <button
              type="button"
              class="tap-target mt-3 w-full py-2.5 rounded-xl bg-theme-input border border-theme-border text-sm font-medium text-theme-text-sec hover:border-theme-accent transition-colors"
              data-testid="compartido-editar-alcance"
              @click="editando = conexion"
            >
              Cambiar qué ve
            </button>
          </article>
        </template>
      </div>
    </Transition>

    <SharedFloatingActionStack>
      <SharedFloatingActionButton
        v-if="tab === 'comparto'"
        aria-label="Compartir mis gastos con alguien"
        data-testid="compartido-fab-invitar"
        @click="mostrarInvitacion = true"
      />
    </SharedFloatingActionStack>

    <CompartidoFormInvitacion
      v-if="mostrarInvitacion"
      @close="mostrarInvitacion = false"
      @enviada="recargar"
    />

    <CompartidoEditorAlcance
      v-if="editando"
      :conexion="editando"
      @close="editando = null"
      @guardado="recargar"
      @revocar="pedirRevocar"
    />

    <CompartidoFormAviso
      v-if="avisoPara"
      :conexion="avisoPara.conexion"
      :categoria="avisoPara.categoria"
      @close="avisoPara = null"
      @enviado="recargar"
    />

    <SharedConfirmDialog
      v-model="mostrarConfirmRevocar"
      title="Dejar de compartir"
      :message="mensajeRevocar"
      confirm-label="Dejar de compartir"
      @confirm="confirmarRevocar"
    />
  </div>
</template>

<script setup>
definePageMeta({ layout: 'planificador' })

useHead({ title: 'Compartido' })

const {
  compartoCon,
  meComparten,
  invitacionesRecibidas,
  fetchConexiones,
  fetchNovedades,
  revocar,
} = useCompartido()
const toast = useToast()

const tab = ref('veo')
const mostrarInvitacion = ref(false)
const editando = ref(null)
const avisoPara = ref(null)
const conexionAvisos = ref('')
const revocando = ref(null)
const mostrarConfirmRevocar = ref(false)

const tabs = computed(() => [
  { value: 'veo', label: 'Lo que veo', badge: invitacionesRecibidas.value.length || null },
  { value: 'comparto', label: 'Lo que comparto' },
])

const tabsConexiones = computed(() =>
  meComparten.value.map((c) => ({
    value: c.id,
    label: c.emisorNombre,
    badge: c.avisosNoLeidos || null,
  })),
)

const mensajeRevocar = computed(() =>
  revocando.value
    ? `${revocando.value.receptorEmail || 'Esta persona'} dejará de ver tus gastos al instante. El historial de avisos se conserva.`
    : '',
)

function estadoTexto(c) {
  if (c.estado === 'pendiente') return 'Esperando que acepte la invitación'
  if (c.pausada) return 'Pausado: ahora mismo no ve nada'
  return c.nivelDetalle === 'detalle' ? 'Ve el detalle de cada gasto' : 'Ve solo los totales'
}

function resumenAlcance(c) {
  const rubros = c.categorias?.map((x) => x.nombre) || []
  if (!rubros.length) {
    return c.incluirMarcados
      ? 'Solo los gastos que marques uno por uno.'
      : 'Nada: sin rubros ni gastos marcados.'
  }
  return `Rubros: ${rubros.join(', ')}.`
}

function abrirAviso({ conexion, categoria }) {
  avisoPara.value = { conexion, categoria }
}

function pedirRevocar(conexion) {
  revocando.value = conexion
  editando.value = null
  mostrarConfirmRevocar.value = true
}

async function confirmarRevocar() {
  try {
    await revocar(revocando.value.id)
    toast.success('Dejaste de compartir')
    await recargar()
  } catch (e) {
    toast.error(handleApiError(e, 'No se pudo revocar'))
  } finally {
    revocando.value = null
  }
}

async function recargar() {
  await Promise.all([fetchConexiones(), fetchNovedades()])
  if (!conexionAvisos.value && meComparten.value.length) {
    conexionAvisos.value = meComparten.value[0].id
  }
}

watch(meComparten, (lista) => {
  if (!conexionAvisos.value && lista.length) conexionAvisos.value = lista[0].id
})

onMounted(recargar)
</script>
