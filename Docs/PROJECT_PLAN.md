# Serbian Dictionary Website - Project Plan

## Project Overview

Build a comprehensive Serbian language dictionary website (Rečnik) similar to Merriam-Webster and Oxford, featuring definitions, etymology, pronunciation, examples, synonyms/antonyms, and word inflections.

**Tech Stack:** Next.js 14+ (App Router) + PostgreSQL + Prisma ORM

---

## Phase 1: Data Acquisition & Processing

### 1.1 Primary Data Sources (Legal, Open)

| Source | Content | Size | License |
|--------|---------|------|---------|
| **srLex** (CLARIN.SI) | Inflectional lexicon | 192,590 lemmas, 6.9M word forms | Open |
| **putnich/sr-sh-nlp** (GitHub) | Wiktionary definitions, synonyms, syllables, pronunciation | ~50K entries | CC-BY-SA |
| **Serbian WordNet (SrpWN)** | Semantic relations, synsets | ~20K synsets | Open |
| **MaCoCu-sr corpus** | Usage examples extraction | 2.5B words | CC-BY |
| **Serbian Wiktionary API** | Additional definitions | ~15K entries | CC-BY-SA |

### 1.2 Data Processing Pipeline

```
1. Download srLex → Extract lemmas, POS tags, inflections
2. Download putnich/sr-sh-nlp → Parse TEI XML → Extract definitions, synonyms, pronunciation
3. Query Serbian Wiktionary API → Supplement missing definitions
4. Process MaCoCu corpus → Extract example sentences for top 50K words
5. Integrate SrpWN → Add semantic relations (hypernyms, hyponyms)
6. Deduplicate & normalize → Merge into unified schema
```

### 1.3 Estimated Word Coverage

- **Lemmas with definitions:** ~80,000-100,000
- **Total word forms (inflections):** ~6,900,000
- **Words with pronunciation:** ~50,000
- **Words with examples:** ~50,000 (initial)

---

## Phase 2: Database Schema Design

### Core Tables

```sql
-- Main word entries (lemmas)
words (
  id, word, cyrillic, latin, part_of_speech,
  frequency_rank, is_common, created_at, updated_at
)

-- Definitions for each word
definitions (
  id, word_id, definition_text, definition_number,
  register, domain, source
)

-- Usage examples
examples (
  id, definition_id, example_text, source, translation
)

-- Inflected forms
inflections (
  id, word_id, form, grammatical_info,
  case, number, gender, tense, person
)

-- Pronunciation data
pronunciations (
  id, word_id, ipa, audio_url, syllables, stress_position
)

-- Etymology
etymologies (
  id, word_id, origin_language, etymology_text, cognates
)

-- Synonyms/Antonyms relations
word_relations (
  id, word_id, related_word_id, relation_type
)
```

---

## Phase 3: Backend Development

### 3.1 Next.js API Routes

```
/api/words/[word]          - Get word details
/api/words/search          - Search with autocomplete
/api/words/random          - Random word feature
/api/words/word-of-day     - Daily featured word
/api/inflections/[word]    - Get all word forms
```

### 3.2 Key Features

- **Full-text search** with PostgreSQL `pg_trgm` for fuzzy matching
- **Cyrillic ↔ Latin** automatic transliteration
- **Autocomplete** with prefix search
- **SEO optimization** via Next.js SSG/ISR for all word pages

---

## Phase 4: Frontend Development

### 4.1 Pages Structure

```
/                          - Homepage with search, word of day
/rec/[word]               - Word detail page (SEO-friendly)
/pretraga?q=              - Search results page
/abeceda/[letter]         - Browse by letter (A-Ž)
/kategorija/[category]    - Browse by category/domain
```

### 4.2 Word Page Components

```
WordHeader          - Word, pronunciation audio, IPA, syllables
PartOfSpeech        - Noun, verb, adjective tabs
DefinitionList      - Numbered definitions with examples
InflectionTable     - Full conjugation/declension tables
SynonymSection      - Related words, synonyms, antonyms
EtymologySection    - Word origin and history
RelatedWords        - Derived words, compounds
```

### 4.3 UI/UX Features

