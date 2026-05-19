import { z } from 'zod'

const tipoCuenta = z.enum(['efectivo', 'debito', 'credito', 'ahorros', 'inversion', 'otro'])

const cuentaBaseSchema = z.object({
  nombre: z.string().trim().min(1, 'Nombre obligatorio').max(80),
  tipo: tipoCuenta,
  moneda: z.string().trim().min(2).max(10).optional(),
  saldoInicial: z.coerce.number().finite().optional().default(0),
  icono: z.string().max(16).optional().nullable(),
  color: z.string().max(16).optional().nullable(),
  orden: z.number().int().optional(),
  archivada: z.boolean().optional(),
  esPredeterminada: z.boolean().optional(),
  notas: z.string().max(500).optional().nullable(),
})

export const cuentaCreateSchema = cuentaBaseSchema
export const cuentaUpdateSchema = cuentaBaseSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Sin cambios')

export const transferenciaCreateSchema = z.object({
  cuentaOrigenId: z.string().uuid(),
  cuentaDestinoId: z.string().uuid(),
  monto: z.coerce.number().positive(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  concepto: z.string().trim().max(200).optional().nullable(),
  notas: z.string().max(500).optional().nullable(),
})
