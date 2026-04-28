import { z } from 'zod'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { validateBody } from '../../utils/validate.js'
import { detectarDuplicados } from '../../services/gastos.service.js'
import { fechaIso } from '../../../shared/schemas/common.js'

const bodySchema = z.object({
  candidatos: z
    .array(
      z.object({
        concepto: z.string().trim().min(1).max(200),
        monto: z.number().finite().positive(),
        fecha: fechaIso,
      }),
    )
    .min(1)
    .max(50),
})

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const body = await validateBody(event, bodySchema)
  const result = await detectarDuplicados({ usuarioId, candidatos: body.candidatos })
  return { resultados: result }
})
