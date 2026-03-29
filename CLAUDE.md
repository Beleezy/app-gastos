# Prompt de Desarrollo — Sistema de Finanzas Personales

## Contexto General

Desarrolla un **sistema web progresivo (PWA)** de finanzas personales optimizado para uso móvil, construido con **Nuxt 3** (JavaScript), que permita al usuario gestionar su economía diaria de forma rápida e intuitiva. El sistema debe tener una interfaz moderna, limpia y responsiva — priorizando la experiencia en smartphones — con navegación inferior tipo app móvil entre sus tres módulos principales.

**Stack tecnológico obligatorio:**

- **Frontend:** Nuxt 3 (Vue 3 + Composition API), JavaScript
- **Estilos:** Tailwind CSS (o UnoCSS)
- **Base de datos:** PostgreSQL (vía Supabase, Prisma, o Drizzle ORM — elige uno)
- **Autenticación:** Opcional pero recomendada (Supabase Auth o similar)
- **Despliegue:** Compatible con Vercel / Netlify
- **PWA:** @vite-pwa/nuxt para instalación en móvil
- **Voz:** Web Speech API (SpeechRecognition nativo del navegador)
- **IA para clasificación:** API de un LLM (Claude, OpenAI, etc.) para interpretar comandos de voz y extraer datos estructurados (monto, categoría, concepto, fecha)

---

## Diseño de Interfaz (UI/UX)

### Principios generales

- **Mobile-first:** Toda la interfaz debe diseñarse pensando en pantallas de 360–412px de ancho.
- **Navegación inferior (Bottom Navigation Bar)** con 3 tabs + ícono de perfil/ajustes:
  1. 📋 **Planificador** (Módulo 1)
  2. 🎙️ **Registro** (Módulo 2)
  3. 💳 **Deudas** (Módulo 3)
- **Paleta de colores:** Tonos oscuros o modo claro/oscuro. Usar acentos de color para categorías de gasto (ej: rojo para alimentación, azul para transporte, verde para servicios, etc.).
- **Tipografía:** Inter, Poppins o similar — legible y moderna.
- **Microinteracciones:** Transiciones suaves al cambiar de módulo, animaciones al agregar/eliminar registros, feedback visual al grabar voz.
- **Moneda:** Soles peruanos (S/) como moneda por defecto. Todos los montos se muestran con formato peruano (ej: S/ 1,250.00).

---

## MÓDULO 1 — Planificador de Gastos Mensuales

### Descripción funcional

Este módulo es **exclusivamente de planificación**, no de registro real. Permite al usuario definir un presupuesto mensual y distribuirlo en gastos planificados con categoría, monto estimado y fecha probable de pago. Sirve como una hoja de ruta financiera del mes.

### Pantalla principal

- **Header:** Muestra el mes/año activo (con selector para cambiar de mes) y un resumen:
  - Monto total presupuestado (ingreso o monto base del mes)
  - Total de gastos planificados (suma de todos los ítems)
  - Saldo restante proyectado (diferencia)
  - Barra de progreso visual mostrando qué porcentaje del presupuesto ya está asignado
- **Lista de gastos planificados:** Agrupados por categoría o por fecha, cada ítem muestra:
  - Nombre/concepto del gasto
  - Categoría (con ícono y color)
  - Monto estimado
  - Fecha probable de pago
  - Estado: Pendiente / Pagado (toggle para marcar cuando ya se realizó)
- **Botón flotante (FAB):** Para agregar un nuevo gasto planificado

### Formulario de gasto planificado

Campos:
- **Concepto** (texto libre, obligatorio) — ej: "Recibo de luz", "Cuota de gimnasio"
- **Categoría** (select, obligatorio) — Categorías predefinidas + opción de crear personalizada
- **Monto estimado** (numérico, obligatorio)
- **Fecha probable de pago** (date picker, obligatorio)
- **Recurrente** (toggle) — Si es recurrente, se replica automáticamente en meses futuros
- **Notas** (texto opcional)

### Categorías predefinidas sugeridas

Alimentación, Transporte, Vivienda (alquiler/servicios), Salud, Educación, Entretenimiento, Vestimenta, Servicios (luz, agua, internet, teléfono), Ahorro, Deudas/Préstamos, Otros.

### Funcionalidades adicionales

- Poder duplicar la planificación de un mes anterior al mes actual.
- Vista resumen con gráfico de dona/pie mostrando distribución por categoría.
- Filtros por categoría y por estado (pendiente/pagado).

---

## MÓDULO 2 — Registro de Gastos (con Comando de Voz)

### Descripción funcional

