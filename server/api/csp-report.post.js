// Endpoint receptor de CSP violation reports. Recibe el JSON estándar
// del browser (también el formato Reporting API) y lo loguea como warn.
// No hace I/O en BD para evitar amplificación de spam.
//
// Body puede ser:
//   { "csp-report": { "document-uri": ..., "violated-directive": ... } }
//   o array (Reporting API).

import { logger } from '../utils/logger.js'

export default defineEventHandler(async (event) => {
  let body
  try {
    body = await readBody(event)
  } catch {
    body = null
  }
  // Normalizar a array de reports.
  const reports = Array.isArray(body)
    ? body.map((r) => r?.body || r)
    : [body?.['csp-report'] || body]

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
