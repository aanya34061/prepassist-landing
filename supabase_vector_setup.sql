-- 1. Enable the pgvector extension to dynamically process math arrays natively.
create extension if not exists vector;

-- 2. Create the unified Knowledge Vault table.
create table if not exists knowledge_base (
  id bigserial primary key,
  content text not null,        
  metadata jsonb,               
  embedding vector(1536)        -- OpenAI text-embedding-3-small mathematically requires exactly 1536 float dimensions.
);

-- 3. Establish an HNSW/IVFFlat optimized index massively speeding up Similarity Matches on massive arrays.
create index on knowledge_base using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- 4. Create the Custom RPC function for Next.js to directly query Semantics.
create or replace function match_knowledge (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    knowledge_base.id,
    knowledge_base.content,
    knowledge_base.metadata,
    1 - (knowledge_base.embedding <=> query_embedding) as similarity
  from knowledge_base
  where 1 - (knowledge_base.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