Este módulo es el **registro real de gastos**. El usuario puede registrar gastos de dos formas:
1. **Por voz** (método principal y destacado): Presiona un botón de micrófono y dicta uno o varios gastos en lenguaje natural.
2. **Manual:** Formulario tradicional como alternativa.

Todos los gastos quedan almacenados con fecha, hora, categoría, monto y concepto, y se muestran en un historial diario navegable.

### Registro por voz — Flujo detallado

1. El usuario presiona el **botón de micrófono** (grande, centrado, visualmente destacado — estilo botón circular con animación de pulso al grabar).
2. Mientras habla, se muestra una **visualización de onda de audio** o indicador de que está escuchando.
3. El usuario dicta en lenguaje natural. Ejemplos válidos que el sistema debe interpretar:
   - *"Gasté 2 soles en una gaseosa"*
   - *"Pagué 15 soles de almuerzo y 3.50 de pasaje"*
   - *"Ayer compré útiles escolares por 45 soles"*
   - *"Registra que gasté 120 soles en el dentista el martes pasado"*
   - *"Hoy gasté 5 soles en desayuno, 12 en almuerzo y 2.50 en galletas"*
4. El texto transcrito se envía a una **API de un LLM** (Claude o similar) con un prompt de sistema que le indique extraer datos estructurados en JSON:
   ```json
   {
     "gastos": [
       {
         "concepto": "Gaseosa",
         "monto": 2.00,
         "categoria": "Alimentación",
         "fecha": "2026-03-29"
       },
       {
         "concepto": "Pasaje",
         "monto": 3.50,
         "categoria": "Transporte",
         "fecha": "2026-03-29"
       }
     ]
   }
   ```
5. El sistema muestra una **tarjeta de confirmación** con los gastos interpretados, permitiendo al usuario:
   - Confirmar todos ✅
   - Editar individualmente cualquier campo antes de guardar ✏️
   - Descartar ❌
6. Al confirmar, se guardan en la base de datos.

### Pantalla principal del módulo

- **Header:** Fecha actual con navegación por días (flechas o swipe). Muestra:
  - Total gastado en el día seleccionado
  - Total gastado en el mes actual
- **Botón de micrófono:** Grande y centrado, es el elemento protagonista.
- **Historial del día:** Lista vertical de gastos registrados, cada uno mostrando:
  - Hora de registro
  - Concepto
  - Categoría (ícono + badge de color)
  - Monto
  - Acciones: editar / eliminar (swipe o botones)
- **Filtros rápidos:** Por categoría, por rango de fechas.
- **Vista mensual:** Accesible desde un toggle/tab, muestra gastos agrupados por día con subtotales.

### Formulario manual (alternativa a voz)

- Concepto (texto, obligatorio)
- Monto (numérico, obligatorio)
- Categoría (select, obligatorio)
- Fecha (date, por defecto hoy)
- Hora (time, por defecto la actual)
- Notas (texto opcional)

---

## MÓDULO 3 — Gestión de Deudas y Pagos Pendientes

### Descripción funcional

Este módulo gestiona dos escenarios:

1. **"Me deben"** — Personas que tienen deudas contigo.
2. **"Yo debo"** — Personas u organizaciones a las que tú les debes.

Cada registro de deuda está asociado a una persona/entidad y contiene un desglose detallado de los conceptos individuales que componen la deuda total.

### Pantalla principal

- **Tabs superiores o segmented control:**
  - **"Me deben"** (lista de deudores)
  - **"Yo debo"** (lista de acreedores)
- **Cada tab muestra una lista de personas/entidades**, cada una con:
  - Nombre (persona u organización)
  - Monto total de la deuda (suma de todos los conceptos activos)
  - Indicador visual del estado (ej: rojo si hay mucho pendiente, verde si casi todo pagado)
  - Fecha del último movimiento
- **Al tocar una persona**, se abre su **detalle** con:
  - Nombre y datos de contacto opcionales
  - Monto total pendiente (resaltado)
  - **Lista de conceptos de deuda**, cada uno con:
    - Concepto/descripción (ej: "Almuerzo del martes", "Préstamo para taxi")
    - Monto individual
    - Fecha en que se generó la deuda
    - Estado: Pendiente / Pagado parcial / Pagado total
    - Fecha de pago (si aplica)
    - Notas opcionales
  - Botón para **agregar nuevo concepto de deuda** a esa persona
  - Opción de **registrar pago** (parcial o total) sobre un concepto
- **Botón FAB en pantalla principal:** Para agregar un nuevo deudor/acreedor con su primer concepto de deuda.

### Formulario de nueva deuda

