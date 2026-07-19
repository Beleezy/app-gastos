# Guía de Seeds — Sistema de Finanzas

Este documento explica cómo ejecutar los scripts de seed para inicializar la base de datos.

## 📋 Scripts disponibles

### 1. `db:seed` — Seed básico (sin datos de prueba)

Limpia la base de datos completamente y crea:

- Categorías predefinidas
- Un usuario por defecto vacío

```bash
npm run db:seed
```

**Uso:** Cuando quieras empezar con una base de datos limpia.

---

### 2. `db:seed:test` — Seed con datos de prueba completos (usuario nuevo)

Limpia la base de datos y genera un conjunto completo de datos de prueba:

- **Usuario nuevo** — `Usuario Prueba`
- **20 gastos planificados** — Para 3 meses (febrero, marzo, abril 2026)
  - Algunos recurrentes (alquiler, servicios, suscripciones)
  - Otros únicos por mes
- **150 gastos registrados** — Distribuidos en los últimos 3 meses
  - Mezcla de gastos por voz y manual
  - Múltiples categorías
- **5 personas que le deben**
  - 4 personas: Diego Martinez, María García, Carlos López, Andrés Pérez
  - 1 organización: Tienda El Ahorro
- **4 personas a las que le debe**
  - 2 organizaciones: Banco de Crédito, Proveedor XYZ
  - 2 personas: Juan Rodríguez, Sofía Ruiz
- **Deudas detalladas**
  - 10-15 conceptos por cada persona
  - Total ~108 deudas (conceptos individuales)
- **15+ pagos de deudas**
  - Pagos totales, parciales y abonos pequeños
  - Estados automáticos (pendiente, parcial, pagado)

```bash
npm run db:seed:test
```

**Uso:** Para probar la aplicación con datos realistas. Se crea un usuario nuevo cada vez.

---

### 3. `db:seed:test:user <USER_ID>` — Seed con datos de prueba para usuario existente

Genera datos de prueba y los asigna a un usuario existente específico.

```bash
npm run db:seed:test:user <USER_ID>
```

**Ejemplo:**

```bash
npm run db:seed:test:user c0e1d8e5-1234-5678-90ab-cdef12345678
```

**Uso:**

1. Después de crear un usuario en la aplicación vía login/signup
2. Copiar su ID de usuario
3. Ejecutar este comando para agregar datos de prueba a su cuenta

---

## 📊 Detalles de los datos generados

### Gastos Planificados (20 conceptos × 3 meses = 60 registros)

#### Recurrentes (7 conceptos):

- Alquiler del mes — S/ 1,500.00 (día 1)
- Recibo de luz — S/ 180.50 (día 5)
- Internet y teléfono — S/ 120.00 (día 10)
- Cuota de gimnasio — S/ 99.00 (día 15)
- Clases de inglés — S/ 250.00 (día 8)
- Netflix — S/ 39.90 (día 12)
- Spotify — S/ 10.99 (día 13)

#### Únicos por mes (6 conceptos):

- Compra en supermercado
- Mantenimiento del auto
- Compra de vitaminas
- Compra de ropa
- Salida al cine
- Compra de materiales educativos

**Estados:** ~40% pagados, ~60% pendientes (aleatorio)

---

### Gastos Registrados (150 gastos)

Distribuidos aleatoriamente en los últimos 90 días con:

- Múltiples conceptos por categoría
- Montos variados por tipo de gasto
- Método: 60% manual, 40% voz
- Hora aleatoria durante el día

**Categorías incluidas:**

- Alimentación (8 variaciones: café, almuerzo, snacks, etc.)
- Transporte (pasajes, uber, estacionamiento)
- Servicios (luz, internet, agua, gas)
- Salud (farmacia, vitaminas, consultas, dentista)
- Entretenimiento (cine, conciertos, bar, videojuegos, streaming)
- Educación (clases, cursos, libros, materiales)
- Vestimenta (ropa, zapatos, accesorios)
- Vivienda (alquiler, mantenimiento, reparación)
- Otros

---

### Deudas — "Me Deben" (5 personas × 10-15 detalles = 50-75 detalles)

**Personas:**

