-- ============================================================
-- Migración: notificaciones in-app
-- ============================================================
-- Sistema mínimo de notificaciones para avisarle al estudiante
-- de cosas importantes (cancelaciones, etc.) sin depender del
-- email transaccional. Cuando configuremos Resend con dominio
-- propio, los emails se mandan EN PARALELO a estas notificaciones.
-- ============================================================

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,        -- 'turn_cancelled_by_closure' | 'turn_cancelled_by_worker' | etc.
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  link        TEXT,                 -- ruta a la que dirige el click (ej: /mis-turnos)
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notifications_user_unread_idx
  ON notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX notifications_user_all_idx
  ON notifications (user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Cada usuario ve sólo sus notificaciones
CREATE POLICY "notifications: users read own"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- Cada usuario marca como leídas sus propias notificaciones
CREATE POLICY "notifications: users update own"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
-- INSERT y DELETE se hacen siempre desde service role; no necesitamos políticas extras.
