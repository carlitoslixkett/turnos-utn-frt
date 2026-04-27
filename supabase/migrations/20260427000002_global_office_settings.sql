-- ============================================================
-- Migración: horarios de atención globales + slot uniqueness global
-- ============================================================
-- Los horarios de atención dejan de estar por intervalo y pasan a
-- ser una configuración única (una sola persona atiende, así que no
-- tiene sentido que sean distintos por trámite).
--
-- Además, el índice único de turnos pasa de (interval_id, date) a (date)
-- porque el mismo horario no puede ser ocupado por dos turnos en paralelo
-- aunque pertenezcan a intervalos diferentes.
-- ============================================================

CREATE TABLE office_settings (
  id                  INT PRIMARY KEY DEFAULT 1,
  attention_windows   JSONB NOT NULL DEFAULT '[]'::jsonb,
  timezone            TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by          UUID REFERENCES profiles(id),
  CONSTRAINT only_one_settings_row CHECK (id = 1),
  CONSTRAINT attention_windows_is_array CHECK (jsonb_typeof(attention_windows) = 'array')
);

INSERT INTO office_settings (id, attention_windows) VALUES (1, '[]'::jsonb);

ALTER TABLE office_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "office_settings: read for everyone authenticated"
  ON office_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "office_settings: only workers can update"
  ON office_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'worker'
    )
  );

-- Slot uniqueness: globally unique active turn per (date)
DROP INDEX IF EXISTS uniq_turns_interval_date_active;
CREATE UNIQUE INDEX uniq_turns_date_active
  ON turns (date)
  WHERE status IN ('pending', 'attended');

-- attention_windows ya no se usa por intervalo. Lo dejamos en la tabla
-- por compatibilidad con datos existentes, pero la app lee desde office_settings.
ALTER TABLE intervals
  ALTER COLUMN attention_windows SET DEFAULT '[]'::jsonb;
