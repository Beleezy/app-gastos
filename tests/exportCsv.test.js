import { describe, it, expect } from 'vitest'
import { generarCsv } from '../composables/useExportCsv.js'

const filas = [
  { id: 1, nombre: 'Pan', monto: 5.5, notas: 'desayuno' },
  { id: 2, nombre: 'Transporte', monto: 2, notas: 'taxi; rápido' },
  { id: 3, nombre: 'Comilla "rara"', monto: 10, notas: 'línea 1\nlínea 2' },
]

const columnas = [
  { label: 'ID', getValue: (r) => r.id },
  { label: 'Nombre', getValue: (r) => r.nombre },
  { label: 'Monto', getValue: (r) => r.monto },
  { label: 'Notas', getValue: (r) => r.notas },
]

describe('generarCsv', () => {
  it('header + filas con separador por defecto (;)', () => {
    const csv = generarCsv({ columnas, filas: [filas[0]] })
    // empieza con BOM
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv).toContain('ID;Nombre;Monto;Notas')
    expect(csv).toContain('1;Pan;5.5;desayuno')
  })

  it('escapa celdas con el separador en su contenido', () => {
    const csv = generarCsv({ columnas, filas: [filas[1]] })
    expect(csv).toContain('"taxi; rápido"')
  })

  it('escapa comillas duplicándolas', () => {
    const csv = generarCsv({ columnas, filas: [filas[2]] })
    expect(csv).toContain('"Comilla ""rara"""')
  })

  it('escapa newlines', () => {
    const csv = generarCsv({ columnas, filas: [filas[2]] })
    expect(csv).toContain('"línea 1\nlínea 2"')
  })

  it('separator personalizado (coma)', () => {
    const csv = generarCsv({ columnas, filas: [filas[0]], separator: ',' })
    expect(csv).toContain('ID,Nombre,Monto,Notas')
  })

  it('opt bom=false omite el BOM', () => {
    const csv = generarCsv({ columnas, filas: [], bom: false })
    expect(csv.charCodeAt(0)).not.toBe(0xfeff)
  })

  it('filas vacías solo devuelve header', () => {
    const csv = generarCsv({ columnas, filas: [] })
    // BOM + header sin newline final
    expect(csv).toBe('﻿ID;Nombre;Monto;Notas')
  })
})
