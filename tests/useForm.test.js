import { describe, it, expect } from 'vitest'
import { reactive, ref, computed } from 'vue'
import { z } from 'zod'

// Asegurar globals de Vue para el composable
globalThis.reactive = reactive
globalThis.ref = ref
globalThis.computed = computed

import { useForm } from '../composables/useFormField.js'

const schema = z.object({
  nombre: z.string().min(2, 'Nombre muy corto'),
  edad: z.number().int().min(18, 'Debe ser mayor de edad'),
})

describe('useForm', () => {
  it('valida correctamente input válido', () => {
    const f = useForm({ schema, initial: { nombre: 'Juan', edad: 30 } })
    expect(f.validate()).toBe(true)
    expect(f.isValid.value).toBe(true)
  })

  it('detecta errores y los expone por path', () => {
    const f = useForm({ schema, initial: { nombre: 'A', edad: 10 } })
    expect(f.validate()).toBe(false)
    expect(f.errors.nombre).toBeDefined()
    expect(f.errors.edad).toBeDefined()
  })

  it('touch valida solo el campo y marca touched', () => {
    const f = useForm({ schema, initial: { nombre: 'A', edad: 30 } })
    f.touch('nombre')
    expect(f.touched.nombre).toBe(true)
    expect(f.errors.nombre).toBeDefined()
  })

  it('canSubmit es false durante submitting', async () => {
    const f = useForm({ schema, initial: { nombre: 'Juan', edad: 30 } })
    let observed = null
    const handler = () => {
      observed = f.canSubmit.value
      return Promise.resolve('ok')
    }
    const result = await f.submit(handler)
    expect(result).toBe('ok')
    expect(observed).toBe(false)
    expect(f.canSubmit.value).toBe(true)
  })

  it('reset limpia errores y touched', () => {
    const f = useForm({ schema, initial: { nombre: 'A', edad: 10 } })
    f.validate()
    f.touch('nombre')
    f.reset({ nombre: 'OK', edad: 25 })
    expect(f.errors.nombre).toBeUndefined()
    expect(f.touched.nombre).toBeUndefined()
    expect(f.values.nombre).toBe('OK')
  })

  it('submit no llama al handler si hay errores', async () => {
    const f = useForm({ schema, initial: { nombre: 'A', edad: 10 } })
    let called = false
    const r = await f.submit(() => {
      called = true
      return 'ok'
    })
    expect(r).toBe(false)
    expect(called).toBe(false)
  })
})
