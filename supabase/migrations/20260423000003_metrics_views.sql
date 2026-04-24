-- ============================================================
-- Vistas de métricas — Turnos UTN FRT
-- ============================================================

-- Turnos por nota y estado
CREATE OR REPLACE VIEW v_turns_by_note AS
SELECT
  n.id          AS note_id,
  n.name        AS note_name,
  t.status,
  COUNT(*)      AS total,
  DATE_TRUNC('month', t.created_at) AS month
FROM turns t
JOIN notes n ON t.note_id = n.id
GROUP BY n.id, n.name, t.status, DATE_TRUNC('month', t.created_at);

-- Tasa de ausentismo por nota
CREATE OR REPLACE VIEW v_absenteeism_rate AS
SELECT
  n.id        AS note_id,
  n.name      AS note_name,
  COUNT(*) FILTER (WHERE t.status = 'attended') AS attended,
  COUNT(*) FILTER (WHERE t.status = 'lost')     AS lost,
  COUNT(*) FILTER (WHERE t.status IN ('attended', 'lost')) AS total_resolved,
  CASE
    WHEN COUNT(*) FILTER (WHERE t.status IN ('attended', 'lost')) = 0 THEN 0
    ELSE ROUND(
      COUNT(*) FILTER (WHERE t.status = 'lost')::NUMERIC /
      COUNT(*) FILTER (WHERE t.status IN ('attended', 'lost')) * 100,
      2
    )
  END AS absenteeism_pct
FROM turns t
JOIN notes n ON t.note_id = n.id
GROUP BY n.id, n.name;

-- Demanda por franja horaria (heatmap día x hora)
CREATE OR REPLACE VIEW v_demand_heatmap AS
SELECT
  EXTRACT(DOW  FROM date)  AS day_of_week,
  EXTRACT(HOUR FROM date)  AS hour_of_day,
  note_id,
  COUNT(*)                  AS turn_count
FROM turns
GROUP BY EXTRACT(DOW FROM date), EXTRACT(HOUR FROM date), note_id;

-- Tiempo de atención (retraso respecto al horario)
CREATE OR REPLACE VIEW v_attention_delay AS
SELECT
  t.id,
  t.note_id,
  n.name AS note_name,
  t.date,
  t.attended_at,
  EXTRACT(EPOCH FROM (t.attended_at - t.date)) / 60 AS delay_minutes
FROM turns t
JOIN notes n ON t.note_id = n.id
WHERE t.status = 'attended' AND t.attended_at IS NOT NULL;

-- Ocupación de cupo por intervalo
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
