-- ============================================================
-- Ejecutar UNA VEZ en el SQL Editor del dashboard de Supabase
-- Authentication > SQL Editor
-- ============================================================

-- 1. Trigger: sincroniza auth.users → public.usuarios automáticamente
--    Se dispara cada vez que alguien hace login con Google por primera vez.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.usuarios (id, nombre, email, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- 2. (Opcional) Vincular datos existentes al primer login con Google
--    Ejecutar DESPUÉS del primer login exitoso, reemplazando el UUID.
-- ============================================================

-- UPDATE public.usuarios
-- SET id = '<UUID-del-auth-user-de-Google>'
-- WHERE email = 'tu-email@gmail.com';