- **Tipo** (toggle): "Me debe" / "Yo debo"
- **Persona/Entidad** (texto o autocompletado si ya existe, obligatorio)
- **Concepto** (texto, obligatorio)
- **Monto** (numérico, obligatorio)
- **Fecha** (date, por defecto hoy)
- **Notas** (texto opcional)

### Funcionalidades adicionales

- Resumen general: Total que te deben vs. Total que debes (balance neto).
- Historial de pagos por persona.
- Marcar deuda completa como "saldada" (archivada pero consultable).
- Posibilidad de registrar deudas también por voz (reutilizando el motor del Módulo 2): *"Diego me debe 20 soles por el almuerzo de hoy"*.

---

## Modelo de Base de Datos (Esquema Relacional)

A continuación se presenta el esquema sugerido. Adáptalo según el ORM elegido (Prisma, Drizzle, SQL directo, etc.).

### Tablas del sistema

```
── usuarios
│   ├── id (PK, UUID)
│   ├── nombre
│   ├── email
│   ├── password_hash (si aplica auth)
│   ├── moneda_preferida (default: 'PEN')
│   ├── created_at
│   └── updated_at

── categorias
│   ├── id (PK, UUID)
│   ├── usuario_id (FK → usuarios) — NULL si es categoría global
│   ├── nombre
│   ├── icono
│   ├── color (hex)
│   ├── es_predefinida (boolean)
│   └── created_at
```

### Tablas del Módulo 1 — Planificador

```
── planes_mensuales
│   ├── id (PK, UUID)
│   ├── usuario_id (FK → usuarios)
│   ├── mes (int, 1-12)
│   ├── anio (int)
│   ├── monto_presupuesto (decimal) — ingreso o monto base del mes
│   ├── created_at
│   └── updated_at
│   🔑 UNIQUE(usuario_id, mes, anio)

── gastos_planificados
│   ├── id (PK, UUID)
│   ├── plan_mensual_id (FK → planes_mensuales)
│   ├── categoria_id (FK → categorias)
│   ├── concepto (varchar)
│   ├── monto_estimado (decimal)
│   ├── fecha_probable_pago (date)
│   ├── es_recurrente (boolean, default false)
│   ├── estado (enum: 'pendiente', 'pagado')
│   ├── notas (text, nullable)
│   ├── created_at
│   └── updated_at
```

### Tablas del Módulo 2 — Registro de Gastos

```
── gastos
│   ├── id (PK, UUID)
│   ├── usuario_id (FK → usuarios)
│   ├── categoria_id (FK → categorias)
│   ├── concepto (varchar)
│   ├── monto (decimal)
│   ├── fecha (date)
│   ├── hora (time)
│   ├── metodo_registro (enum: 'voz', 'manual')
│   ├── transcripcion_voz (text, nullable) — texto original dictado
│   ├── notas (text, nullable)
│   ├── created_at
│   └── updated_at
```

### Tablas del Módulo 3 — Deudas

```
── personas_entidades
│   ├── id (PK, UUID)
│   ├── usuario_id (FK → usuarios)
│   ├── nombre (varchar)
│   ├── tipo (enum: 'persona', 'organizacion')
│   ├── contacto (varchar, nullable) — teléfono, email, etc.
│   ├── notas (text, nullable)
│   ├── created_at
│   └── updated_at

── deudas
│   ├── id (PK, UUID)
│   ├── usuario_id (FK → usuarios)
│   ├── persona_entidad_id (FK → personas_entidades)
│   ├── tipo_deuda (enum: 'me_deben', 'yo_debo')
│   ├── concepto (varchar)
│   ├── monto_original (decimal)
│   ├── monto_pendiente (decimal) — se actualiza con cada pago
│   ├── fecha_creacion (date)
│   ├── estado (enum: 'pendiente', 'parcial', 'pagado', 'archivado')
│   ├── notas (text, nullable)
│   ├── created_at
│   └── updated_at

── pagos_deuda
│   ├── id (PK, UUID)
│   ├── deuda_id (FK → deudas)
│   ├── monto_pagado (decimal)
│   ├── fecha_pago (date)
│   ├── metodo_pago (varchar, nullable)
│   ├── notas (text, nullable)
│   └── created_at
```

### Diagrama de relaciones resumido

```
usuarios ─┬── planes_mensuales ── gastos_planificados ── categorias
           ├── gastos ── categorias
           ├── personas_entidades ── deudas ── pagos_deuda
           └── categorias (personalizadas)
```

---

## Especificaciones Técnicas Adicionales

### Estructura de carpetas sugerida (Nuxt 3)

