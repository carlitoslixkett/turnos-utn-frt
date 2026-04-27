-- ============================================================
-- Migración: sincronizar intervals.turn_duration_minutes con office_settings
-- ============================================================
-- Después de mover la duración a settings global, los intervalos creados
-- antes mantienen su valor anterior. Forzamos que todos coincidan con la
-- configuración global para evitar inconsistencias visuales.
-- ============================================================

UPDATE intervals
   SET turn_duration_minutes = (SELECT turn_duration_minutes FROM office_settings WHERE id = 1);

-- turn_quantity puede quedar desactualizado pero la app lo recalcula al
-- modificar el intervalo o los settings.
