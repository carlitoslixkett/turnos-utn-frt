-- ============================================================
-- Migración: documentos adjuntos a turnos
-- ============================================================
-- El estudiante puede subir imágenes (jpg/png/webp) o PDFs cuando saca
-- un turno. El worker los puede ver al atender, así carga los datos sin
-- pedir el papel físico.
-- ============================================================

-- Bucket privado con límites de tamaño y mime
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'turn-documents',
  'turn-documents',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE turn_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turn_id       UUID NOT NULL REFERENCES turns(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL UNIQUE,
  file_name     TEXT NOT NULL,
  mime_type     TEXT NOT NULL,
  size_bytes    INTEGER NOT NULL CHECK (size_bytes > 0),
  uploaded_by   UUID NOT NULL REFERENCES profiles(id),
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_turn_documents_turn ON turn_documents(turn_id);

ALTER TABLE turn_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "turn_documents: owner can read own"
  ON turn_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM turns
      WHERE turns.id = turn_documents.turn_id AND turns.student_id = auth.uid()
    )
  );

CREATE POLICY "turn_documents: worker can read all"
  ON turn_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'worker'
    )
  );

CREATE POLICY "turn_documents: owner can insert"
  ON turn_documents FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM turns
      WHERE turns.id = turn_documents.turn_id AND turns.student_id = auth.uid()
    )
  );

CREATE POLICY "turn_documents: owner can delete own uploads"
  ON turn_documents FOR DELETE
  USING (uploaded_by = auth.uid());
