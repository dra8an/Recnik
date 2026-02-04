# Project Status

**Last Updated:** 2026-02-03

---

## Current Environment

| Component | Status | Details |
|-----------|--------|---------|
| **Live Site** | Deployed | https://recnik.onrender.com/ |
| **App Hosting** | Render (free tier) | 512 MB RAM, 0.1 CPU, auto-sleeps after ~15 min idle |
| **Database** | Neon PostgreSQL (free tier) | 500 MB limit, auto-suspends after 5 min idle |
| **Data** | ~71K words from Matica Srpska | OCR-processed from Rečnik Matice Srpske (2011 PDF) |
| **Local PostgreSQL** | Available | Version 17 via Homebrew, for development |
| **Dev Server** | Available | http://localhost:3000 |

### Quick Start Commands

```bash
# Start PostgreSQL (if not running)
brew services start postgresql@17

# Start dev server
cd /Users/draganbesevic/Projects/claude/recnik
npm run dev

# Open database UI
npx prisma studio
```

---

## Overall Progress

| Phase | Status | Progress |
|-------|--------|----------|
| Phase 1: Data Acquisition | Complete | 100% |
| Phase 2: Database Schema | Complete | 100% |
| Phase 3: Backend Development | Complete | 100% |
| Phase 4: Frontend Development | Complete | 100% |
| Phase 5: Data Import (Matica) | Complete | 100% |
| Phase 6: Deployment | Complete | 100% |
| Phase 7: Inflections Import | Not Started | 0% |
| Phase 8: SEO & Polish | Not Started | 0% |

**Overall: ~80% complete** (core dictionary is live; inflections, SEO, and enhancements remain)

---

## What's Working Now

- Live at https://recnik.onrender.com/
- ~71K words from Matica Srpska with definitions and examples
- Homepage with search bar and alphabet navigation (А-Ш)
- Word detail pages with definitions, examples, cross-references
- Search results page with Cyrillic/Latin transliteration
- Browse by letter
- Dark/light theme toggle
- Word of the day / random word
- All 5 API endpoints operational

---

## Milestone Status

### Milestone 1: Foundation - COMPLETE

| Task | Status |
|------|--------|
| Next.js 16 project setup | Done |
| PostgreSQL + Prisma 7 schema | Done |
| Data source download scripts | Done |
| Parsing scripts (srLex, Wiktionary, Matica) | Done |

### Milestone 2: Data Pipeline - COMPLETE (Matica), PARTIAL (Other Sources)

| Task | Status | Notes |
|------|--------|-------|
| OCR Matica Srpska PDF | Done | Tesseract OCR + error correction |
| Parse Matica entries | Done | `parse-matica-complete.ts` |
| Import Matica to DB | Done | `import-matica-only.ts`, ~71K words |
| Fix cross-references | Done | `fix-cross-references.ts` |
| Parse srLex inflections | Script ready | `parse-srlex.ts` — 192K lemmas, 6.9M inflections parsed |
| Parse Wiktionary definitions | Script ready | `parse-wiktionary.ts` |
| Merge all sources | Script ready | `merge-data.ts` |
| Full combined import | Not run | `import-to-db.ts` |
| Serbian WordNet integration | Not started | Script needed |

### Milestone 3: Core Features - COMPLETE

| Task | Status |
|------|--------|
| Search API with autocomplete | Done |
| Word detail API | Done |
| Random word API | Done |
| Word of day API | Done |
| Inflections API | Done |
| Homepage | Done |
| Word detail page | Done |
| Search results page | Done |
| Browse by letter | Done |
| Cross-reference links | Done |

### Milestone 4: Deployment - COMPLETE

| Task | Status |
|------|--------|
| Git repo on GitHub | Done |
| Neon PostgreSQL setup | Done |
| Data imported to Neon | Done |
| Render web service | Done |
| Site live at recnik.onrender.com | Done |

### Milestone 5: Inflections - NOT STARTED

| Task | Status | Notes |
|------|--------|-------|
| Import srLex inflections to DB | Not started | See `Docs/plan-inflections.md` |
| Declension/conjugation tables on word pages | Component exists | `InflectionTable.tsx` ready, needs data |
| Search by inflected form | Not started | Fallback search on inflections table |

### Milestone 6: Polish & Enhancements - NOT STARTED

| Task | Status |
|------|--------|
| SEO meta tags | Not started |
| JSON-LD structured data | Not started |
| Sitemap generation | Not started |
| Browse by category | Not started |
| TTS audio generation | Not started |

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.1.4 |
| UI | React | 19.2.3 |
| Styling | Tailwind CSS | 4 |
| Language | TypeScript | 5 |
| ORM | Prisma | 7.3.0 |
| Database | PostgreSQL | 17 |
| Hosting | Render | Free tier |
| DB Hosting | Neon | Free tier |

