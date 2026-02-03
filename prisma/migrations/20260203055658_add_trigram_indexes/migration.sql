-- Enable pg_trgm extension for trigram-based fuzzy/substring search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram indexes for fast LIKE '%query%' on 85K+ words
CREATE INDEX idx_words_cyrillic_trgm ON words USING GIN (cyrillic gin_trgm_ops);
CREATE INDEX idx_words_latin_trgm ON words USING GIN (latin gin_trgm_ops);
