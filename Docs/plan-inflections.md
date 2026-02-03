# Plan: Import srLex Inflection Data

## Goal

Link the existing 6.9M inflected forms from srLex to the ~70K Matica Srpska dictionary entries, enabling declension/conjugation tables on word detail pages.

## Current State

- **srLex parsed data**: `data/processed/srlex-parsed.json` — 192,478 lemmas, 6,905,533 inflections (1.2 GB JSON)
- **Database**: ~70,869 words from Matica Srpska, `inflections` table exists but is empty (0 rows)
- **Schema**: `Inflection` model already defined in Prisma with all grammatical fields (case, number, gender, person, tense, mood, voice, definiteness, degree)
- **Homepage**: "Падежи" feature card replaced with "Изрази и фразе" — restore once inflections are live

## Size Estimate

- srLex has 192K lemmas, DB has ~71K words
- Estimated overlap: ~40-50K lemmas (matching on cyrillic + POS)
- Average ~35 inflections per lemma → ~1.4-1.8M rows in `inflections` table
- Estimated DB size increase: 200-400 MB depending on indexing

## Phase 1: Import Script

**Create**: `scripts/import-inflections.ts`

1. Load all words from DB into lookup map: `(cyrillic, partOfSpeech) → wordId`
2. Stream `srlex-parsed.json` using a JSON streaming parser (file is 1.2 GB, cannot `JSON.parse()` all at once)
3. For each srLex entry, match `(lemmaCyrillic, partOfSpeech)` to a Word record
   - POS values align: both use `imenica`, `pridev`, `glagol`, `prilog`, etc.
   - For homonyms (same cyrillic + same POS), assign inflections to all matching Word records
4. Batch insert inflections (1000 per batch) with all grammatical fields
5. Report: total matched lemmas, total inflections inserted, unmatched lemmas count

### Matching Edge Cases

- **Reflexive verbs**: srLex may have "радовати се" as a separate lemma vs. Matica having "радовати" with a `~ се` section
- **Adjective forms**: srLex lemma is masculine indefinite form; Matica headword should match
- **Proper nouns**: srLex contains many proper nouns not in Matica — skip these (no match)

## Phase 2: Word Detail Page — Declension/Conjugation Tables

**Modify**: `src/app/rec/[word]/page.tsx`

Add a "Падежи" / "Облици" section after definitions that displays:

### For Nouns (именице)
A table with rows = cases (номинатив, генитив, датив, акузатив, вокатив, инструментал, локатив) and columns = number (једнина, множина).

### For Adjectives (придеви)
A table with rows = cases, columns = gender × number (м.јд., ж.јд., с.јд., м.мн., ж.мн., с.мн.). Optionally show comparative/superlative forms if present.

### For Verbs (глаголи)
Tables for: презент (by person/number), аорист, имперфекат, императив, радни глаголски придев, трпни глаголски придев.

### Component

**Create**: `src/components/InflectionTable.tsx`

- Takes `inflections: Inflection[]` and `partOfSpeech: string`
- Renders appropriate table layout based on POS
- Groups inflections by grammatical categories
- Serbian labels for all grammatical terms

## Phase 3: Search Enhancement (Optional)

Use inflection data to improve search — when a user searches for an inflected form (e.g., "књигама"), find the lemma ("књига") and redirect/suggest it. This requires:

- Index on `formCyrillic` and `formLatin` columns (already in schema)
- Fallback search: if exact word match fails, search `inflections.formCyrillic`

## Phase 4: Homepage Update

- Restore "Падежи" feature card on homepage (replace current "Изрази и фразе" or add a 5th card)

## Dependencies

- `npm install --save-dev stream-json` (or similar) for streaming the 1.2 GB JSON file
- PostgreSQL storage capacity for ~1.5M+ rows

## Deferred

This work is deferred until after initial deployment to keep the database small. The inflections data adds an estimated 200-400 MB to the database.
