-- ============================================================
-- Migración: cierres de oficina (paros, feriados, eventos)
-- ============================================================
-- Permite al worker bloquear días específicos (o franjas horarias
-- dentro de un día) sin tener que tocar la configuración global de
-- horarios de atención.
--
-- También se agrega una columna `cancel_reason` a `turns` para que
-- toda cancelación manual quede registrada y se le pueda comunicar
-- al estudiante el motivo.
-- ============================================================

CREATE TABLE office_closures (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date_start  DATE NOT NULL,
  date_end    DATE NOT NULL,
  all_day     BOOLEAN NOT NULL DEFAULT TRUE,
  start_time  TIME,
  end_time    TIME,
  reason      TEXT NOT NULL,
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT closures_range_valid     CHECK (date_end >= date_start),
  CONSTRAINT closures_reason_nonempty CHECK (length(btrim(reason)) > 0),
  CONSTRAINT closures_partial_times   CHECK (
    all_day
    OR (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
  )
);

CREATE INDEX office_closures_date_range_idx ON office_closures (date_start, date_end);

ALTER TABLE office_closures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "office_closures: read for everyone authenticated"
  ON office_closures FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "office_closures: only workers can insert"
  ON office_closures FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'worker'
    )
  );

CREATE POLICY "office_closures: only workers can update"
  ON office_closures FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'worker'
    )
  );

CREATE POLICY "office_closures: only workers can delete"
  ON office_closures FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'worker'
    )
  );

-- Motivo de cancelación (lo completa el worker al cancelar manualmente
-- o el sistema cuando crea un cierre que pisa turnos pendientes).
ALTER TABLE turns
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
