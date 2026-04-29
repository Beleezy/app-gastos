/**
 * Form helper compartido entre FormDeuda y FormEditarDeuda.
 * Ver §4.6 de planifica.md.
 *
 * Encapsula la validación con Zod (schema compartido cliente↔servidor),
 * estado de submit y conversión a payload listo para POST/PUT.
 *
 * Uso:
 *   const form = useDeudaForm({ initial, mode: 'create' })
 *   <input v-model="form.values.concepto" @blur="form.touch('concepto')" />
 *   <button :disabled="!form.canSubmit.value" @click="form.submit(crear)" />
 */

import { useForm } from './useFormField'
import { deudaCreateSchema } from '~/shared/schemas/deudas'

const DEFAULT_INITIAL = {
  personaEntidadId: null,
  personaNombre: '',
  personaTipo: 'persona',
  tipoDeuda: 'me_deben',
  concepto: '',
  monto: null,
  fecha: '',
  fechaPago: null,
  notas: '',
}

export function useDeudaForm({ initial = {}, mode = 'create' } = {}) {
  const form = useForm({
    schema: deudaCreateSchema,
    initial: { ...DEFAULT_INITIAL, ...initial },
  })

  function buildPayload() {
    const v = form.values
    const payload = {
      tipoDeuda: v.tipoDeuda,
      concepto: String(v.concepto || '').trim(),
      monto: parseFloat(v.monto),
      fecha: v.fecha || undefined,
      fechaPago: v.fechaPago || null,
      notas: v.notas?.trim() || null,
    }
    if (v.personaEntidadId) {
      payload.personaEntidadId = v.personaEntidadId
    } else if (v.personaNombre?.trim()) {
      payload.personaNombre = v.personaNombre.trim()
      payload.personaTipo = v.personaTipo || 'persona'
    }
    return payload
  }

  return {
    ...form,
    mode,
    isCreate: mode === 'create',
    isEdit: mode === 'edit',
    buildPayload,
  }
}
