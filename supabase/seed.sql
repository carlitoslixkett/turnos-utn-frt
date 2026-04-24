-- ============================================================
-- Seed de datos de prueba — Turnos UTN FRT
-- ============================================================
-- NOTA: Ejecutar después de crear manualmente un worker en Supabase Auth
-- y de correr las migraciones.
-- Los UUIDs de ejemplo son ficticios.

-- Notes típicas del Departamento de Alumnos UTN FRT
INSERT INTO notes (id, name, description, context, created_by, is_active)
SELECT
  gen_random_uuid(),
  name,
  description,
  context::jsonb,
  (SELECT id FROM profiles WHERE user_type = 'worker' LIMIT 1),
  TRUE
FROM (VALUES
  (
    'Ampliación de Cupo',
    'Solicitud para inscribirse en una comisión que ya está completa.',
    '{"fields": [{"key": "materia", "label": "Materia", "type": "text", "required": true}, {"key": "comision", "label": "Comisión", "type": "text", "required": true}, {"key": "docente", "label": "Docente", "type": "text", "required": false}]}'
  ),
  (
    'Cambio de Comisión',
    'Solicitud para cambiar de comisión dentro de la misma materia.',
    '{"fields": [{"key": "materia", "label": "Materia", "type": "text", "required": true}, {"key": "comision_actual", "label": "Comisión actual", "type": "text", "required": true}, {"key": "comision_destino", "label": "Comisión destino", "type": "text", "required": true}]}'
  ),
  (
    'Inscripción Fuera de Término',
    'Inscripción a materia fuera del período de inscripciones regular.',
    '{"fields": [{"key": "materia", "label": "Materia", "type": "text", "required": true}, {"key": "motivo", "label": "Motivo", "type": "textarea", "required": true}]}'
  ),
  (
    'Equivalencias',
    'Solicitud de equivalencia de materia(s) proveniente de otra institución.',
    '{"fields": [{"key": "materia_origen", "label": "Materia de origen", "type": "text", "required": true}, {"key": "institucion_origen", "label": "Institución de origen", "type": "text", "required": true}, {"key": "materia_destino", "label": "Materia UTN a acreditar", "type": "text", "required": true}]}'
  ),
  (
    'Certificado de Alumno Regular',
    'Solicitud de certificado que acredita la condición de alumno regular.',
    '{"fields": []}'
  ),
  (
    'Recursar Materia',
    'Solicitud para volver a cursar una materia previamente reprobada o abandonada.',
    '{"fields": [{"key": "materia", "label": "Materia", "type": "text", "required": true}]}'
  ),
  (
    'Baja de Materia',
    'Solicitud de baja de una materia en la que el alumno está inscripto.',
    '{"fields": [{"key": "materia", "label": "Materia", "type": "text", "required": true}, {"key": "motivo", "label": "Motivo", "type": "textarea", "required": false}]}'
  )
) AS t(name, description, context)
WHERE EXISTS (SELECT 1 FROM profiles WHERE user_type = 'worker');

-- Noticias de ejemplo
INSERT INTO news (title, description, status, created_by)
SELECT
  title,
  description,
  'posted'::news_status,
  (SELECT id FROM profiles WHERE user_type = 'worker' LIMIT 1)
FROM (VALUES
  (
    'Apertura de turnos — Período 2026',
    'Se habilitaron los turnos para el período académico 2026. Podés sacar turno desde la sección "Sacar Turno" del menú.'
  ),
  (
    'Documentación requerida',
    'Recordá traer DNI y libreta universitaria al momento de tu turno. Sin documentación no se puede atender el trámite.'
  )
) AS t(title, description)
WHERE EXISTS (SELECT 1 FROM profiles WHERE user_type = 'worker');
