import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { categorias } from './schema.js'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('DATABASE_URL no esta configurada en .env')
  process.exit(1)
}

const client = postgres(connectionString)
const db = drizzle(client)

const predefinedCategories = [
  { nombre: 'Alimentacion',    icono: 'utensils',      color: '#ef4444', esPredefinida: true },
  { nombre: 'Transporte',      icono: 'bus',           color: '#3b82f6', esPredefinida: true },
  { nombre: 'Vivienda',        icono: 'home',          color: '#f59e0b', esPredefinida: true },
  { nombre: 'Salud',           icono: 'heart-pulse',   color: '#10b981', esPredefinida: true },
  { nombre: 'Educacion',       icono: 'graduation-cap', color: '#8b5cf6', esPredefinida: true },
  { nombre: 'Entretenimiento', icono: 'gamepad',       color: '#ec4899', esPredefinida: true },
  { nombre: 'Vestimenta',      icono: 'shirt',         color: '#f97316', esPredefinida: true },
  { nombre: 'Servicios',       icono: 'zap',           color: '#06b6d4', esPredefinida: true },
  { nombre: 'Ahorro',          icono: 'piggy-bank',    color: '#22c55e', esPredefinida: true },
  { nombre: 'Deudas',          icono: 'credit-card',   color: '#e11d48', esPredefinida: true },
  { nombre: 'Otros',           icono: 'circle-dot',    color: '#6b7280', esPredefinida: true },
]

async function seed() {
  console.log('Insertando categorias predefinidas...')
  for (const cat of predefinedCategories) {
    await db.insert(categorias).values(cat).onConflictDoNothing()
  }
  console.log('Seed completado.')
  await client.end()
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed fallo:', err)
  process.exit(1)
})
