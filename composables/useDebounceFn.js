export function useDebounceFn(fn, delay = 150) {
  let timer = null
  const debounced = (...args) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
  debounced.cancel = () => {
    if (timer) clearTimeout(timer)
    timer = null
  }
  return debounced
}

export function useDebouncedRef(source, delay = 150) {
  const debounced = ref(source.value)
  let timer = null
  watch(source, (val) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { debounced.value = val }, delay)
  })
  onUnmounted(() => { if (timer) clearTimeout(timer) })
  return debounced
}
