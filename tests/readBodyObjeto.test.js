// `readBodyObjeto` normaliza el body a un objeto.
//
// Siete handlers leían `readBody` crudo y hacían acto seguido `body.campo`
// o `const { campo } = body`. Una petición SIN CUERPO —lo que manda un
// cliente al que se le perdió el payload— lanzaba un TypeError y salía
// como 500, cuando esos mismos handlers ya devuelven un 400 correcto para
// un cuerpo incompleto. Importa por la cola offline: reintenta ante un 500
// y no ante un 400, así que el código equivocado convertía un fallo
// permanente en un bucle de reintentos.

import { describe, it, expect, vi, beforeEach } from 'vitest'

const readBodyMock = vi.fn()
vi.stubGlobal('readBody', readBodyMock)

const { readBodyObjeto } = await import('../server/utils/validate.js')

describe('readBodyObjeto', () => {
  beforeEach(() => readBodyMock.mockReset())

  it('devuelve el objeto tal cual cuando lo hay', async () => {
    readBodyMock.mockResolvedValue({ nombre: 'Comida', monto: 10 })
    await expect(readBodyObjeto({})).resolves.toEqual({ nombre: 'Comida', monto: 10 })
  })

  it('convierte undefined (petición sin cuerpo) en objeto vacío', async () => {
    readBodyMock.mockResolvedValue(undefined)
    await expect(readBodyObjeto({})).resolves.toEqual({})
  })

  it('convierte null (cuerpo literal null) en objeto vacío', async () => {
    readBodyMock.mockResolvedValue(null)
    await expect(readBodyObjeto({})).resolves.toEqual({})
  })

  it('no deja pasar un array como si fuese un objeto de campos', async () => {
    // `[].campo` es undefined y no lanza, así que el handler seguiría con
    // todo a undefined en vez de cortar en su comprobación de requeridos.
    readBodyMock.mockResolvedValue([1, 2, 3])
    await expect(readBodyObjeto({})).resolves.toEqual({})
  })

  it('no deja pasar escalares', async () => {
    for (const valor of ['texto', 42, true]) {
      readBodyMock.mockResolvedValue(valor)
      await expect(readBodyObjeto({})).resolves.toEqual({})
    }
  })

  it('el resultado permite destructuring sin lanzar', async () => {
    readBodyMock.mockResolvedValue(null)
    const { personaId } = await readBodyObjeto({})
    expect(personaId).toBeUndefined()
  })
})
