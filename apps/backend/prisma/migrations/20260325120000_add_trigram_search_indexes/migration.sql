-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram indexes for Food search (name + brand)
CREATE INDEX IF NOT EXISTS "Food_name_trgm_idx" ON "Food" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Food_brand_trgm_idx" ON "Food" USING GIN ("brand" gin_trgm_ops);

-- GIN trigram indexes for Exercise search (name + description)
CREATE INDEX IF NOT EXISTS "Exercise_name_trgm_idx" ON "Exercise" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Exercise_description_trgm_idx" ON "Exercise" USING GIN ("description" gin_trgm_ops);
