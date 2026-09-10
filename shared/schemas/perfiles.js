// Perfiles gestionados (familia): mini-usuarios SIN login que un usuario
// real administra. Son filas de `usuarios`, así que el cuerpo va derecho a
// las columnas de esa tabla.
//
// El servicio normalizaba con `String(v ?? '').trim()`, que convierte
// cualquier cosa en texto pero no comprueba nada más: un `fechaNacimiento`
// de "ayer" llegaba a una columna `date` y un `nombre` de 5000 caracteres a
// un varchar(100). Los dos salían como 500 con la consulta y sus
// parámetros en el mensaje, y los dos se alcanzan escribiendo mal una
// fecha o pegando texto en el formulario de familia.

import { z } from 'zod'
import { fechaIso, notasSchema } from './common.js'

// Los límites espejan el ancho de las columnas en `usuarios`.
const textoOpcional = (max) => z.string().trim().max(max).optional().nullable()

const perfilBase = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(255),
  telefono: textoOpcional(30),
  relacion: textoOpcional(50),
  correoContacto: textoOpcional(255),
  // La columna es `date`. El formulario manda '' cuando está vacío, así
  // que hay que aceptarlo además de null.
  fechaNacimiento: z
    .union([fechaIso, z.literal('')])
    .optional()
    .nullable(),
  notas: notasSchema,
  // El '' se conserva SIN coercionar a propósito: `actualizarPerfil` lo usa
  // como señal de "no tocar el presupuesto" (`datos.presupuesto !== ''`).
  // Con `z.coerce.number()` a secas, '' pasaría a 0 y un PATCH del nombre
  // pondría el presupuesto del perfil a cero.
  presupuesto: z
    .union([
      z.literal(''),
      z.coerce.number().finite().min(0, 'El presupuesto no puede ser negativo').max(100_000_000),
    ])
    .optional()
    .nullable(),
})

export const perfilCreateSchema = perfilBase

// El PATCH exige el nombre igual que el POST, y NO es `.partial()`: pese
// al verbo, `actualizarPerfil` reescribe todos los campos de contacto en
// cada llamada (`camposContacto` convierte lo ausente en null), así que un
// cuerpo parcial borra lo que no manda. El schema refleja esa semántica de
// reemplazo en vez de fingir una edición parcial que el servicio no hace.
export const perfilUpdateSchema = perfilBase
