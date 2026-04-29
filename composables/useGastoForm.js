/**
 * Form helper compartido para FormGastoManual (crear y editar).
 * Ver §4.6 de planifica.md.
 *
 * Centraliza validación Zod y construcción del payload.
 */

import { useForm } from './useFormField'
import { gastoCreateSchema } from '~/shared/schemas/gastos'

const DEFAULT_INITIAL = {
  concepto: '',
  monto: null,
  fecha: '',
  hora: null,
  categoriaId: null,
  notas: '',
  metodoRegistro: 'manual',
  transcripcionVoz: null,
  gastoPlanificadoId: null,
}

export function useGastoForm({ initial = {}, mode = 'create' } = {}) {
  const form = useForm({
    schema: gastoCreateSchema,
    initial: { ...DEFAULT_INITIAL, ...initial },
  })

  function buildPayload() {
    const v = form.values
    return {
      concepto: String(v.concepto || '').trim(),
      monto: parseFloat(v.monto),
      categoriaId: v.categoriaId,
      fecha: v.fecha,
      hora: v.hora || undefined,
      metodoRegistro: v.metodoRegistro || 'manual',
      transcripcionVoz: v.transcripcionVoz || null,
      notas: v.notas?.trim() || null,
      gastoPlanificadoId: v.gastoPlanificadoId || null,
    }
  }

  return {
    ...form,
    mode,
    isCreate: mode === 'create',
    isEdit: mode === 'edit',
    buildPayload,
  }
}
