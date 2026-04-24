-- ============================================================
-- Row Level Security — Turnos UTN FRT
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervals    ENABLE ROW LEVEL SECURITY;
ALTER TABLE interval_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE turns        ENABLE ROW LEVEL SECURITY;
ALTER TABLE news         ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log    ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helpers
-- ============================================================
CREATE OR REPLACE FUNCTION is_worker()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'worker'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM worker_roles
    WHERE worker_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- profiles
-- ============================================================
-- Cada usuario ve su propio profile
CREATE POLICY "profiles: select own" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Workers ven todos los profiles
CREATE POLICY "profiles: worker select all" ON profiles
  FOR SELECT USING (is_worker());

-- Cada usuario actualiza su propio profile
CREATE POLICY "profiles: update own" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- El trigger handle_new_user inserta vía SECURITY DEFINER, no necesita policy

-- ============================================================
-- worker_roles
-- ============================================================
-- Solo admins ven y gestionan roles
CREATE POLICY "worker_roles: admin select" ON worker_roles
  FOR SELECT USING (is_admin());

CREATE POLICY "worker_roles: admin insert" ON worker_roles
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "worker_roles: admin delete" ON worker_roles
  FOR DELETE USING (is_admin());

-- ============================================================
-- notes
-- ============================================================
-- Lectura: cualquier usuario autenticado
CREATE POLICY "notes: authenticated select" ON notes
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Escritura: solo workers
CREATE POLICY "notes: worker insert" ON notes
  FOR INSERT WITH CHECK (is_worker());

CREATE POLICY "notes: worker update" ON notes
  FOR UPDATE USING (is_worker());

-- No DELETE físico de notes (solo is_active = false)

-- ============================================================
-- intervals
-- ============================================================
CREATE POLICY "intervals: authenticated select" ON intervals
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "intervals: worker insert" ON intervals
  FOR INSERT WITH CHECK (is_worker());

CREATE POLICY "intervals: worker update" ON intervals
  FOR UPDATE USING (is_worker());

-- ============================================================
-- interval_notes
-- ============================================================
CREATE POLICY "interval_notes: authenticated select" ON interval_notes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "interval_notes: worker insert" ON interval_notes
  FOR INSERT WITH CHECK (is_worker());

CREATE POLICY "interval_notes: worker delete" ON interval_notes
  FOR DELETE USING (is_worker());

-- ============================================================
-- turns
-- ============================================================
-- Students: solo ven los propios
CREATE POLICY "turns: student select own" ON turns
  FOR SELECT USING (student_id = auth.uid());

-- Workers: ven todos
CREATE POLICY "turns: worker select all" ON turns
  FOR SELECT USING (is_worker());

-- Students: insertar turnos propios
CREATE POLICY "turns: student insert own" ON turns
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- Students: actualizar solo propios (para cancelar)
CREATE POLICY "turns: student update own" ON turns
  FOR UPDATE USING (student_id = auth.uid());

-- Workers: actualizar cualquier turno (para atender)
CREATE POLICY "turns: worker update all" ON turns
  FOR UPDATE USING (is_worker());

-- ============================================================
-- news
-- ============================================================
-- Lectura: usuarios autenticados ven noticias posted
CREATE POLICY "news: authenticated select posted" ON news
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND status != 'deleted'
  );

-- Workers ven todas (incluyendo pending y deleted)
CREATE POLICY "news: worker select all" ON news
  FOR SELECT USING (is_worker());

CREATE POLICY "news: worker insert" ON news
  FOR INSERT WITH CHECK (is_worker());

CREATE POLICY "news: worker update" ON news
  FOR UPDATE USING (is_worker());

-- No DELETE físico (solo status = 'deleted')

-- ============================================================
-- audit_log (inmutable)
-- ============================================================
-- Solo admins pueden leer
CREATE POLICY "audit_log: admin select" ON audit_log
  FOR SELECT USING (is_admin());

-- Cualquier usuario autenticado puede insertar (via service role en API)
-- Las mutaciones de API usan service role key y bypasean RLS
-- Esta policy es para inserciones directas de funciones SECURITY DEFINER
CREATE POLICY "audit_log: insert only" ON audit_log
  FOR INSERT WITH CHECK (TRUE);

-- CRÍTICO: no UPDATE ni DELETE — enforced por ausencia de policies
