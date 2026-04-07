-- 1. Add the subject column to the previously defined table
ALTER TABLE reference_materials ADD COLUMN IF NOT EXISTS subject text DEFAULT 'Polity';

-- 2. Update the RPC to only match embeddings for the specific subject AI Agent
CREATE OR REPLACE FUNCTION match_xray_subject_references (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_subject text
)
RETURNS TABLE (
  id uuid,
  sentence_text text,
  deep_dive text,
  current_affairs text,
  prelims_practice text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    reference_materials.id,
    reference_materials.sentence_text,
    reference_materials.deep_dive,
    reference_materials.current_affairs,
    reference_materials.prelims_practice,
    1 - (reference_materials.embedding <=> query_embedding) as similarity
  FROM reference_materials
  WHERE 
    (1 - (reference_materials.embedding <=> query_embedding) > match_threshold)
    AND (reference_materials.subject = p_subject)
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
