import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { categorias, usuarios, configuraciones } from './schema.js'

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
  await db.delete(configuraciones)
  await db.delete(categorias)
  await db.delete(usuarios)

  console.log('Insertando categorias predefinidas...')
  for (const cat of predefinedCategories) {
    await db.insert(categorias).values(cat)
  }

  console.log('Creando usuario por defecto...')
  const [user] = await db
    .insert(usuarios)
    .values({ nombre: 'Usuario', email: 'usuario@misfinanzas.app' })
    .returning({ id: usuarios.id })

  console.log('Creando configuracion por defecto...')
  await db
    .insert(configuraciones)
    .values({
      usuarioId: user.id,
      presupuestoMensualDefault: '4500.00',
      monedaPreferida: 'PEN',
      diaInicioCiclo: 1,
    })

  console.log('Seed completado.')
  await client.end()
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed fallo:', err)
  process.exit(1)
})