1. **Diego Martinez** — Persona (contacto: +51 999 123456)
2. **María García** — Persona (contacto: maria@email.com)
3. **Carlos López** — Persona (contacto: +51 995 654321)
4. **Andrés Pérez** — Persona (contacto: +51 998 765432)
5. **Tienda El Ahorro** — Organización (contacto: info@ahorro.pe)

**Conceptos de deuda:**

- Almuerzo compartido (S/ 20–300)
- Pasaje pagado
- Dinero para compras
- Café y snacks
- Entrada a evento
- Delivery de comida
- Compra urgente
- Préstamo de emergencia
- Dinero para gasolina
- Reparación pagada
- Compra de accesorios
- Pago de cuenta en restaurante

**Estado:** Todos pendientes (listos para registrar pagos)

---

### Deudas — "Yo Debo" (4 personas × 10-15 detalles = 40-60 detalles)

**Personas:**

1. **Banco de Crédito** — Organización (contacto: credito@banco.pe)
2. **Proveedor Importaciones XYZ** — Organización (contacto: ventas@xyz.com)
3. **Juan Rodríguez** — Persona (contacto: +51 912 345678)
4. **Sofía Ruiz** — Persona (contacto: sofia@email.com)

**Conceptos de deuda:**

- Préstamo personal (S/ 50–500)
- Cuota de crédito
- Compra a plazos
- Servicio pendiente
- Compra de equipos
- Arrendamiento
- Comisión adeudada
- Servicio profesional
- Importación de productos
- Consultoría
- Mantenimiento contratado
- Compra de mercadería
- Servicios de transporte

**Estado:** Todos pendientes (listos para registrar pagos)

---

### Pagos de Deudas (15+ registros con 3 patrones)

Se generan automáticamente pagos para ~15 deudas aleatorias con estos patrones:

**Patrón 1 — Pago Total (33%):**

- Registra un único pago que cubre el 100% de la deuda
- Estado actualizado a `pagado`

**Patrón 2 — Pago Parcial (33%):**

- 2–3 cuotas con montos variados
- Último pago es el residuo para completar
- Estado actualizado a `parcial`

**Patrón 3 — Abonos Pequeños (33%):**

- 3–5 abonos pequeños distribuidos
- Último abono completa la deuda
- Estado actualizado según saldo pendiente

**Métodos de pago (aleatorio):**

- Efectivo
- Transferencia
- Tarjeta

**Fechas:** Distribuidas en los últimos 30 días

---

## 🔄 Workflow típico

### Desarrollo local

```bash
# 1. Crear seed limpio
npm run db:seed

# 2. Luego, agregar datos de prueba
npm run db:seed:test

# 3. Levantar servidor
npm run dev
```

### Probar con usuario específico

```bash
# 1. Login en la app y copiar el ID del usuario (desde DevTools o BD)

# 2. Correr seed con ese usuario
npm run db:seed:test:user <PASTE_USER_ID>

# 3. La app ya tendrá datos para ese usuario
```

---

## ⚙️ Configuración

### Variables de entorno

Asegúrate de que `.env` esté configurado:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/gastos
```

---

## 🚨 Notas importantes

- **No se sincroniza con Supabase Auth:** Los usuarios creados por seed no tienen contraseña y no pueden hacer login. Son solo para pruebas.
- **Datos aleatorios:** Cada ejecución de `db:seed:test` genera datos diferentes (montos, fechas, etc.).
- **Limpieza completa:** Todos estos scripts limpian **TODAS** las tablas. No es una actualización incremental.
- **Transaccional:** Si falla a mitad de camino, la BD queda vacía.

---

## 🛠️ Personalización

Si necesitas datos diferentes, edita `server/database/seed-test-data.js`:

- Línea 50–62: `gastosData` — Conceptos y montos de gastos
- Línea 213–225: `gastosPlaneados` — Gastos del planificador
- Línea 277–288: `datosPersonas` — Nombres de personas que deben
- Línea 300–308: `personasAQuiDeudoData` — Nombres de personas a las que debo

---

## 📝 Ejemplos de uso

```bash
# Limpiar BD completamente
npm run db:seed

# Crear datos de prueba para desarrollo
npm run db:seed:test

# Copiar ID del usuario de la consola (ej: 12abc34d...)

# Agregar más datos a ese usuario
npm run db:seed:test:user 12abc34d-5678-90ab-cdef-1234567890ab

# Ver logs en tiempo real
npm run db:seed:test 2>&1 | tee seed.log
```
