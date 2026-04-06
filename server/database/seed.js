import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import {
  categorias,
  usuarios,
  configuraciones,
  pagosDeuda,
  deudas,
  personasEntidades,
  gastosPlanificados,
  planesMensuales,
  gastos,
} from './schema.js'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('DATABASE_URL no esta configurada en .env')
  process.exit(1)
}

const client = postgres(connectionString)
const db = drizzle(client)

const predefinedCategories = [
  { nombre: 'Alimentacion',    icono: '🍽️',  color: '#ef4444', esPredefinida: true },
  { nombre: 'Transporte',      icono: '🚌',  color: '#3b82f6', esPredefinida: true },
  { nombre: 'Vivienda',        icono: '🏠',  color: '#f59e0b', esPredefinida: true },
  { nombre: 'Salud',           icono: '🏥',  color: '#10b981', esPredefinida: true },
  { nombre: 'Educacion',       icono: '📚',  color: '#8b5cf6', esPredefinida: true },
  { nombre: 'Entretenimiento', icono: '🎮',  color: '#ec4899', esPredefinida: true },
  { nombre: 'Vestimenta',      icono: '👕',  color: '#f97316', esPredefinida: true },
  { nombre: 'Servicios',       icono: '⚡',  color: '#06b6d4', esPredefinida: true },
  { nombre: 'Ahorro',          icono: '💰',  color: '#22c55e', esPredefinida: true },
  { nombre: 'Deudas',          icono: '💳',  color: '#e11d48', esPredefinida: true },
  { nombre: 'Otros',           icono: '📦',  color: '#6b7280', esPredefinida: true },
]

