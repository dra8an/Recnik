# Serbian Dictionary: Parse, Import & Display ~85K Entries

## Overview

Populate the existing Next.js Serbian dictionary website with all ~85,000 entries from the OCR-corrected Matica Srpska dictionary file. This requires: (1) a new comprehensive parser, (2) minor database schema additions, (3) a batch import script, and (4) targeted web app updates.

**Source**: `data/raw/matica-srpska/recnik-corrected.txt` (146,844 lines, pages 16-1528)
**Date**: 2026-02-02

---

## Phase 1: Comprehensive Parser

**Create**: `scripts/parse-matica-complete.ts`

### Two-Pass Architecture

**Pass 1 - Line Normalization**: Read `data/raw/matica-srpska/recnik-corrected.txt`, strip `--- PAGE NNN ---` markers and ALL-CAPS running headers (e.g., `КЛАДИЦА – КЛАСИЋ`), rejoin entries split across page boundaries. Output: array of clean single-line entry strings.

**Pass 2 - Entry Parsing**: Parse each normalized line into structured data.

### Entry Detection (the critical fix)

The existing parser (`parse-matica-srpska.ts`) misses ~25K adjectives because it only checks for explicit POS tokens (`м`, `ж`, `свр.`, etc.) and has no pattern for adjectives. The new parser must detect entries by:

1. **Explicit POS tokens**: `м`, `ж`, `с`, `свр.`, `несвр.`, `прил.`, `узв.`, `везн.`, `предл.`, `речца`, `преф.`, `бр.`, `зам.`, `оном.`
2. **Adjective suffix pattern**: `, -а, -о` or `, -feminine_suffix, -о` (e.g., `абнормалан, -лна, -о`)
3. **Verb conjugation pattern**: `, -suffix` followed by aspect marker (e.g., `абдицирати, -ицирам свр.`)
4. **Cross-reference-only entries**: contains `в.` (see) pattern
5. **Prefix entries**: headword ending in `-` with `преф.`

### Data Extracted Per Entry

- **Headword**: clean form, homonym number (from superscripts `¹²³`), alternative forms (`и` pattern), parenthetical variants
- **Part of Speech**: imenica, glagol, pridev, prilog, uzvik, veznik, predlog, cestica, prefiks, broj, zamenica
- **Gender**: muski, zenski, srednji (for nouns)
- **Aspect**: svrseni, nesvrseni, dvovidski (for verbs)
- **Etymology**: language code (грч., лат., фр., нем., тур., итал., енгл., мађ., рус., хебр., etc.)
- **Definitions**: split by numbered (`1.`, `2.`, `3.`) and sub-lettered (`а.`, `б.`, `в.`) markers
  - Per-definition domain: бот., зоол., мед., астр., лингв., правн., вој., муз., etc.
  - Per-definition register: разг., жарг., фиг., пеј., арх., књиж., нар., etc.
- **Examples**: text after em-dash `–`, with `~` replaced by headword
- **Idioms**: text after `•` marker (~3,300 entries have idioms)
- **Cross-references**: `в.` (see) and `уп.` (compare) targets
- **Reflexive forms**: `~ се` sections within verb entries
- **Raw text**: original dictionary line for display

### Parser Output Structure

