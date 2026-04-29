import { describe, it, expect } from 'vitest'
import { assertOwner, assertOwnerAll } from '../server/utils/assertOwner.js'

describe('assertOwner', () => {
  it('devuelve la entidad si pertenece al usuario', () => {
    const e = { id: 1, usuarioId: 'u1', nombre: 'X' }
    expect(assertOwner(e, 'u1')).toBe(e)
  })

  it('lanza 404 si no existe', () => {
    let err
    try { assertOwner(null, 'u1') } catch (e) { err = e }
    expect(err.statusCode).toBe(404)
  })

  it('lanza 404 (no 403) cuando es de otro usuario', () => {
    let err
    try { assertOwner({ id: 1, usuarioId: 'otro' }, 'u1') } catch (e) { err = e }
    expect(err.statusCode).toBe(404)
  })

  it('lanza 401 si no hay usuarioId', () => {
    let err
    try { assertOwner({ id: 1, usuarioId: 'u1' }, null) } catch (e) { err = e }
    expect(err.statusCode).toBe(401)
  })

  it('field custom', () => {
    const e = { id: 1, ownerId: 'u1' }
    expect(assertOwner(e, 'u1', { field: 'ownerId' })).toBe(e)
  })
})

describe('assertOwnerAll', () => {
  it('todos pertenecen → ok', () => {
    const arr = [{ id: 1, usuarioId: 'u1' }, { id: 2, usuarioId: 'u1' }]
    expect(assertOwnerAll(arr, 'u1')).toBe(arr)
  })
  it('algunos ajenos → 404', () => {
    const arr = [{ id: 1, usuarioId: 'u1' }, { id: 2, usuarioId: 'otro' }]
    let err
    try { assertOwnerAll(arr, 'u1') } catch (e) { err = e }
    expect(err.statusCode).toBe(404)
  })
})
