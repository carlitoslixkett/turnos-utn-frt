-- ============================================================
-- Migración: garantizar unicidad de slot por intervalo
-- ============================================================
-- Evita que dos turnos activos (pending/attended) ocupen el mismo
-- (interval_id, date). Los cancelados/perdidos quedan fuera del
-- índice para permitir que el slot se libere si se cancela.
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS uniq_turns_interval_date_active
  ON turns (interval_id, date)
  WHERE status IN ('pending', 'attended');
