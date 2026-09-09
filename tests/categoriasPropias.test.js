// El conjunto de categorías que un usuario puede referenciar es
//   usuario_id = él  OR  (es_predefinida AND usuario_id IS NULL)
// y estaba escrito a mano, distinto, en cinco sitios (voz/parse,
// voz/parse-image, voz/parse-stream, presupuestos-categoria,
// compartido.service). Los tres endpoints que MÁS categorías escriben
// —POST /api/gastos, /api/gastos/bulk y PUT /api/gastos/bulk— no lo
// comprobaban en absoluto: aceptaban cualquier UUID y lo guardaban.
//
// Consecuencia: mandando el id de una categoría privada de otra cuenta,
// la respuesta devolvía `categoriaNombre` de esa categoría ajena — un
// oráculo para leer nombres de categorías de otros usuarios, y filas
// propias apuntando a datos que no son del dueño.
//
// `filtrarCategoriasInvalidas` es la parte pura de la regla; el resto
// (`assertCategoriasPropias`) solo la aplica sobre lo que devuelve la BD.

import { describe, it, expect } from 'vitest'
import { filtrarCategoriasInvalidas } from '../server/utils/categorias.js'

const MIA = '11111111-1111-4111-8111-111111111111'
const GLOBAL = '22222222-2222-4222-8222-222222222222'
const AJENA = '33333333-3333-4333-8333-333333333333'

// Lo que la BD devuelve al preguntar por las categorías accesibles.
const accesibles = [{ id: MIA }, { id: GLOBAL }]

describe('filtrarCategoriasInvalidas', () => {
  it('no reporta nada cuando todas las categorías son accesibles', () => {
    expect(filtrarCategoriasInvalidas([MIA, GLOBAL], accesibles)).toEqual([])
  })

  it('reporta la categoría de otro usuario', () => {
    expect(filtrarCategoriasInvalidas([MIA, AJENA], accesibles)).toEqual([AJENA])
  })

  it('reporta un id que no existe', () => {
    const fantasma = '44444444-4444-4444-8444-444444444444'
    expect(filtrarCategoriasInvalidas([fantasma], accesibles)).toEqual([fantasma])
  })

  it('ignora null/undefined: la ausencia de categoría se valida aparte', () => {
    expect(filtrarCategoriasInvalidas([null, undefined, MIA], accesibles)).toEqual([])
  })

  it('deduplica: el mismo id inválido repetido se reporta una vez', () => {
    expect(filtrarCategoriasInvalidas([AJENA, AJENA, AJENA], accesibles)).toEqual([AJENA])
  })

  it('sin categorías accesibles, cualquier id es inválido', () => {
    expect(filtrarCategoriasInvalidas([MIA], [])).toEqual([MIA])
  })

  it('lista vacía no produce hallazgos', () => {
    expect(filtrarCategoriasInvalidas([], accesibles)).toEqual([])
  })

  it('compara como string: un id numérico y su string son el mismo', () => {
    expect(filtrarCategoriasInvalidas([7], [{ id: '7' }])).toEqual([])
  })
})
