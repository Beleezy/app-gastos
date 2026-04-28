import { describe, it, expect, vi } from 'vitest'
import { useDebounceFn, useThrottleFn } from '../composables/useDebounce.js'

describe('useDebounceFn', () => {
  it('agrupa llamadas en una sola tras el delay', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const d = useDebounceFn(fn, 100)
    d('a')
    d('b')
    d('c')
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(101)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenLastCalledWith('c')
    vi.useRealTimers()
  })

  it('cancel evita la invocación', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const d = useDebounceFn(fn, 100)
    d('a')
    d.cancel()
    vi.advanceTimersByTime(200)
    expect(fn).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('flush invoca inmediatamente', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const d = useDebounceFn(fn, 100)
    d('a')
    d.flush('b')
    expect(fn).toHaveBeenCalledOnce()
    expect(fn).toHaveBeenLastCalledWith('b')
    vi.advanceTimersByTime(200)
    expect(fn).toHaveBeenCalledTimes(1) // sin reentry
    vi.useRealTimers()
  })
})

describe('useThrottleFn', () => {
  it('ejecuta inmediato la primera vez', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const t = useThrottleFn(fn, 100)
    t('a')
    expect(fn).toHaveBeenCalledOnce()
    expect(fn).toHaveBeenLastCalledWith('a')
    vi.useRealTimers()
  })

  it('ignora durante la ventana y emite trailing', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const t = useThrottleFn(fn, 100)
    t('a')
    t('b')
    t('c')
    expect(fn).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(101)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith('c')
    vi.useRealTimers()
  })
})
