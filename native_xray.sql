-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create the Reference Materials core matrix table
create table if not exists reference_materials (
  id uuid primary key default gen_random_uuid(),
  sentence_text text not null,
  deep_dive text not null,
  current_affairs text default 'No current affairs context mapped for this exact sentence.',
  prelims_practice text default 'No specific prelims static question generated for this string.',
  embedding vector(768) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Establish an absolute HNSW index for high speed production cosine similarity vector searches
create index on reference_materials using hnsw (embedding vector_cosine_ops);

-- Create a specialized Hybrid RPC function mapping exact sentence similarities using absolute Cosine metrics.
create or replace function match_xray_references (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  sentence_text text,
  deep_dive text,
  current_affairs text,
  prelims_practice text,
  similarity float
)
language sql stable
as $$
  select
    reference_materials.id,
    reference_materials.sentence_text,
    reference_materials.deep_dive,
    reference_materials.current_affairs,
    reference_materials.prelims_practice,
    1 - (reference_materials.embedding <=> query_embedding) as similarity
  from reference_materials
  where 1 - (reference_materials.embedding <=> query_embedding) > match_threshold
  order by reference_materials.embedding <=> query_embedding
  limit match_count;
$$;
