// Schema de perfiles gestionados (familia).
//
// Son filas de `usuarios`, así que el cuerpo va derecho a esas columnas. El
// servicio normalizaba con `String(v ?? '').trim()`, que convierte
// cualquier cosa en texto pero no comprueba nada más: un `fechaNacimiento`
// de "ayer" llegaba a una columna `date` y un `nombre` de 5000 caracteres a
// un varchar(255). Los dos salían como 500 con la consulta y sus
// parámetros, y los dos se alcanzan escribiendo mal una fecha o pegando
// texto en el formulario.

import { describe, it, expect } from 'vitest'
import { perfilCreateSchema, perfilUpdateSchema } from '../shared/schemas/perfiles.js'

describe('perfilCreateSchema', () => {
  it('acepta el cuerpo mínimo', () => {
    expect(perfilCreateSchema.parse({ nombre: 'Hijo' })).toMatchObject({ nombre: 'Hijo' })
  })

  it('acepta el cuerpo completo del formulario', () => {
    const r = perfilCreateSchema.safeParse({
      nombre: 'Mamá',
      telefono: '999888777',
      relacion: 'Madre',
      correoContacto: 'mama@example.com',
      fechaNacimiento: '1960-04-12',
      notas: 'Le mando el reporte los domingos',
      presupuesto: 1500,
    })
    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true)
  })

  it('exige nombre no vacío', () => {
    expect(perfilCreateSchema.safeParse({}).success).toBe(false)
    expect(perfilCreateSchema.safeParse({ nombre: '   ' }).success).toBe(false)
  })

  it('acota el nombre al ancho de la columna', () => {
    expect(perfilCreateSchema.safeParse({ nombre: 'A'.repeat(256) }).success).toBe(false)
    expect(perfilCreateSchema.safeParse({ nombre: 'A'.repeat(255) }).success).toBe(true)
  })

  it('rechaza una fecha de nacimiento que no es fecha', () => {
    for (const fechaNacimiento of ['ayer', '12/04/1960', '1960-4-2']) {
      const r = perfilCreateSchema.safeParse({ nombre: 'X', fechaNacimiento })
      expect(r.success, fechaNacimiento).toBe(false)
    }
  })

  it('acepta la fecha vacía: el formulario manda "" cuando no se rellena', () => {
    expect(perfilCreateSchema.safeParse({ nombre: 'X', fechaNacimiento: '' }).success).toBe(true)
    expect(perfilCreateSchema.safeParse({ nombre: 'X', fechaNacimiento: null }).success).toBe(true)
  })

  it('acota los campos de contacto a su columna', () => {
    expect(perfilCreateSchema.safeParse({ nombre: 'X', telefono: '9'.repeat(31) }).success).toBe(
      false,
    )
    expect(perfilCreateSchema.safeParse({ nombre: 'X', relacion: 'R'.repeat(51) }).success).toBe(
      false,
    )
  })

  it('conserva el presupuesto vacío sin convertirlo en 0', () => {
    // `actualizarPerfil` usa '' como señal de "no tocar el presupuesto".
    // Coercionarlo a 0 haría que editar el nombre pusiera el presupuesto a
    // cero.
    expect(perfilCreateSchema.parse({ nombre: 'X', presupuesto: '' }).presupuesto).toBe('')
  })

  it('rechaza un presupuesto negativo', () => {
    expect(perfilCreateSchema.safeParse({ nombre: 'X', presupuesto: -100 }).success).toBe(false)
  })

  it('descarta campos que no son del perfil', () => {
    const parsed = perfilCreateSchema.parse({ nombre: 'X', rol: 'superadmin', permitido: true })
    expect(parsed).not.toHaveProperty('rol')
    expect(parsed).not.toHaveProperty('permitido')
  })
})

describe('perfilUpdateSchema', () => {
  it('exige nombre: el PATCH reemplaza, no edita parcialmente', () => {
    expect(perfilUpdateSchema.safeParse({ telefono: '123' }).success).toBe(false)
  })
})
