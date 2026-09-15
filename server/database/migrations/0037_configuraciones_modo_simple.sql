-- Modo simple de la interfaz (configuraciones.modo_simple).
--
-- Una versión de la app con menos opciones y controles más grandes,
-- pensada para quien no maneja el celular con soltura. Se activa desde
-- Configuraciones y viaja con la cuenta (no con el dispositivo), así que un
-- familiar que entra desde otro teléfono la encuentra igual.
--
-- Aditiva e idempotente.

ALTER TABLE "configuraciones" ADD COLUMN IF NOT EXISTS "modo_simple" boolean NOT NULL DEFAULT false;