async function seed() {
  console.log('Limpiando tablas...')
  // Orden de eliminación respetando relaciones (dependencias primero)
  await db.delete(pagosDeuda)
  await db.delete(deudas)
  await db.delete(personasEntidades)
  await db.delete(gastosPlanificados)
  await db.delete(planesMensuales)
  await db.delete(gastos)
  await db.delete(configuraciones)
  await db.delete(categorias)
  await db.delete(usuarios)

  console.log('Insertando categorias predefinidas...')
  const insertedCats = await db
    .insert(categorias)
    .values(predefinedCategories)
    .returning({ id: categorias.id, nombre: categorias.nombre })

  // Mapear categorías por nombre para facilitar acceso
  const catMap = {}
  insertedCats.forEach(cat => {
    catMap[cat.nombre] = cat.id
  })

  console.log('Creando usuario por defecto...')
  const [user] = await db
    .insert(usuarios)
    .values({ nombre: 'Bryan', email: 'bryan@misfinanzas.app' })
    .returning({ id: usuarios.id })

  const userId = user.id

  console.log('Creando configuracion por defecto...')
  await db
    .insert(configuraciones)
    .values({
      usuarioId: userId,
      presupuestoMensualDefault: '4500.00',
      monedaPreferida: 'PEN',
      diaInicioCiclo: 1,
    })

  // ── MÓDULO 1: PLANIFICADOR ──
  console.log('Insertando planes mensuales...')
  const [planAbril] = await db
    .insert(planesMensuales)
    .values({
      usuarioId: userId,
      mes: 4,
      anio: 2026,
      montoPresupuesto: '4500.00',
    })
    .returning({ id: planesMensuales.id })

  const [planMayo] = await db
    .insert(planesMensuales)
    .values({
      usuarioId: userId,
      mes: 5,
      anio: 2026,
      montoPresupuesto: '4500.00',
    })
    .returning({ id: planesMensuales.id })

  console.log('Insertando gastos planificados...')
  await db
    .insert(gastosPlanificados)
    .values([
      // Gastos recurrentes de abril
      {
        planMensualId: planAbril.id,
        categoriaId: catMap['Vivienda'],
        concepto: 'Alquiler del mes',
        montoEstimado: '1500.00',
        fechaProbablePago: '2026-04-01',
        esRecurrente: true,
        estado: 'pendiente',
      },
      {
        planMensualId: planAbril.id,
        categoriaId: catMap['Servicios'],
        concepto: 'Recibo de luz',
        montoEstimado: '180.50',
        fechaProbablePago: '2026-04-05',
        esRecurrente: true,
        estado: 'pagado',
      },
      {
        planMensualId: planAbril.id,
        categoriaId: catMap['Servicios'],
        concepto: 'Internet y teléfono',
        montoEstimado: '120.00',
        fechaProbablePago: '2026-04-10',
        esRecurrente: true,
        estado: 'pagado',
      },
      {
        planMensualId: planAbril.id,
        categoriaId: catMap['Salud'],
        concepto: 'Cuota de gimnasio',
        montoEstimado: '99.00',
        fechaProbablePago: '2026-04-15',
        esRecurrente: true,
        estado: 'pendiente',
      },
      {
        planMensualId: planAbril.id,
        categoriaId: catMap['Educacion'],
        concepto: 'Clases de inglés',
        montoEstimado: '250.00',
        fechaProbablePago: '2026-04-08',
        esRecurrente: true,
        estado: 'pendiente',
      },
      {
        planMensualId: planAbril.id,
        categoriaId: catMap['Entretenimiento'],
        concepto: 'Suscripción Netflix',
        montoEstimado: '39.90',
        fechaProbablePago: '2026-04-12',
        esRecurrente: true,
        estado: 'pagado',
      },
      {
        planMensualId: planAbril.id,
        categoriaId: catMap['Alimentacion'],
        concepto: 'Compra en supermercado',
        montoEstimado: '350.00',
        fechaProbablePago: '2026-04-20',
        esRecurrente: false,
        estado: 'pendiente',
      },
      {
        planMensualId: planAbril.id,
        categoriaId: catMap['Transporte'],
        concepto: 'Mantenimiento del auto',
        montoEstimado: '200.00',
        fechaProbablePago: '2026-04-25',
        esRecurrente: false,
        estado: 'pendiente',
      },
      // Gastos para mayo
      {
        planMensualId: planMayo.id,
        categoriaId: catMap['Vivienda'],
        concepto: 'Alquiler del mes',
        montoEstimado: '1500.00',
        fechaProbablePago: '2026-05-01',
        esRecurrente: true,
        estado: 'pendiente',
      },
      {
        planMensualId: planMayo.id,
        categoriaId: catMap['Entretenimiento'],
        concepto: 'Vacaciones planeadas',
        montoEstimado: '1200.00',
        fechaProbablePago: '2026-05-15',
        esRecurrente: false,
        estado: 'pendiente',
      },
    ])

  // ── MÓDULO 2: REGISTRO DE GASTOS ──
  console.log('Insertando gastos registrados...')
  const today = '2026-04-06'
  await db
    .insert(gastos)
    .values([
      {
        usuarioId: userId,
        categoriaId: catMap['Alimentacion'],
        concepto: 'Desayuno en café',
        monto: '12.50',
        fecha: '2026-04-06',
        hora: '08:15',
        metodoRegistro: 'voz',
        transcripcionVoz: 'Gasté 12 soles y 50 céntimos en desayuno',
      },
      {
        usuarioId: userId,
        categoriaId: catMap['Transporte'],
        concepto: 'Pasaje en taxi',
        monto: '15.00',
        fecha: '2026-04-06',
        hora: '09:00',
        metodoRegistro: 'manual',
      },
      {
        usuarioId: userId,
        categoriaId: catMap['Alimentacion'],
        concepto: 'Almuerzo en restaurante',
        monto: '28.00',
        fecha: '2026-04-06',
        hora: '13:30',
        metodoRegistro: 'voz',
        transcripcionVoz: 'Almorcé en el restaurante y gasté 28 soles',
      },
      {
        usuarioId: userId,
        categoriaId: catMap['Entretenimiento'],
        concepto: 'Cine y palomitas',
        monto: '45.00',
        fecha: '2026-04-06',
        hora: '18:00',
        metodoRegistro: 'manual',
        notas: 'Función de noche con amigos',
      },
      {
        usuarioId: userId,
        categoriaId: catMap['Alimentacion'],
        concepto: 'Snack en cine',
        monto: '18.00',
        fecha: '2026-04-06',
        hora: '18:15',
        metodoRegistro: 'voz',
        transcripcionVoz: 'Compré snacks en el cine',
      },
      // Gastos de días anteriores
      {
        usuarioId: userId,
        categoriaId: catMap['Alimentacion'],
        concepto: 'Gaseosa',
        monto: '4.00',
        fecha: '2026-04-05',
        hora: '10:30',
        metodoRegistro: 'voz',
        transcripcionVoz: 'Gasté 4 soles en una gaseosa',
      },
      {
        usuarioId: userId,
        categoriaId: catMap['Alimentacion'],
        concepto: 'Café con colega',
        monto: '22.00',
        fecha: '2026-04-05',
        hora: '15:00',
        metodoRegistro: 'manual',
      },
      {
        usuarioId: userId,
        categoriaId: catMap['Vestimenta'],
        concepto: 'Polos para el trabajo',
        monto: '89.90',
        fecha: '2026-04-04',
        hora: '11:00',
        metodoRegistro: 'manual',
        notas: 'Compra en tienda del centro',
      },
      {
        usuarioId: userId,
        categoriaId: catMap['Salud'],
        concepto: 'Vitaminas',
        monto: '35.00',
        fecha: '2026-04-03',
        hora: '16:30',
        metodoRegistro: 'manual',
      },
    ])

  // ── MÓDULO 3: DEUDAS ──
  console.log('Insertando personas y deudas...')

  // Personas que me deben (mayoría según preferencia del usuario)
  const [diego] = await db
    .insert(personasEntidades)
    .values({
      usuarioId: userId,
      nombre: 'Diego',
      tipo: 'persona',
      contacto: '+51 999 123456',
      notas: 'Compañero de trabajo',
    })
    .returning({ id: personasEntidades.id })

  const [maria] = await db
    .insert(personasEntidades)
    .values({
      usuarioId: userId,
      nombre: 'María García',
      tipo: 'persona',
      contacto: 'maria.garcia@email.com',
      notas: 'Amiga de la universidad',
    })
    .returning({ id: personasEntidades.id })

  const [carlos] = await db
    .insert(personasEntidades)
    .values({
      usuarioId: userId,
      nombre: 'Carlos López',
      tipo: 'persona',
      contacto: '+51 995 654321',
    })
    .returning({ id: personasEntidades.id })

  const [andres] = await db
    .insert(personasEntidades)
    .values({
      usuarioId: userId,
      nombre: 'Andrés',
      tipo: 'persona',
      contacto: '+51 998 765432',
      notas: 'Hermano',
    })
    .returning({ id: personasEntidades.id })

  // Personas a las que le debo (menos datos)
  const [superMercado] = await db
    .insert(personasEntidades)
    .values({
      usuarioId: userId,
      nombre: 'Wong Supermercados',
      tipo: 'organizacion',
      contacto: 'servicio@wong.pe',
    })
    .returning({ id: personasEntidades.id })

  const [bancoCredito] = await db
    .insert(personasEntidades)
    .values({
      usuarioId: userId,
      nombre: 'Banco de Crédito',
      tipo: 'organizacion',
    })
    .returning({ id: personasEntidades.id })

  // Insertar deudas (me deben)
  const [deuda1] = await db
    .insert(deudas)
    .values({
      usuarioId: userId,
      personaEntidadId: diego.id,
      tipoDeuda: 'me_deben',
      concepto: 'Almuerzo pagado el martes',
      montoOriginal: '45.00',
      montoPendiente: '45.00',
      fechaCreacion: '2026-04-01',
      estado: 'pendiente',
      notas: 'Acuerda pagar cuando reciba su comisión',
    })
    .returning({ id: deudas.id })

  const [deuda2] = await db
    .insert(deudas)
    .values({
      usuarioId: userId,
      personaEntidadId: diego.id,
      tipoDeuda: 'me_deben',
      concepto: 'Pasaje pagado para ir al cine',
      montoOriginal: '15.00',
      montoPendiente: '15.00',
      fechaCreacion: '2026-04-02',
      estado: 'pendiente',
    })
    .returning({ id: deudas.id })

  const [deuda3] = await db
    .insert(deudas)
    .values({
      usuarioId: userId,
      personaEntidadId: maria.id,
      tipoDeuda: 'me_deben',
      concepto: 'Préstamo para gastos de emergencia',
      montoOriginal: '200.00',
      montoPendiente: '100.00',
      fechaCreacion: '2026-03-15',
      estado: 'parcial',
      fechaPago: '2026-04-01',
      notas: 'María pagó S/ 100 el 1 de abril',
    })
    .returning({ id: deudas.id })

  const [deuda4] = await db
    .insert(deudas)
    .values({
      usuarioId: userId,
      personaEntidadId: carlos.id,
      tipoDeuda: 'me_deben',
      concepto: 'Prestamo para reparación de auto',
      montoOriginal: '500.00',
      montoPendiente: '500.00',
      fechaCreacion: '2026-02-20',
      estado: 'pendiente',
      notas: 'Acordamos pago a fin de mes',
    })
    .returning({ id: deudas.id })

  const [deuda5] = await db
    .insert(deudas)
    .values({
      usuarioId: userId,
      personaEntidadId: andres.id,
      tipoDeuda: 'me_deben',
      concepto: 'Dinero para compras de ropa',
      montoOriginal: '80.00',
      montoPendiente: '0.00',
      fechaCreacion: '2026-03-20',
      estado: 'pagado',
      fechaPago: '2026-04-05',
      notas: 'Pagado completamente el 5 de abril',
    })
    .returning({ id: deudas.id })

  // Insertar deudas (yo debo)
  const [deuda6] = await db
    .insert(deudas)
    .values({
      usuarioId: userId,
      personaEntidadId: superMercado.id,
      tipoDeuda: 'yo_debo',
      concepto: 'Compra en tarjeta de crédito',
      montoOriginal: '320.50',
      montoPendiente: '320.50',
      fechaCreacion: '2026-03-28',
      estado: 'pendiente',
      notas: 'Vence el 25 del mes',
    })
    .returning({ id: deudas.id })

  const [deuda7] = await db
    .insert(deudas)
    .values({
      usuarioId: userId,
      personaEntidadId: bancoCredito.id,
      tipoDeuda: 'yo_debo',
      concepto: 'Préstamo personal',
      montoOriginal: '3000.00',
      montoPendiente: '2400.00',
      fechaCreacion: '2026-01-15',
      estado: 'parcial',
      notas: 'Cuota mensual: 300 soles',
    })
    .returning({ id: deudas.id })

  // Insertar pagos de deudas
  console.log('Insertando registros de pagos...')
  await db
    .insert(pagosDeuda)
    .values([
      {
        deudaId: deuda3.id,
        montoPagado: '100.00',
        fechaPago: '2026-04-01',
        metodoPago: 'transferencia',
        notas: 'Primer pago del préstamo',
      },
      {
        deudaId: deuda5.id,
        montoPagado: '80.00',
        fechaPago: '2026-04-05',
        metodoPago: 'efectivo',
      },
      {
        deudaId: deuda7.id,
        montoPagado: '300.00',
        fechaPago: '2026-03-25',
        metodoPago: 'transferencia',
      },
      {
        deudaId: deuda7.id,
        montoPagado: '300.00',
        fechaPago: '2026-04-02',
        metodoPago: 'transferencia',
      },
    ])

  console.log('✅ Seed completado exitosamente.')
  console.log(`  📊 Usuario creado: Bryan (${userId})`)
  console.log(`  📋 2 planes mensuales (Abril y Mayo 2026)`)
  console.log(`  💰 9 gastos planificados`)
  console.log(`  📝 9 gastos registrados (algunos por voz)`)
  console.log(`  👥 6 personas/entidades`)
  console.log(`  💳 7 deudas (5 "me deben" + 2 "yo debo")`)
  console.log(`  ✅ 4 pagos registrados`)

  await client.end()
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed fallo:', err)
  process.exit(1)
})
