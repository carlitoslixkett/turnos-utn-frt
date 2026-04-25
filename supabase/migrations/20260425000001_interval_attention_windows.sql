-- ============================================================
-- Migración: agregar horarios de atención a intervalos
-- ============================================================
-- date_start/date_end ahora son fechas calendario (primer y último día activo).
-- attention_windows define los horarios diarios reales en los que se atienden turnos:
--   [{ "weekday": 1-7, "start_time": "HH:MM", "end_time": "HH:MM" }]
--   weekday: 1=lunes ... 7=domingo (ISO 8601)
-- turn_quantity ahora es columna normal, calculada en la app al crear/modificar.
-- ============================================================

ALTER TABLE intervals
  DROP COLUMN turn_quantity;

ALTER TABLE intervals
  ADD COLUMN attention_windows JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN turn_quantity INTEGER NOT NULL DEFAULT 0,
  ADD CONSTRAINT attention_windows_is_array CHECK (jsonb_typeof(attention_windows) = 'array'),
  ADD CONSTRAINT turn_quantity_non_negative CHECK (turn_quantity >= 0);

CREATE INDEX idx_intervals_active_dates ON intervals(is_active, date_start, date_end);
