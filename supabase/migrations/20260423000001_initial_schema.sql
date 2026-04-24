-- ============================================================
-- Turnos UTN FRT — Migración inicial
-- ============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Enums
-- ============================================================
CREATE TYPE user_type AS ENUM ('student', 'worker');
CREATE TYPE worker_role AS ENUM ('admin');
CREATE TYPE turn_status AS ENUM ('pending', 'attended', 'lost', 'cancelled');
CREATE TYPE news_status AS ENUM ('posted', 'pending', 'deleted');

-- ============================================================
-- Función para updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- profiles (extiende auth.users)
-- ============================================================
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  dni         TEXT NOT NULL,
  legajo      TEXT,
  user_type   user_type NOT NULL DEFAULT 'student',
  phone       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- worker_roles
-- ============================================================
CREATE TABLE worker_roles (
  worker_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        worker_role NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (worker_id, role)
);

-- ============================================================
-- notes
-- ============================================================
CREATE TABLE notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  context     JSONB,
  created_by  UUID NOT NULL REFERENCES profiles(id),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- intervals
-- ============================================================
CREATE TABLE intervals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  description           TEXT,
  date_start            TIMESTAMPTZ NOT NULL,
  date_end              TIMESTAMPTZ NOT NULL,
  turn_duration_minutes INTEGER NOT NULL DEFAULT 15,
  turn_quantity         INTEGER NOT NULL GENERATED ALWAYS AS (
    FLOOR(EXTRACT(EPOCH FROM (date_end - date_start)) / 60 / turn_duration_minutes)::INTEGER
  ) STORED,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  explain_desactivate   TEXT,
  created_by            UUID NOT NULL REFERENCES profiles(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT date_order CHECK (date_end > date_start),
  CONSTRAINT positive_duration CHECK (turn_duration_minutes > 0)
);

CREATE TRIGGER intervals_updated_at
  BEFORE UPDATE ON intervals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- interval_notes (many-to-many)
-- ============================================================
CREATE TABLE interval_notes (
  interval_id UUID NOT NULL REFERENCES intervals(id) ON DELETE CASCADE,
  note_id     UUID NOT NULL REFERENCES notes(id),
  PRIMARY KEY (interval_id, note_id)
);

-- ============================================================
-- turns
-- ============================================================
CREATE TABLE turns (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id           UUID NOT NULL REFERENCES profiles(id),
  interval_id          UUID NOT NULL REFERENCES intervals(id),
  note_id              UUID NOT NULL REFERENCES notes(id),
  date                 TIMESTAMPTZ NOT NULL,
  status               turn_status NOT NULL DEFAULT 'pending',
  security_code_hash   TEXT NOT NULL,
  attended_at          TIMESTAMPTZ,
  cancel_attempts      INTEGER NOT NULL DEFAULT 0,
  cancel_blocked_until TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER turns_updated_at
  BEFORE UPDATE ON turns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Índices de rendimiento
CREATE INDEX idx_turns_student_status ON turns(student_id, status);
CREATE INDEX idx_turns_interval_date ON turns(interval_id, date);
CREATE INDEX idx_turns_pending_date ON turns(date) WHERE status = 'pending';

-- ============================================================
-- news
-- ============================================================
CREATE TABLE news (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  description  TEXT NOT NULL,
  status       news_status NOT NULL DEFAULT 'posted',
  scheduled_at TIMESTAMPTZ,
  created_by   UUID NOT NULL REFERENCES profiles(id),
  deleted_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER news_updated_at
  BEFORE UPDATE ON news
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_news_status_scheduled ON news(status, scheduled_at);

-- ============================================================
-- audit_log (inmutable)
-- ============================================================
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  payload     JSONB,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_id, created_at);

-- ============================================================
-- Función: auto-crear profile al registrarse
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, dni, user_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'dni', ''),
    COALESCE((NEW.raw_user_meta_data->>'user_type')::public.user_type, 'student')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
