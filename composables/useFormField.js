/**
 * Validación de formularios con Zod por campo, en tiempo real.
 *
 * Ver §3.9 de planifica.md.
 *
 * Uso:
 *   const form = useForm({
 *     schema: gastoCreateSchema,
 *     initial: { concepto: '', monto: 0, fecha: '' },
 *   })
 *
 *   <input v-model="form.values.concepto" @blur="form.touch('concepto')" />
 *   <p v-if="form.errors.concepto && form.touched.concepto">
 *     {{ form.errors.concepto }}
 *   </p>
 *   <button :disabled="!form.canSubmit.value" @click="form.submit(send)" />
 */

export function useForm({ schema, initial = {} } = {}) {
  const values = reactive({ ...initial })
  const errors = reactive({})
  const touched = reactive({})
  const submitted = ref(false)
  const submitting = ref(false)

  function applyResult(result) {
    // limpiar errores existentes
    for (const k of Object.keys(errors)) delete errors[k]

    if (result.success) return true

    for (const issue of result.error.issues) {
      const path = issue.path.join('.') || '_root'
      // mantener solo el primer error por path
      if (!errors[path]) errors[path] = issue.message
    }
    return false
  }

  function validate() {
    if (!schema) return true
    const result = schema.safeParse(values)
    return applyResult(result)
  }

  function validateField(field) {
    if (!schema) return true
    const result = schema.safeParse(values)
    // limpiar errores del campo y reasignar si vienen del schema completo
    delete errors[field]
    if (result.success) return true
    for (const issue of result.error.issues) {
      const p = issue.path.join('.') || '_root'
      if (p === field && !errors[field]) {
        errors[field] = issue.message
      }
    }
    return !errors[field]
  }

  function touch(field) {
    touched[field] = true
    validateField(field)
  }

  function reset(next = initial) {
    for (const k of Object.keys(values)) delete values[k]
    Object.assign(values, next)
    for (const k of Object.keys(errors)) delete errors[k]
    for (const k of Object.keys(touched)) delete touched[k]
    submitted.value = false
  }

  const isValid = computed(() => Object.keys(errors).length === 0)
  const canSubmit = computed(() => isValid.value && !submitting.value)

  async function submit(handler) {
    submitted.value = true
    // marcar todos los campos visibles como touched para mostrar errores
    for (const k of Object.keys(values)) touched[k] = true

    if (!validate()) return false

    submitting.value = true
    try {
      const result = await handler(values)
      return result === undefined ? true : result
    } finally {
      submitting.value = false
    }
  }

  return {
    values,
    errors,
    touched,
    submitted,
    submitting,
    isValid,
    canSubmit,
    validate,
    validateField,
    touch,
    reset,
    submit,
  }
}
