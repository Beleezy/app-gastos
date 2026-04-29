import { describe, it, expect } from 'vitest'
import { reactive, ref, computed } from 'vue'

globalThis.reactive = reactive
globalThis.ref = ref
globalThis.computed = computed

import { useDeudaForm } from '../composables/useDeudaForm.js'
import { useGastoForm } from '../composables/useGastoForm.js'

describe('useDeudaForm', () => {
  it('payload con personaNombre cuando no hay id', () => {
    const f = useDeudaForm({
      initial: {
        personaNombre: ' Juan ',
        tipoDeuda: 'me_deben',
        concepto: 'Almuerzo',
        monto: 50,
        fecha: '2026-04-01',
      },
    })
    const p = f.buildPayload()
    expect(p.personaNombre).toBe('Juan')
    expect(p.personaTipo).toBe('persona')
    expect(p.personaEntidadId).toBeUndefined()
    expect(p.monto).toBe(50)
  })

  it('payload prefiere personaEntidadId', () => {
    const f = useDeudaForm({
      initial: {
        personaEntidadId: 'abc',
        personaNombre: 'Juan',
        tipoDeuda: 'yo_debo',
        concepto: 'X',
        monto: 10,
      },
    })
    const p = f.buildPayload()
    expect(p.personaEntidadId).toBe('abc')
    expect(p.personaNombre).toBeUndefined()
  })

  it('mode flags', () => {
    expect(useDeudaForm({ mode: 'edit' }).isEdit).toBe(true)
    expect(useDeudaForm({ mode: 'create' }).isCreate).toBe(true)
  })
})

describe('useGastoForm', () => {
  it('payload incluye concepto trim y monto numerico', () => {
    const f = useGastoForm({
      initial: {
        concepto: ' Pan ',
        monto: '5.50',
        fecha: '2026-04-01',
        categoriaId: 1,
      },
    })
    const p = f.buildPayload()
    expect(p.concepto).toBe('Pan')
    expect(p.monto).toBe(5.5)
  })

  it('default metodoRegistro manual', () => {
    const f = useGastoForm({ initial: { concepto: 'X', monto: 1, fecha: '2026-04-01' } })
    expect(f.buildPayload().metodoRegistro).toBe('manual')
  })
})