```typescript
interface ParsedEntry {
  headword: string;           // raw headword with optional homonym number
  headwordClean: string;      // cleaned headword (no numbers, no accents)
  homonymNumber?: number;     // 1, 2, 3... if present
  alternativeForms?: string[]; // e.g., ["абоносов"] for "абоносов и абоносов"
  parentheticalForm?: string; // e.g., "абакус" for "абак(ус)"
  inflectionSuffix?: string;  // "-ура", "-лна, -о", "-ицирам"
  partOfSpeech: string;       // imenica, glagol, pridev, prilog, etc.
  gender?: string;            // muski, zenski, srednji
  aspect?: string;            // svrseni, nesvrseni, dvovidski
  etymologyLang?: string;     // latinski, grcki, etc.
  definitions: ParsedDefinition[];
  idioms?: ParsedIdiom[];
  crossReferences?: CrossRef[];
  reflexive?: ParsedReflexive;
  gerund?: string;            // verbal noun form
  rawText: string;            // original full text
  pageNumber?: number;        // source page
  source: string;             // "matica-srpska-2011"
}

interface ParsedDefinition {
  number: number;             // 1, 2, 3...
  subLetter?: string;         // а, б, в, г, д
  text: string;               // definition text
  domain?: string;            // бот., зоол., мед., etc.
  register?: string;          // разг., фиг., etc.
  examples: string[];         // sentences after –
  scientificName?: string;    // Latin names like "Diospyros ebenum"
}

interface ParsedIdiom {
  phrase: string;
  meaning: string;
}

interface CrossRef {
  type: "see" | "compare";    // в. or уп.
  targetWord: string;
}
```

### Output

Write JSON to `data/processed/matica-srpska-parsed.json` with statistics summary.

### Verification

- Target: 80,000-90,000 entries total
- Expected POS distribution: imenica ~35K, pridev ~22K, glagol ~16K, prilog ~6K, other ~6K
- Check: >95% entries have at least one definition
- Spot-check: first 20, last 20, random middle samples

---

## Phase 2: Database Schema Updates

**Modify**: `prisma/schema.prisma`

### Word Model - Add Fields

```prisma
homonymNumber   Int      @default(0) @map("homonym_number")
rawText         String?  @map("raw_text")
inflectionInfo  String?  @map("inflection_info")
```

- `homonymNumber`: distinguishes а¹, а², а³, а⁴ (different words sharing spelling)
- `rawText`: stores original Matica Srpska text for display
- `inflectionInfo`: suffix patterns like `-ура`, `-лна, -о`, `-ицирам`

### Definition Model - Add Field

```prisma
subLetter  String?  @map("sub_letter")
```

For sub-definitions (а., б., в., г., д.).

### New Idiom Model

```prisma
model Idiom {
  id         String   @id @default(cuid())
  wordId     String   @map("word_id")
  phrase     String
  meaning    String
  source     String?
  createdAt  DateTime @default(now()) @map("created_at")

  word Word @relation(fields: [wordId], references: [id], onDelete: Cascade)

  @@index([wordId])
  @@map("idioms")
}
```

~3,300 entries have idiomatic expressions. Separate model keeps them queryable.

### Unique Constraint Update

Change `@@unique([cyrillic, partOfSpeech])` to `@@unique([cyrillic, partOfSpeech, homonymNumber])` on Word model.

### Search Performance - Trigram Index

