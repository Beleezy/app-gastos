#!/usr/bin/env node
import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import { eq } from 'drizzle-orm'
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

// ═════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═════════════════════════════════════════════════════════════════════════════

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

// Datos de prueba para gastos registrados
const gastosData = [
  { cat: 'Alimentacion', conceptos: ['Desayuno en café', 'Almuerzo en restaurante', 'Cena', 'Snacks', 'Café con colega', 'Pastel en panadería', 'Comida rápida', 'Helado'], montos: [8.50, 18, 22, 5, 12, 4.50, 15, 6.50] },
  { cat: 'Transporte', conceptos: ['Pasaje en taxi', 'Pasaje en bus', 'Uber', 'Carga de tarjeta Metropolitana', 'Estacionamiento'], montos: [15, 2.50, 18, 20, 10] },
  { cat: 'Servicios', conceptos: ['Recibo de luz', 'Internet y teléfono', 'Agua', 'Gas'], montos: [180.50, 120, 45.50, 35] },
  { cat: 'Salud', conceptos: ['Farmacia', 'Vitaminas', 'Consulta médica', 'Dentista'], montos: [35, 45, 80, 150] },
  { cat: 'Entretenimiento', conceptos: ['Cine', 'Concierto', 'Bar', 'Videojuegos', 'Netflix', 'Spotify'], montos: [35, 80, 50, 25, 39.90, 10.99] },
  { cat: 'Educacion', conceptos: ['Clases de inglés', 'Cursos online', 'Libros', 'Materiales escolares'], montos: [250, 100, 35, 45] },
  { cat: 'Vestimenta', conceptos: ['Ropa en tienda', 'Zapatos', 'Accesorios', 'Ropa deportiva'], montos: [89.90, 150, 25, 120] },
  { cat: 'Vivienda', conceptos: ['Alquiler', 'Mantenimiento', 'Reparación'], montos: [1500, 200, 150] },
  { cat: 'Otros', conceptos: ['Compra variada', 'Regalos', 'Donación'], montos: [50, 100, 25] },
]

// Horas variadas durante el día
const horasDelDia = ['08:15', '10:30', '12:45', '13:30', '15:00', '16:30', '18:00', '19:45', '21:00', '22:30']

// ═════════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ═════════════════════════════════════════════════════════════════════════════

function addDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function formatDate(date) {
  return date.toISOString().split('T')[0]
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomDecimal(min, max, decimals = 2) {
  return (Math.random() * (max - min) + min).toFixed(decimals)
}

// ═════════════════════════════════════════════════════════════════════════════
// FUNCIONES PRINCIPALES
// ═════════════════════════════════════════════════════════════════════════════

async function generateTestData(existingUserId = null) {
  try {
    // 1. Obtener o crear usuario
    let userId
    if (existingUserId) {
      const existingUser = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.id, existingUserId)).limit(1)
      if (!existingUser || existingUser.length === 0) {
        console.error(`❌ Usuario con ID "${existingUserId}" no encontrado en la base de datos`)
        console.error('Por favor verifica que el ID sea correcto y que el usuario exista.')
        await client.end()
        process.exit(1)
      }
      userId = existingUserId
      console.log(`✅ Usando usuario existente: ${userId}`)
    } else {
      const [newUser] = await db
        .insert(usuarios)
        .values({ nombre: 'Usuario Prueba', email: `test-${Date.now()}@misfinanzas.app` })
        .returning({ id: usuarios.id })
      userId = newUser.id
      console.log(`✅ Usuario creado: ${userId}`)
    }

    // 2. Obtener o crear categorías
    let catMap = {}
    const existingCats = await db.select({ id: categorias.id, nombre: categorias.nombre }).from(categorias)

    if (existingCats.length === 0) {
      console.log('  Creando categorías predefinidas...')
      const insertedCats = await db
        .insert(categorias)
        .values(predefinedCategories)
        .returning({ id: categorias.id, nombre: categorias.nombre })
      insertedCats.forEach(cat => {
        catMap[cat.nombre] = cat.id
      })
      console.log(`✅ ${insertedCats.length} categorías predefinidas creadas`)
    } else {
      existingCats.forEach(cat => {
        catMap[cat.nombre] = cat.id
      })
      console.log(`✅ Usando ${existingCats.length} categorías existentes`)
    }

    // Validar que todas las categorías necesarias existan
    const categoriasNecesarias = ['Alimentacion', 'Transporte', 'Vivienda', 'Salud', 'Educacion', 'Entretenimiento', 'Vestimenta', 'Servicios']
    for (const cat of categoriasNecesarias) {
      if (!catMap[cat]) {
        console.error(`❌ Categoría "${cat}" no encontrada. Asegúrate de ejecutar primero: npm run db:seed`)
        await client.end()
        process.exit(1)
      }
    }

    // 3. Crear/actualizar configuración
    const existingConfig = await db.select().from(configuraciones).where(eq(configuraciones.usuarioId, userId))
    if (existingConfig.length === 0) {
      await db
        .insert(configuraciones)
        .values({
          usuarioId: userId,
          presupuestoMensualDefault: '4500.00',
          monedaPreferida: 'PEN',
          diaInicioCiclo: 1,
        })
      console.log(`✅ Configuración creada`)
    }

    // 4. MÓDULO 1: GASTOS PLANIFICADOS (20 gastos para 3 meses)
    console.log('\n📋 Generando gastos planificados (3 meses)...')
    const today = new Date('2026-04-07')
    const planes = []

    // Crear planes para febrero, marzo y abril 2026
    for (let monthOffset = -2; monthOffset <= 0; monthOffset++) {
      const planDate = new Date(today)
      planDate.setMonth(planDate.getMonth() + monthOffset)

      const [plan] = await db
        .insert(planesMensuales)
        .values({
          usuarioId: userId,
          mes: planDate.getMonth() + 1,
          anio: planDate.getFullYear(),
          montoPresupuesto: '4500.00',
        })
        .returning({ id: planesMensuales.id })

      planes.push({ id: plan.id, mes: planDate.getMonth() + 1, anio: planDate.getFullYear() })
    }

    // Gastos planificados recurrentes y únicos
    const gastosPlaneados = [
      // Recurrentes
      { cat: 'Vivienda', concepto: 'Alquiler del mes', monto: '1500.00', recurrente: true, dia: 1 },
      { cat: 'Servicios', concepto: 'Recibo de luz', monto: '180.50', recurrente: true, dia: 5 },
      { cat: 'Servicios', concepto: 'Internet y teléfono', monto: '120.00', recurrente: true, dia: 10 },
      { cat: 'Salud', concepto: 'Cuota de gimnasio', monto: '99.00', recurrente: true, dia: 15 },
      { cat: 'Educacion', concepto: 'Clases de inglés', monto: '250.00', recurrente: true, dia: 8 },
      { cat: 'Entretenimiento', concepto: 'Suscripción Netflix', monto: '39.90', recurrente: true, dia: 12 },
      { cat: 'Entretenimiento', concepto: 'Suscripción Spotify', monto: '10.99', recurrente: true, dia: 13 },
      // Únicos por mes
      { cat: 'Alimentacion', concepto: 'Compra en supermercado', monto: '350.00', recurrente: false, dia: 20 },
      { cat: 'Transporte', concepto: 'Mantenimiento del auto', monto: '200.00', recurrente: false, dia: 25 },
      { cat: 'Salud', concepto: 'Compra de vitaminas', monto: '65.00', recurrente: false, dia: 18 },
      { cat: 'Vestimenta', concepto: 'Compra de ropa', monto: '150.00', recurrente: false, dia: 22 },
      { cat: 'Entretenimiento', concepto: 'Salida al cine', monto: '60.00', recurrente: false, dia: 16 },
      { cat: 'Educacion', concepto: 'Compra de materiales', monto: '45.00', recurrente: false, dia: 19 },
    ]

    for (const plan of planes) {
      for (const gasto of gastosPlaneados) {
        const estado = randomInt(1, 100) > 60 ? 'pagado' : 'pendiente'
        await db
          .insert(gastosPlanificados)
          .values({
            planMensualId: plan.id,
            categoriaId: catMap[gasto.cat],
            concepto: gasto.concepto,
            montoEstimado: gasto.monto,
            fechaProbablePago: formatDate(new Date(plan.anio, plan.mes - 1, gasto.dia)),
            esRecurrente: gasto.recurrente,
            estado,
          })
      }
    }
    console.log(`✅ ${planes.length * gastosPlaneados.length} gastos planificados creados`)

    // 5. MÓDULO 2: GASTOS REGISTRADOS (150 gastos en los últimos 3 meses)
    console.log('\n💰 Generando 150 gastos registrados (últimos 3 meses)...')
    const gastosRegistrados = []
    const startDate = addDays(today, -90) // 90 días atrás

    for (let i = 0; i < 150; i++) {
      const fecha = addDays(startDate, randomInt(0, 90))
      const gastosCategoria = randomItem(gastosData)
      const indice = randomInt(0, gastosCategoria.conceptos.length - 1)
      const concepto = gastosCategoria.conceptos[indice]
      const monto = gastosCategoria.montos[indice]
      const hora = randomItem(horasDelDia)
      const metodo = randomInt(1, 100) > 60 ? 'voz' : 'manual'

      gastosRegistrados.push({
        usuarioId: userId,
        categoriaId: catMap[gastosCategoria.cat],
        concepto,
        monto: monto.toString(),
        fecha: formatDate(fecha),
        hora,
        metodoRegistro: metodo,
        transcripcionVoz: metodo === 'voz' ? `Gasté ${monto} soles en ${concepto.toLowerCase()}` : null,
      })
    }

    // Insertar en lotes de 20 para evitar problemas
    for (let i = 0; i < gastosRegistrados.length; i += 20) {
      const lote = gastosRegistrados.slice(i, i + 20)
      await db.insert(gastos).values(lote)
    }
    console.log(`✅ 150 gastos registrados creados`)

    // 6. MÓDULO 3: PERSONAS Y DEUDAS
    console.log('\n👥 Generando deudas y pagos...')

    // Crear 5 personas que le deben (1 org, 4 personas)
    const personasQueMeDeben = []
    const datosPersonas = [
      { nombre: 'Diego Martinez', tipo: 'persona', contacto: '+51 999 123456' },
      { nombre: 'María García', tipo: 'persona', contacto: 'maria@email.com' },
      { nombre: 'Carlos López', tipo: 'persona', contacto: '+51 995 654321' },
      { nombre: 'Andrés Pérez', tipo: 'persona', contacto: '+51 998 765432' },
      { nombre: 'Tienda El Ahorro', tipo: 'organizacion', contacto: 'info@ahorro.pe' },
    ]

    for (const datos of datosPersonas) {
      const [persona] = await db
        .insert(personasEntidades)
        .values({
          usuarioId: userId,
          nombre: datos.nombre,
          tipo: datos.tipo,
          contacto: datos.contacto,
        })
        .returning({ id: personasEntidades.id })
      personasQueMeDeben.push(persona)
    }
    console.log(`✅ 5 personas creadas (me deben)`)

    // Crear 4 personas a las que le debo (3 personas, 1 org)
    const personasAQuiDeudoData = [
      { nombre: 'Banco de Crédito', tipo: 'organizacion', contacto: 'credito@banco.pe' },
      { nombre: 'Proveedor Importaciones XYZ', tipo: 'organizacion', contacto: 'ventas@xyz.com' },
      { nombre: 'Juan Rodríguez', tipo: 'persona', contacto: '+51 912 345678' },
      { nombre: 'Sofía Ruiz', tipo: 'persona', contacto: 'sofia@email.com' },
    ]

    const personasAQuiDeubo = []
    for (const datos of personasAQuiDeudoData) {
      const [persona] = await db
        .insert(personasEntidades)
        .values({
          usuarioId: userId,
          nombre: datos.nombre,
          tipo: datos.tipo,
          contacto: datos.contacto,
        })
        .returning({ id: personasEntidades.id })
      personasAQuiDeubo.push(persona)
    }
    console.log(`✅ 4 personas creadas (le debo)`)

    // Crear deudas detalladas (10-15 detalles/conceptos por persona)
    const todasLasDeudas = []
    let deudaIndex = 0

    // Deudas "me deben"
    const conceptosMeDeben = [
      'Almuerzo compartido',
      'Pasaje pagado',
      'Dinero para compras',
      'Café y snacks',
      'Entrada a evento',
      'Delivery de comida',
      'Compra urgente',
      'Préstamo de emergencia',
      'Dinero para gasolina',
      'Reparación pagada',
      'Compra de accesorios',
      'Pago de cuenta restaurante',
    ]

    for (const persona of personasQueMeDeben) {
      const numConceptos = randomInt(10, 15)
      for (let i = 0; i < numConceptos; i++) {
        const monto = randomDecimal(20, 300, 2)
        const fechaCreacion = addDays(today, -randomInt(5, 85))
        const [deuda] = await db
          .insert(deudas)
          .values({
            usuarioId: userId,
            personaEntidadId: persona.id,
            tipoDeuda: 'me_deben',
            concepto: randomItem(conceptosMeDeben),
            montoOriginal: monto,
            montoPendiente: monto,
            fechaCreacion: formatDate(fechaCreacion),
            estado: 'pendiente',
          })
          .returning({ id: deudas.id })
        todasLasDeudas.push({ id: deuda.id, monto, estado: 'pendiente' })
        deudaIndex++
      }
    }
    console.log(`✅ Deudas "me deben" creadas (${deudaIndex} detalles totales)`)

    // Deudas "yo debo"
    const conceptosYoDebo = [
      'Préstamo personal',
      'Cuota de crédito',
      'Compra a plazos',
      'Servicio pendiente',
      'Compra de equipos',
      'Arrendamiento',
      'Comisión adeudada',
      'Servicio profesional',
      'Importación de productos',
      'Consultoría',
      'Mantenimiento contratado',
      'Compra de mercadería',
      'Servicios de transporte',
    ]

    let deudaYoDeboIndex = 0
    for (const persona of personasAQuiDeubo) {
      const numConceptos = randomInt(10, 15)
      for (let i = 0; i < numConceptos; i++) {
        const monto = randomDecimal(50, 500, 2)
        const fechaCreacion = addDays(today, -randomInt(10, 80))
        const [deuda] = await db
          .insert(deudas)
          .values({
            usuarioId: userId,
            personaEntidadId: persona.id,
            tipoDeuda: 'yo_debo',
            concepto: randomItem(conceptosYoDebo),
            montoOriginal: monto,
            montoPendiente: monto,
            fechaCreacion: formatDate(fechaCreacion),
            estado: 'pendiente',
          })
          .returning({ id: deudas.id })
        todasLasDeudas.push({ id: deuda.id, monto, estado: 'pendiente' })
        deudaYoDeboIndex++
      }
    }
    console.log(`✅ Deudas "yo debo" creadas (${deudaYoDeboIndex} detalles totales)`)

    // 7. PAGOS DE DEUDAS (mínimo 10, con diferentes patrones)
    console.log('\n💳 Generando pagos de deudas...')
    const pagos = []
    let contadorPagos = 0

    // Seleccionar deudas aleatorias para crear pagos
    for (let i = 0; i < Math.min(15, todasLasDeudas.length); i++) {
      const deuda = todasLasDeudas[randomInt(0, todasLasDeudas.length - 1)]
      const montoDeuda = parseFloat(deuda.monto)

      // Diferentes patrones de pago
      const patron = randomInt(1, 3)
      let montoPagos = []

      if (patron === 1) {
        // Pago total
        montoPagos = [montoDeuda]
      } else if (patron === 2) {
        // Pago parcial (2-3 cuotas)
        const numCuotas = randomInt(2, 3)
        const cuota = montoDeuda / numCuotas
        for (let j = 0; j < numCuotas - 1; j++) {
          montoPagos.push(parseFloat((cuota * (0.8 + Math.random() * 0.4)).toFixed(2)))
        }
        // Última cuota es el residuo
        const sumaParcial = montoPagos.reduce((a, b) => a + b, 0)
        montoPagos.push(parseFloat((montoDeuda - sumaParcial).toFixed(2)))
      } else {
        // Abonos pequeños (3-5 abonos)
        const numAbonos = randomInt(3, 5)
        let acumulado = 0
        for (let j = 0; j < numAbonos - 1; j++) {
          const abono = parseFloat((montoDeuda / numAbonos * (0.7 + Math.random() * 0.6)).toFixed(2))
          montoPagos.push(abono)
          acumulado += abono
        }
        montoPagos.push(parseFloat((montoDeuda - acumulado).toFixed(2)))
      }

      // Registrar pagos
      for (const monto of montoPagos) {
        const fechaPago = addDays(today, -randomInt(0, 30))
        await db
          .insert(pagosDeuda)
          .values({
            deudaId: deuda.id,
            montoPagado: monto.toString(),
            fechaPago: formatDate(fechaPago),
            metodoPago: randomItem(['efectivo', 'transferencia', 'tarjeta']),
          })
        contadorPagos++
      }

      // Actualizar estado de la deuda si está completamente pagada
      const totalPagado = montoPagos.reduce((a, b) => a + b, 0)
      if (Math.abs(totalPagado - montoDeuda) < 0.01) {
        await db
          .update(deudas)
          .set({ estado: 'pagado', montoPendiente: '0.00' })
          .where(eq(deudas.id, deuda.id))
      } else if (totalPagado > 0) {
        const newPendiente = montoDeuda - totalPagado
        await db
          .update(deudas)
          .set({ estado: 'parcial', montoPendiente: newPendiente.toString() })
          .where(eq(deudas.id, deuda.id))
      }
    }
    console.log(`✅ ${contadorPagos} pagos de deudas registrados`)

    // Resumen final
    console.log('\n' + '═'.repeat(70))
    console.log('✨ SEED DE DATOS DE PRUEBA COMPLETADO EXITOSAMENTE')
    console.log('═'.repeat(70))
    console.log(`  📊 Usuario ID: ${userId}`)
    console.log(`  📋 3 planes mensuales (Feb, Mar, Abr 2026)`)
    console.log(`  💰 ${gastosPlaneados.length * 3} gastos planificados`)
    console.log(`  📝 150 gastos registrados (voz/manual)`)
    console.log(`  👥 9 personas/entidades creadas`)
    console.log(`  💳 ${deudaIndex + deudaYoDeboIndex} deudas (detalles) creadas`)
    console.log(`  ✅ ${contadorPagos} pagos registrados`)
    console.log('═'.repeat(70))

    await client.end()
    process.exit(0)

  } catch (err) {
    console.error('\n' + '═'.repeat(70))
    console.error('❌ ERROR DURANTE LA GENERACIÓN DE DATOS')
    console.error('═'.repeat(70))
    console.error('\nMensaje:', err.message)
    if (err.detail) console.error('Detalle:', err.detail)
    console.error('\n📝 Soluciones:')
    console.error('  1. Ejecuta primero: npm run db:seed')
    console.error('  2. Verifica que DATABASE_URL esté configurada correctamente')
    console.error('  3. Si pasaste un USER_ID, asegúrate de que sea válido')
    console.error('═'.repeat(70) + '\n')
    console.error('Stack:', err)

    try {
      await client.end()
    } catch (e) {
      // Ignorar errores al cerrar
    }
    process.exit(1)
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// EJECUTAR
// ═════════════════════════════════════════════════════════════════════════════

const args = process.argv.slice(2)
const userId = args[0] || null

console.log('\n' + '═'.repeat(70))
if (userId) {
  console.log(`🔄 GENERANDO DATOS DE PRUEBA PARA USUARIO`)
  console.log(`   ID: ${userId}`)
} else {
  console.log('🔄 GENERANDO DATOS DE PRUEBA (USUARIO NUEVO)')
}
console.log('═'.repeat(70) + '\n')

generateTestData(userId)
