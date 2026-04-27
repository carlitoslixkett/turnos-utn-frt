-- ============================================================
-- Migración: la duración de turno también es global (una oficina, una cadencia)
-- ============================================================

ALTER TABLE office_settings
  ADD COLUMN turn_duration_minutes INTEGER NOT NULL DEFAULT 15
    CHECK (turn_duration_minutes BETWEEN 5 AND 120);

-- intervals.turn_duration_minutes queda en la tabla por compatibilidad pero no se usa.
ALTER TABLE intervals
  ALTER COLUMN turn_duration_minutes SET DEFAULT 15;
