// Consumo de LLM (voz + foto) del usuario autenticado.
//
// Devuelve totales agregados del mes en curso y un detalle por endpoint
// para que la UI de configuraciones muestre cuánto cupo queda.

import { and, eq, sql } from 'drizzle-orm'
import { db } from '../../utils/db.js'
import { usoLlm } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { getUsoMensual } from '../../utils/usoLlm.js'

const DEFAULT_QUOTA = 500

function quotaMensual() {
  const raw = Number(process.env.LLM_QUOTA_MENSUAL_USUARIO)
  if (Number.isFinite(raw) && raw > 0) return raw
  return DEFAULT_QUOTA
}

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const ahora = new Date()
  const anio = ahora.getFullYear()
  const mes = ahora.getMonth() + 1

  const detalles = await db
    .select({
      endpoint: usoLlm.endpoint,
      totalRequests: usoLlm.totalRequests,
      totalTokens: usoLlm.totalTokens,
      ultimaPeticion: usoLlm.ultimaPeticion,
    })
    .from(usoLlm)
    .where(and(eq(usoLlm.usuarioId, usuarioId), eq(usoLlm.anio, anio), eq(usoLlm.mes, mes)))

  const usadas = await getUsoMensual(usuarioId)
  const limite = quotaMensual()

  return {
    periodo: { anio, mes },
    usadas,
    limite,
    restantes: Math.max(0, limite - usadas),
    porcentaje: limite > 0 ? Math.min(100, Math.round((usadas / limite) * 100)) : 0,
    detallesPorEndpoint: detalles,
  }
})