Add raw SQL migration for `pg_trgm` GIN indexes on `cyrillic` and `latin` columns for fast `LIKE '%query%'` at 85K scale:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX words_cyrillic_trgm ON words USING gin (cyrillic gin_trgm_ops);
CREATE INDEX words_latin_trgm ON words USING gin (latin gin_trgm_ops);
```

### Migration

Run `npx prisma migrate dev --name add-matica-fields`. All changes are additive (new nullable fields + new model), no breaking changes.

---

## Phase 3: Import Script

**Create**: `scripts/import-matica-only.ts`

### Process

1. **Reset**: Truncate all tables (words, definitions, examples, etymologies, word_relations, idioms, etc.)
2. **Read**: Load parsed JSON from Phase 1
3. **Pass A - Create Records** (batches of 500 in transactions):
   - Create Word with Cyrillic headword + Latin transliteration (using existing `cyrillicToLatin`)
   - Create Definition records (numbered, with domain/register, sub-letters)
   - Create Example records (expand `~` to headword)
   - Create Etymology records (origin language)
   - Create Idiom records (phrase + meaning)
4. **Pass B - Resolve Cross-References**:
   - Build lookup: `cyrillic -> wordId`
   - Create WordRelation records for `в.` (type: "synonym") and `уп.` (type: "related")
5. **Report**: Log counts for all record types created

### Error Handling

- Each batch wrapped in try/catch, failures logged but don't stop import
- Skip duplicate unique constraint violations gracefully
- Final summary: words created, definitions, examples, etymologies, idioms, cross-refs resolved/failed

---

## Phase 4: Web App Updates

### 4.1 Types - `src/types/dictionary.ts`

- Add to `WordDetail`: `homonymNumber?`, `rawText?`, `idioms: IdiomData[]`
- Add to `DefinitionWithExamples`: `subLetter?: string`
- Add new interface `IdiomData { id, phrase, meaning }`
- Add `"prefiks"` to `PartOfSpeech` type

### 4.2 DefinitionList Component - `src/components/DefinitionList.tsx`

- **Group sub-definitions**: When definitions have `subLetter`, nest them under parent definition number
- **Expand domain/register labels**: Add all Matica Srpska abbreviations:
  - **Domains**: анат., астр., бот., вет., вој., геогр., геол., етн., зоол., информ., ист., лингв., мат., мед., муз., правн., спорт., техн., фил., физ., фин., хем., цркв., штамп., архит., филм., пол.
  - **Registers**: разг., жарг., вулг., фиг., пеј., арх., књиж., нар., песн., експр., шаљ., ир., ретко

### 4.3 Word Detail Page - `src/app/rec/[word]/page.tsx`

- **Homonym display**: Show superscript number in `<h1>` when `homonymNumber > 0`
- **Idioms section**: New section after definitions showing `•` phrases with heading "Изрази и фразе"
- **Raw text section**: Collapsible "Изворни текст" section at bottom with original dictionary entry
- **Data source badge**: Show "Матица српска, 2011" source indicator
- **Update query**: Include `idioms` in findWordBySlug includes

### 4.4 Search/Routing - `src/lib/search.ts`

- Update `findWordBySlug`: handle homonym suffix in URL (e.g., `/rec/а-2` -> word="а", homonymNumber=2)
- Add `homonymNumber` to select fields in search results
- Update autocomplete to show homonym indicator when word has multiple entries

### 4.5 Footer - `src/components/Footer.tsx`

- Update data source text from "srLex, Serbian Wiktionary, Serbian WordNet" to "Речник српскога језика, Матица српска, 2011"

---

## Dictionary Entry Format Reference

### Entry Types

| Type | Pattern | Example |
|------|---------|---------|
| Noun | `headword, -suffix м/ж/с` | `абажур, -ура м фр. заклон, штит...` |
| Adjective | `headword, -а, -о` | `абнормалан, -лна, -о лат. ненормалан...` |
| Verb | `headword, -suffix свр./несвр.` | `абдицирати, -ицирам свр. (несвр.)` |
| Adverb | `headword прил.` | `абецедно прил. по абецедном реду` |
| Interjection | `headword узв.` | `авај узв. тур. за изражавање бола` |
| Conjunction | `headword везн.` | `а² везн. главном супр. значења` |
| Preposition | `headword предл. (с case)` | `без предл. (с ген.)` |
| Particle | `headword речца` | `а³ речца у прил. и везн. служби` |
| Prefix | `headword- преф.` | `а- грч. преф. означава негацију` |
| Cross-ref | `headword X в. target` | `езотерија ж в. езотеричност.` |

### Special Markers

| Marker | Meaning | Example |
|--------|---------|---------|
| `¹²³⁴` | Homonym number | `а¹`, `а²`, `а³` |
| `1. 2. 3.` | Main definition numbers | `1. first meaning. 2. second meaning.` |
| `а. б. в.` | Sub-definition letters | `1. а. sub-meaning. б. sub-meaning.` |
| `•` | Idiom/phrase | `• од а до ш from start to finish` |
| `–` | Example sentence | `– Ја му говорим једно.` |
| `~` | Headword substitution | `~ поређати` (= абецедно поређати) |
| `в.` | See (cross-reference) | `в. езотеричност` |
| `уп.` | Compare | `уп. натпијати се` |
| `~ се` | Reflexive form | `и ~ се прати себе` |
| `[гл. им. X с]` | Gerund form | `[гл. им. таљење с]` |
| `(трп. X)` | Passive participle | `(трп. праћен)` |

### Abbreviation Mappings

**Part of Speech**: м (masculine noun), ж (feminine noun), с (neuter noun), свр. (perfective verb), несвр. (imperfective verb), прил. (adverb), узв./узвик (interjection), везн. (conjunction), предл. (preposition), речца (particle), бр. (numeral), зам. (pronoun), преф. (prefix)

**Etymology**: грч. (Greek), лат. (Latin), фр. (French), нем. (German), итал. (Italian), тур. (Turkish), енгл. (English), мађ. (Hungarian), рус. (Russian), хебр. (Hebrew), шп. (Spanish), перс. (Persian), араб. (Arabic), јап. (Japanese), порт. (Portuguese), хол. (Dutch), чеш. (Czech), пољ. (Polish), алб. (Albanian), рум. (Romanian), псл. (Proto-Slavic), скан. (Scandinavian), кин. (Chinese), санскр. (Sanskrit), стсл. (Old Church Slavonic)

**Domains**: бот. (botany), зоол. (zoology), мед. (medicine), мат. (mathematics), физ. (physics), хем. (chemistry), архит. (architecture), муз. (music), спорт. (sports), правн. (law), лингв. (linguistics), ист. (history), анат. (anatomy), геогр. (geography), геол. (geology), астр. (astronomy), вој. (military), цркв. (ecclesiastical), фин. (finance), пол. (politics), филм. (film), штамп. (printing), вет. (veterinary), етн. (ethnology), информ. (informatics), фил. (philosophy), техн. (technical)

**Registers**: разг. (colloquial), жарг. (slang), вулг. (vulgar), пеј. (pejorative), арх. (archaic), фиг. (figurative), књиж. (literary), нар. (folk/dialectal), песн. (poetic), експр. (expressive), шаљ. (jocular), ир. (ironic), ретко (rare)

**Morphological**: дем. (diminutive), аугм. (augmentative), хип. (hypocoristic), зб. им. (collective noun), супл. мн. (supletive plural), гл. им. (gerund/verbal noun), трп. (passive participle), непром. (indeclinable)

---

## File Summary

| Action | File |
|--------|------|
| CREATE | `scripts/parse-matica-complete.ts` (new comprehensive parser) |
| CREATE | `scripts/import-matica-only.ts` (batch import script) |
| MODIFY | `prisma/schema.prisma` (add fields + Idiom model) |
| MODIFY | `src/types/dictionary.ts` (add types) |
| MODIFY | `src/components/DefinitionList.tsx` (sub-defs, expanded labels) |
| MODIFY | `src/app/rec/[word]/page.tsx` (homonyms, idioms, raw text) |
| MODIFY | `src/lib/search.ts` (homonym routing, idiom includes) |
| MODIFY | `src/components/Footer.tsx` (data source) |

---

## Verification Plan

1. **After Phase 1**: Run parser, verify ~85K entries, check POS distribution, spot-check samples
2. **After Phase 2**: Run migration, verify schema changes applied
3. **After Phase 3**: Query database counts (words, definitions, examples, etymologies, idioms, relations), verify against parser output totals
4. **After Phase 4**:
   - Visit homepage - search works with 85K words
   - Visit `/rec/књига` - definitions, etymology, examples display correctly
   - Visit `/rec/а-1` through `/rec/а-4` - homonym navigation works
   - Visit `/abeceda/к` - browse by letter shows correct words with pagination
   - Test autocomplete speed with common prefixes
   - Verify dark mode renders all new sections correctly

---

## Execution Order

Phases 1 and 2 can run in parallel (parser + schema). Phase 3 depends on both. Phase 4 can partially overlap with Phase 3 (type/component changes before data exists).

Recommended: Phase 2 (schema) -> Phase 1 (parser) -> Phase 3 (import) -> Phase 4 (web app)
