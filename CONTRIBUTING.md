# Contribuciones

## Convenciones de commits (Conventional Commits)

```
<tipo>(ámbito): descripción breve
```

Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`

Ejemplos:

- `feat(turns): agregar cancelación con código de seguridad`
- `fix(auth): corregir validación de dominio institucional`
- `chore(deps): actualizar supabase-js a 2.x`

## Branches

- `main` — producción (protegida, solo merge vía PR)
- `develop` — integración
- Features: `feat/<nombre>` ej: `feat/sacar-turno`
- Fixes: `fix/<nombre>`

## Pull Requests

- Un PR por feature / fase grande
- Describir qué se hizo y cómo probarlo
- CI debe estar verde antes de merge
- Revisión requerida por al menos 1 persona

## Idioma

- Código y variables: **inglés**
- Mensajes de UI, comentarios de decisión: **español (voseo argentino)**
- Commits: español o inglés, consistente por PR