- Dark/light mode toggle
- Responsive design (mobile-first)
- Audio pronunciation playback
- Copy word/definition buttons
- Shareable word links
- Keyboard shortcuts (/, Esc)

---

## Phase 5: Data Import Scripts

### Scripts to Create

```
scripts/
├── download-sources.ts      # Download all data sources
├── parse-srlex.ts           # Parse srLex inflections
├── parse-wiktionary.ts      # Parse putnich/sr-sh-nlp data
├── extract-examples.ts      # Extract examples from corpus
├── integrate-wordnet.ts     # Import SrpWN relations
├── merge-data.ts            # Dedupe & merge all sources
├── import-to-db.ts          # Final PostgreSQL import
└── generate-audio.ts        # TTS for missing pronunciations
```

---

## Phase 6: Deployment & Infrastructure

### Recommended Setup

- **Hosting:** Vercel (Next.js) + Supabase/Neon (PostgreSQL)
- **CDN:** Vercel Edge for static assets
- **Audio Storage:** Cloudflare R2 or AWS S3
- **Search:** PostgreSQL full-text (upgrade to Elasticsearch if needed)

---

## Implementation Order

### Milestone 1: Foundation
1. Set up Next.js project with TypeScript, Tailwind CSS
2. Design and create PostgreSQL schema with Prisma
3. Download srLex and putnich/sr-sh-nlp datasets
4. Create parsing scripts for core data

### Milestone 2: Data Pipeline
5. Parse and import srLex inflections
6. Parse and import Wiktionary definitions
7. Integrate Serbian WordNet relations
8. Create data merge/deduplication logic

### Milestone 3: Core Features
9. Build search API with autocomplete
10. Create word detail API endpoint
11. Build homepage with search
12. Build word detail page with all sections

### Milestone 4: Content Enhancement
13. Extract example sentences from MaCoCu corpus
14. Generate pronunciation audio (TTS)
15. Build inflection tables component
16. Add etymology section

### Milestone 5: Polish & Launch
17. SEO optimization (meta tags, structured data, sitemap)
18. Performance optimization (caching, ISR)
19. Mobile responsiveness
20. Analytics integration
21. Deploy to production

---

## File Structure

```
recnik/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Homepage
│   │   ├── rec/[word]/page.tsx      # Word detail
│   │   ├── pretraga/page.tsx        # Search results
│   │   └── api/
│   │       └── words/
│   ├── components/
│   │   ├── SearchBar.tsx
│   │   ├── WordCard.tsx
│   │   ├── DefinitionList.tsx
│   │   ├── InflectionTable.tsx
│   │   └── AudioPlayer.tsx
│   ├── lib/
│   │   ├── db.ts                    # Prisma client
│   │   ├── transliterate.ts         # Cyrillic ↔ Latin
│   │   └── search.ts                # Search utilities
│   └── types/
│       └── dictionary.ts
├── scripts/
│   ├── download-sources.ts
│   ├── parse-srlex.ts
│   └── import-to-db.ts
└── data/
    └── raw/                          # Downloaded datasets
```

---

## Verification & Testing

1. **Data Quality:** Sample 100 random words, verify definitions match source
2. **Search:** Test autocomplete with common words, typos, Latin/Cyrillic
3. **Inflections:** Verify conjugation tables for 10 verbs, 10 nouns
4. **Performance:** Lighthouse score >90, TTFB <200ms
5. **SEO:** Validate structured data with Google Rich Results Test
6. **Mobile:** Test on iOS Safari, Android Chrome

---

## Data Source Links

- srLex: https://www.clarin.si/repository/xmlui/handle/11356/1233
- putnich/sr-sh-nlp: https://github.com/putnich/sr-sh-nlp
- Serbian WordNet: https://metashare.elda.org/ (search SrpWN)
- MaCoCu-sr: https://macocu.eu/
- Serbian Wiktionary: https://sr.wiktionary.org/w/api.php

---

## Notes

- All data sources are legally usable (open licenses)
- Cyrillic/Latin support is essential for Serbian users
- Priority: definitions > inflections > examples > etymology
- Start with most common 50K words, expand coverage over time
