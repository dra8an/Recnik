# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Planned
- Serbian WordNet integration
- MaCoCu corpus example extraction
- TTS audio generation
- Category browsing page
- SEO structured data (JSON-LD)
- Sitemap generation
- Production deployment

---

## [0.1.0] - 2025-01-21

### Added

**Project Setup**
- Next.js 14+ project with App Router
- TypeScript configuration
- Tailwind CSS styling
- Prisma ORM with PostgreSQL adapter

**Database Schema**
- `words` table - Main word entries (lemmas)
- `definitions` table - Word definitions
- `examples` table - Usage examples
- `inflections` table - Word forms (conjugation/declension)
- `pronunciations` table - IPA, audio, syllables
- `etymologies` table - Word origins
- `word_relations` table - Synonyms/antonyms
- `word_of_day` table - Featured words

**API Routes**
- `GET /api/words/search` - Search with autocomplete
- `GET /api/words/[word]` - Word details
- `GET /api/words/random` - Random word
- `GET /api/words/word-of-day` - Daily featured word
- `GET /api/inflections/[word]` - Word inflections

**Pages**
- Homepage with search bar and alphabet navigation
- Word detail page (`/rec/[word]`) with:
  - Definitions with examples
  - Inflection tables
  - Etymology section
  - Synonyms/antonyms
  - Related words
- Search results page (`/pretraga`)
- Browse by letter page (`/abeceda/[letter]`)
- Custom 404 page

**Components**
- `SearchBar` - Autocomplete search with keyboard shortcuts (/, Esc)
- `WordCard` - Word preview with part of speech
- `DefinitionList` - Numbered definitions with examples
- `InflectionTable` - Noun declension and verb conjugation tables
- `AudioPlayer` - Pronunciation playback with IPA display
- `ThemeToggle` - Dark/light/system theme switcher
- `Header` - Site navigation
- `Footer` - Site footer

**Libraries**
- `db.ts` - Prisma client with PostgreSQL adapter (Prisma 7.x)
- `transliterate.ts` - Cyrillic to Latin conversion and vice versa
- `search.ts` - Search utilities (autocomplete, word lookup, browse by letter)

**Data Scripts**
- `download-sources.ts` - Download srLex and putnich/sr-sh-nlp
- `parse-srlex.ts` - Parse srLex inflection data
- `parse-wiktionary.ts` - Parse Wiktionary definitions from TEI XML/JSON
- `merge-data.ts` - Merge and deduplicate data sources
- `import-to-db.ts` - Import merged data to PostgreSQL
- `seed.ts` - Sample Serbian words for testing

**Features**
- Full Cyrillic/Latin transliteration support
- Serbian alphabet navigation (А-Ш)
- Dark/light/system theme support
- Responsive design
- Keyboard shortcuts for search

### Technical Notes
- Using Prisma 7.x with `@prisma/adapter-pg` (breaking change from 6.x)
- Theme toggle uses `useSyncExternalStore` for proper React 18 compatibility

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 0.1.0 | 2025-01-21 | Initial implementation |
