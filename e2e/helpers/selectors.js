// Constantes centralizadas de data-testid usados por specs UI y POMs.
// Si reestructuran un componente y cambian un testid, basta con cambiarlo aqui.

export const NAV = {
  TAB_PLANIFICADOR: 'nav-tab-planificador',
  TAB_REGISTRO: 'nav-tab-registro',
  TAB_DEUDAS: 'nav-tab-deudas',
  TAB_INICIO: 'nav-tab-inicio',
}

export const REGISTRO = {
  BTN_REGISTRO_MANUAL: 'btn-registro-manual',
  TAB_HISTORIAL: 'tab-historial',
  TAB_MAPA: 'tab-mapa',
  TAB_CATEGORIAS: 'tab-categorias',
  TAB_STATS: 'tab-stats',
  HISTORIAL: 'historial-diario',
  GASTO_ITEM: 'gasto-item',
  GASTO_CONCEPTO: 'gasto-concepto',
  GASTO_MONTO: 'gasto-monto',
  GASTO_CATEGORIA: 'gasto-categoria',
  BTN_EDITAR: 'btn-editar-gasto',
  BTN_ELIMINAR: 'btn-eliminar-gasto',
  BTN_MICROFONO: 'btn-microfono',
  BTN_CAMARA: 'btn-camara',
  INPUT_FOTO: 'input-foto-file',
  CONFIRMACION_VOZ: 'confirmacion-voz',
  CONFIRMACION_ITEM: 'confirmacion-item',
  BTN_CONFIRMAR_VOZ: 'btn-confirmar-voz',
  BTN_DESCARTAR_VOZ: 'btn-descartar-voz',
  FILTROS_CATEGORIA: 'filtros-categoria',
  // input-* del FormGastoManual viven dentro del bottom-sheet
  INPUT_CONCEPTO: 'input-concepto',
  INPUT_MONTO: 'input-monto',
  INPUT_FECHA: 'input-fecha',
  INPUT_HORA: 'input-hora',
  INPUT_NOTAS: 'input-notas',
  BTN_GUARDAR: 'btn-guardar',
}

export const PLANIFICADOR = {
  RESUMEN: 'resumen-mes',
  MONTO_PRESUPUESTO: 'monto-presupuesto',
  MONTO_ASIGNADO: 'monto-asignado',
  MONTO_SALDO: 'monto-saldo',
  LISTA: 'lista-planificados',
  ITEM: 'planificado-item',
  BTN_MARCAR_PAGADO: 'btn-marcar-pagado',
  BTN_EDITAR_PLANIFICADO: 'btn-editar-planificado',
  BTN_ELIMINAR_PLANIFICADO: 'btn-eliminar-planificado',
  BTN_COPIAR_MES: 'btn-copiar-mes',
  MODAL_SELECTOR_MES: 'modal-selector-mes',
  BTN_CONFIRMAR_COPIAR_MES: 'btn-confirmar-copiar-mes',
  // formularios (dentro de bottom-sheet)
  INPUT_CONCEPTO: 'input-concepto',
  INPUT_MONTO: 'input-monto',
  INPUT_NOTAS: 'input-notas',
  BTN_GUARDAR: 'btn-guardar',
  INPUT_FECHA_PAGO: 'input-fecha-pago',
  INPUT_NOTAS_PAGO: 'input-notas-pago',
  BTN_CONFIRMAR_PAGO: 'btn-confirmar-pago',
}

export const DEUDAS = {
  TAB_ME_DEBEN: 'tab-me-deben',
  TAB_YO_DEBO: 'tab-yo-debo',
  LISTA_PERSONAS: 'lista-personas',
  PERSONA_ITEM: 'persona-item',
  DETALLE_PERSONA: 'detalle-persona',
  DEUDA_ITEM: 'deuda-item',
  BTN_NUEVO_PAGO: 'btn-nuevo-pago',
  BTN_EDITAR_DEUDA: 'btn-editar-deuda',
  BTN_ELIMINAR_DEUDA: 'btn-eliminar-deuda',
  BTN_NUEVA_DEUDA: 'btn-nueva-deuda',
  // formularios (dentro de bottom-sheet)
  INPUT_PERSONA: 'input-persona',
  INPUT_CONCEPTO: 'input-concepto',
  INPUT_MONTO: 'input-monto',
  INPUT_FECHA: 'input-fecha',
  BTN_GUARDAR_DEUDA: 'btn-guardar-deuda',
  INPUT_MONTO_PAGO: 'input-monto-pago',
  INPUT_FECHA_PAGO: 'input-fecha-pago',
  INPUT_NOTAS_PAGO: 'input-notas-pago',
  BTN_CONFIRMAR_PAGO: 'btn-confirmar-pago',
  INPUT_MONTO_GLOBAL: 'input-monto-global',
  BTN_DISTRIBUIR: 'btn-distribuir',
}

export const SHARED = {
  BOTTOM_SHEET: 'bottom-sheet',
  BOTTOM_SHEET_OVERLAY: 'bottom-sheet-overlay',
  BTN_CERRAR_BOTTOM_SHEET: 'btn-cerrar-bottom-sheet',
  CONFIRM_DIALOG: 'confirm-dialog',
  BTN_CONFIRM_YES: 'btn-confirm-yes',
  BTN_CONFIRM_NO: 'btn-confirm-no',
  MONTH_SELECTOR: 'month-selector',
  BTN_MES_PREV: 'btn-mes-prev',
  BTN_MES_NEXT: 'btn-mes-next',
  MES_ACTUAL: 'mes-actual',
}