```
├── pages/
│   ├── index.vue              (redirect al planificador o dashboard)
│   ├── planificador.vue       (Módulo 1)
│   ├── registro.vue           (Módulo 2)
│   └── deudas.vue             (Módulo 3)
├── components/
│   ├── layout/
│   │   ├── BottomNav.vue
│   │   └── AppHeader.vue
│   ├── planificador/
│   │   ├── ResumenMes.vue
│   │   ├── ListaGastosPlaneados.vue
│   │   └── FormGastoPlaneado.vue
│   ├── registro/
│   │   ├── BotonMicrofono.vue
│   │   ├── ConfirmacionVoz.vue
│   │   ├── HistorialDiario.vue
│   │   └── FormGastoManual.vue
│   └── deudas/
│       ├── ListaDeudores.vue
│       ├── DetallePersona.vue
│       ├── FormDeuda.vue
│       └── FormPago.vue
├── composables/
│   ├── useVoiceRecognition.ts  (Web Speech API)
│   ├── useLLMParser.ts         (envío a API de LLM)
│   ├── useGastos.ts
│   ├── usePlanificador.ts
│   └── useDeudas.ts
├── server/
│   ├── api/
│   │   ├── gastos/
│   │   ├── planificador/
│   │   ├── deudas/
│   │   └── voz/parse.post.ts  (endpoint para procesar voz con LLM)
│   └── database/
│       ├── schema.ts           (definición de tablas)
│       └── migrations/
├── layouts/
│   └── default.vue             (layout con BottomNav)
└── nuxt.config.ts
```

### Prompt de sistema para el LLM (procesamiento de voz)

Usa este prompt cuando envíes la transcripción de voz al LLM para extraer gastos estructurados:

```
Eres un asistente de finanzas personales. El usuario te va a dar un texto transcrito por voz donde describe uno o varios gastos que realizó. Tu tarea es extraer los datos de cada gasto mencionado.

Responde ÚNICAMENTE con un JSON válido (sin markdown, sin explicaciones) con esta estructura:
{
  "gastos": [
    {
      "concepto": "descripción corta del gasto",
      "monto": número decimal,
      "categoria": "una de: Alimentación, Transporte, Vivienda, Salud, Educación, Entretenimiento, Vestimenta, Servicios, Ahorro, Deudas, Otros",
      "fecha": "YYYY-MM-DD"
    }
  ]
}

Reglas:
- La fecha por defecto es hoy: {{FECHA_ACTUAL}}.
- Si el usuario dice "ayer", "el martes", "hace dos días", calcula la fecha correcta.
- Si menciona varios gastos en una sola oración, sepáralos en objetos individuales.
- Clasifica cada gasto en la categoría más apropiada.
- El concepto debe ser breve y descriptivo (máx 50 caracteres).
- Los montos deben ser números decimales (ej: 2.50, no "dos soles con cincuenta").
- Si no puedes interpretar algo, usa concepto "Gasto no especificado" y categoría "Otros".
```

### Configuración PWA

```javascript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@vite-pwa/nuxt'],
  pwa: {
    manifest: {
      name: 'Mis Finanzas',
      short_name: 'Finanzas',
      theme_color: '#1a1a2e',
      display: 'standalone',
      orientation: 'portrait',
    },
    workbox: {
      navigateFallback: '/',
    },
  },
})
```

### Consideraciones de rendimiento y UX

- **Optimistic UI:** Al confirmar un gasto por voz, mostrarlo inmediatamente en la lista antes de que el servidor responda.
- **Offline-first (opcional pero ideal):** Almacenar gastos localmente si no hay conexión y sincronizar cuando vuelva.
- **Haptic feedback:** Usar `navigator.vibrate()` al presionar el botón de micrófono para feedback táctil.
- **Skeleton loaders:** Mostrar skeletons mientras cargan los datos en cada módulo.
- **Toast notifications:** Confirmar acciones con toasts breves y no intrusivos.
- **Accesibilidad:** Labels en todos los inputs, contraste adecuado, tamaños de toque mínimos de 44x44px.

---

## Resumen de Entregables

1. Aplicación Nuxt 3 funcional con los 3 módulos completos.
2. Base de datos PostgreSQL con todas las tablas, relaciones y migraciones.
3. API routes en `/server/api/` para cada operación CRUD de cada módulo.
4. Integración con Web Speech API para reconocimiento de voz.
5. Integración con API de LLM para parsing inteligente de comandos de voz.
6. Interfaz responsiva mobile-first con navegación inferior.
7. Configuración PWA para instalación en móvil.
8. Categorías predefinidas con íconos y colores.
