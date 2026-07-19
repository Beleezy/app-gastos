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
  { nombre: 'Alimentacion', icono: '🍽️', color: '#ef4444', esPredefinida: true },
  { nombre: 'Transporte', icono: '🚌', color: '#3b82f6', esPredefinida: true },
  { nombre: 'Vivienda', icono: '🏠', color: '#f59e0b', esPredefinida: true },
  { nombre: 'Salud', icono: '🏥', color: '#10b981', esPredefinida: true },
  { nombre: 'Educacion', icono: '📚', color: '#8b5cf6', esPredefinida: true },
  { nombre: 'Entretenimiento', icono: '🎮', color: '#ec4899', esPredefinida: true },
  { nombre: 'Vestimenta', icono: '👕', color: '#f97316', esPredefinida: true },
  { nombre: 'Servicios', icono: '⚡', color: '#06b6d4', esPredefinida: true },
  { nombre: 'Ahorro', icono: '💰', color: '#22c55e', esPredefinida: true },
  { nombre: 'Deudas', icono: '💳', color: '#e11d48', esPredefinida: true },
  { nombre: 'Otros', icono: '📦', color: '#6b7280', esPredefinida: true },
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

  insertedCats.forEach((cat) => {
    console.log(`  ✓ ${cat.nombre}`)
  })

  console.log('\n✅ Seed completado exitosamente.')
  console.log(`  📦 ${insertedCats.length} categorías predefinidas creadas`)
  console.log('  👤 Base de datos lista para nuevos usuarios')

  await client.end()
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed fallo:', err)
  process.exit(1)
})
