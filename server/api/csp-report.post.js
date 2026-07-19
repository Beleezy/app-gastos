// Endpoint receptor de CSP violation reports. Recibe el JSON estándar
// del browser (también el formato Reporting API) y lo loguea como warn.
// No hace I/O en BD para evitar amplificación de spam.
//
// Body puede ser:
//   { "csp-report": { "document-uri": ..., "violated-directive": ... } }
//   o array (Reporting API).

import { logger } from '../utils/logger.js'

// Techo de tamaño del body: los reports reales del browser pesan < 2 KB;
// cualquier cosa mayor es abuso (el endpoint no exige auth ni rate limit,
// ver 05.rate-limit-global.js) y no merece ni el parseo del JSON.
const MAX_BODY_BYTES = 32 * 1024
// Techo de reports por request (Reporting API agrupa; el browser manda pocos).
const MAX_REPORTS = 10

export default defineEventHandler(async (event) => {
  const contentLength = Number(getRequestHeader(event, 'content-length') || 0)
  if (contentLength > MAX_BODY_BYTES) {
    setResponseStatus(event, 204)
    return null
  }

  let body
  try {
    body = await readBody(event)
  } catch {
    body = null
  }
  // Normalizar a array de reports.
  const reports = (
    Array.isArray(body) ? body.map((r) => r?.body || r) : [body?.['csp-report'] || body]
  ).slice(0, MAX_REPORTS)

  for (const r of reports) {
    if (!r) continue
    logger.warn('csp_violation', {
      directive: r['violated-directive'] || r.effectiveDirective,
      blockedURI: r['blocked-uri'] || r.blockedURL,
      documentURI: r['document-uri'] || r.documentURL,
      sourceFile: r['source-file'] || r.sourceFile,
      lineNumber: r['line-number'] || r.lineNumber,
      sample: (r['script-sample'] || r.sample || '').slice(0, 120),
    })
  }

  setResponseStatus(event, 204)
  return null
})