---

## File Inventory

### Documentation (`Docs/` — 13 files)
- `PROJECT_PLAN.md` - Original project plan
- `PROJECT_STATUS.md` - This file
- `NEXT_STEPS.md` - How to continue
- `CHANGELOG.md` - Version history
- `DATABASE_SETUP.md` - PostgreSQL & Prisma guide
- `POSTGRESQL_GUIDE.md` - PostgreSQL reference
- `plan-deployment.md` - Deployment options (Render + Neon vs self-hosted)
- `plan-inflections.md` - Inflection data import plan
- `PARSE_IMPORT_DISPLAY_PLAN.md` - Data pipeline details
- `matica-srpska-implementation-plan.md` - Matica OCR strategy
- `ocr-processing-plan.md` - OCR pipeline
- `ocr-next-steps.md` - OCR follow-up
- `sr-sh-nlp-README.md` - Wiktionary data source info

### Source Code (`src/` — 24 files)

**Pages (6):**
- `app/page.tsx` - Homepage
- `app/rec/[word]/page.tsx` - Word detail
- `app/pretraga/page.tsx` - Search results
- `app/abeceda/[letter]/page.tsx` - Browse by letter
- `app/not-found.tsx` - 404 page
- `app/layout.tsx` - Root layout

**API Routes (5):**
- `api/words/search/route.ts`
- `api/words/[word]/route.ts`
- `api/words/random/route.ts`
- `api/words/word-of-day/route.ts`
- `api/inflections/[word]/route.ts`

**Components (9):**
- `SearchBar.tsx` - Autocomplete search
- `WordCard.tsx` - Word preview card
- `DefinitionList.tsx` - Definition display
- `InflectionTable.tsx` - Conjugation/declension tables
- `CrossRefText.tsx` - Cross-reference links between entries
- `AudioPlayer.tsx` - Pronunciation playback
- `ThemeToggle.tsx` - Dark/light mode
- `Header.tsx` - Site header
- `Footer.tsx` - Site footer

**Libraries (3):**
- `lib/db.ts` - Prisma client with PG adapter
- `lib/transliterate.ts` - Cyrillic/Latin conversion
- `lib/search.ts` - Search utilities

**Types (1):**
- `types/dictionary.ts` - TypeScript definitions

### Scripts (`scripts/` — 16 files)
- `download-sources.ts` - Download srLex and Wiktionary data
- `parse-srlex.ts` - Parse srLex inflections
- `parse-wiktionary.ts` - Parse Wiktionary definitions
- `parse-matica-complete.ts` - Parse OCR'd Matica Srpska entries
- `parse-matica-srpska.ts` - Earlier Matica parser
- `merge-data.ts` - Merge and deduplicate sources
- `import-to-db.ts` - Import merged data to PostgreSQL
- `import-matica-only.ts` - Import Matica Srpska data only
- `import-matica-srpska.ts` - Earlier Matica importer
- `fix-cross-references.ts` - Post-process cross-reference links
- `extract-entries-to-tsv.ts` - Export entries to TSV
- `extract-entries-to-tsv-v2.ts` - Export entries to TSV (v2)
- `extract-matica-columns.sh` - Column extraction for OCR
- `ocr-matica-srpska.sh` - OCR processing
- `ocr-full-400dpi.sh` - Full OCR at 400 DPI
- `seed.ts` - Sample data (10 words) for dev

### Database (`prisma/`)
- `schema.prisma` - 9 models: Word, Definition, Example, Inflection, Pronunciation, Etymology, WordRelation, WordOfDay, Idiom

---

## Database Statistics (Production — Neon)

| Table | Records (approx.) |
|-------|-------------------|
| Words | ~71,000 |
| Definitions | ~71,000+ |
| Examples | ~100,000+ |
| Inflections | 0 (not yet imported) |
| Pronunciations | 0 |
| Etymologies | 0 |
| Word Relations | 0 |
| Idioms | ~2,000+ |

**Database size:** ~115 MB

---

## Known Issues

1. **Tilde (~) replacement in examples** — The import replaces `~` with the base headword form, producing grammatically incorrect text for adjectives and some verbs. See `NEXT_STEPS.md` for options.
2. **Inflections table empty** — srLex data is parsed (6.9M forms) but not imported. Would add 200-400 MB, potentially exceeding Neon's 500 MB free tier.
3. **Cold starts** — Render free tier spins down after ~15 min idle (30-60s restart). Neon adds ~1-2s on top. Mitigated with cron ping.
4. **No audio/pronunciation data** — TTS generation not implemented.
5. **No SEO optimization** — No structured data, sitemap, or OG tags.
