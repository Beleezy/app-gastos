-- ============================================================
-- Ejecutar en el SQL Editor del dashboard de Supabase.
-- Requiere haber aplicado antes la migración 0027/0028 (tabla
-- intenciones_registro).
-- ============================================================

-- Modelo de acceso (control por superadmin):
-- Cuando alguien inicia sesión con Google por primera vez NO se le crea un
-- usuario con acceso. Se registra una "intención de registro" (pendiente) que
-- el superadministrador aprueba o rechaza desde la app. Al aprobar, la app
-- crea la fila correspondiente en public.usuarios.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.intenciones_registro (supabase_user_id, email, nombre, estado, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'pendiente',
    NOW(), NOW()
  )
  ON CONFLICT (supabase_user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- Nota: el superadmin (SUPERADMIN_EMAIL) se aprueba solo al iniciar sesión;
-- la app marca su intención como aprobada automáticamente.
-- ============================================================
