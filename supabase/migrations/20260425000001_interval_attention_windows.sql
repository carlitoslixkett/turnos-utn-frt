-- ============================================================
-- Migración: agregar horarios de atención a intervalos
-- ============================================================
-- date_start/date_end ahora son fechas calendario (primer y último día activo).
-- attention_windows define los horarios diarios reales en los que se atienden turnos:
--   [{ "weekday": 1-7, "start_time": "HH:MM", "end_time": "HH:MM" }]
--   weekday: 1=lunes ... 7=domingo (ISO 8601)
-- turn_quantity ahora es columna normal, calculada en la app al crear/modificar.
-- ============================================================

DROP VIEW IF EXISTS v_interval_occupancy;

ALTER TABLE intervals
  DROP COLUMN turn_quantity;

ALTER TABLE intervals
  ADD COLUMN attention_windows JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN turn_quantity INTEGER NOT NULL DEFAULT 0,
  ADD CONSTRAINT attention_windows_is_array CHECK (jsonb_typeof(attention_windows) = 'array'),
  ADD CONSTRAINT turn_quantity_non_negative CHECK (turn_quantity >= 0);

CREATE INDEX idx_intervals_active_dates ON intervals(is_active, date_start, date_end);

-- Recreate the dependent view with the same shape
CREATE OR REPLACE VIEW v_interval_occupancy AS
SELECT
  i.id             AS interval_id,
  i.name           AS interval_name,
  i.turn_quantity  AS capacity,
  COUNT(t.id) FILTER (WHERE t.status != 'cancelled') AS used,
  ROUND(
    COUNT(t.id) FILTER (WHERE t.status != 'cancelled')::NUMERIC /
    NULLIF(i.turn_quantity, 0) * 100,
    2
  ) AS occupancy_pct
FROM intervals i
LEFT JOIN turns t ON t.interval_id = i.id
GROUP BY i.id, i.name, i.turn_quantity;
