# Serbian Dictionary - Matica Srpska Only Implementation Plan

## Overview

Build a clean, authoritative Serbian dictionary database using EXCLUSIVELY the official **Rečnik srpskoga jezika** (Matica Srpska, 2011) as the single data source.

**Goal**: Extract ALL ~85,000 dictionary entries with full grammatical information, definitions, etymology, and cross-references.

---

## Phase 1: Database Reset (Clean Slate)

**Objective**: Remove all existing data (srLex, Wiktionary, previous Matica imports).

**Script**: `scripts/reset-database.ts`

**Actions**:
```sql
TRUNCATE TABLE word_of_day, word_relations, examples, definitions,
               inflections, pronunciations, etymologies, words CASCADE;
```

---

## Phase 2: PDF Text Extraction

**Source**: `/Users/draganbesevic/Projects/claude/fetch/Recnik-srpskoga-jezika-2011.pdf`
- 1,530 pages, two-column layout
- ~85,000 entries
- Embedded Adobe ClearScan OCR

**Method**: Standard pdftotext (no flags) - provides cleanest output

```bash
pdftotext -enc UTF-8 Recnik-srpskoga-jezika-2011.pdf recnik-extracted.txt
```

---

## Phase 3: Complete Parser Implementation

### 3.1 Entry Detection Patterns

The current parser extracts only ~17K entries (20%). Missing patterns include:

| Pattern | Example | Current Status |
|---------|---------|----------------|
| Nouns | `књига ж` | ✅ Detected |
| Verbs | `радити, -им несвр.` | ✅ Detected |
| **Adjectives** | `леп, -а, -о` | ❌ **MISSING (~25K entries)** |
| Adverbs | `брзо прил.` | ✅ Detected |
| Other POS | `и везн.` | ⚠️ Partial |

### 3.2 Technical Abbreviations (ТЕХНИЧКЕ СКРАЋЕНИЦЕ)

**Part of Speech**:
- `м` = imenica (masculine noun)
- `ж` = imenica (feminine noun)
- `с` = imenica (neuter noun)
- `свр.` = glagol svršeni (perfective verb)
- `несвр.` = glagol nesvršeni (imperfective verb)
- `прил.` = prilog (adverb)
- `узвик` = uzvik (interjection)
- `везн.` = veznik (conjunction)
- `предл.` = predlog (preposition)
- `реч.` = čestica (particle)
- `бр.` = broj (numeral)
- `зам.` = zamenica (pronoun)

**Etymology/Origin**:
- `грч.` = grčki (Greek)
- `лат.` = latinski (Latin)
- `фр.` = francuski (French)
- `нем.` = nemački (German)
- `итал.` = italijanski (Italian)
- `тур.` = turski (Turkish)
- `енгл.` = engleski (English)
- `мађ.` = mađarski (Hungarian)
- `рус.` = ruski (Russian)
- `псл.` = praslovenski (Proto-Slavic)

**Domain/Field**:
- `бот.` = botanika, `зоол.` = zoologija, `мед.` = medicina
- `мат.` = matematika, `физ.` = fizika, `хем.` = hemija
- `архит.` = arhitektura, `муз.` = muzika, `спорт.` = sport
- `правн.` = pravo, `лингв.` = lingvistika, `ист.` = istorija
- `анат.` = anatomija, `геогр.` = geografija, `геол.` = geologija

**Register/Style**:
- `разг.` = razgovorni (colloquial)
- `жарг.` = žargon (slang)
- `вулг.` = vulgarno (vulgar)
- `пеј.` = pejorativno (pejorative)
- `арх.` = arhaično (archaic)
- `фиг.` = figurativno (figurative)
- `књиж.` = književni (literary)

**Cross-references**:
- `в.` = види (see) → Creates WordRelation with type 'variant'
- `уп.` = упореди (compare) → Creates WordRelation with type 'related'

**Structure markers**:
- `1., 2., 3.` = Main definition numbers
- `а., б., в.` = Sub-definition letters
- `•` = Idioms/phrases
- `~` = Replaces headword in examples

### 3.3 Entry Structure

```
HEADWORD [homonym#] GENDER/POS [ETYMOLOGY] [DOMAIN]
  1. Definition text: example usage
     а. Sub-definition
     б. Sub-definition
  2. Second meaning
  • idiom or phrase - explanation
  в. cross-reference
```

### 3.4 Parser Output Format

```typescript
interface ParsedEntry {
  headword: string;           // Original form
  headwordClean: string;      // Normalized (no accents/numbers)
  homonymNumber?: number;     // 1, 2, 3 for атлас¹, атлас²
  partOfSpeech: string;       // imenica, glagol, pridev, prilog, etc.
  gender?: string;            // muški, ženski, srednji
  aspect?: string;            // svršeni, nesvršeni, dvovidski
  etymology?: {
    language: string;
    text?: string;
  };
  definitions: {
    number: number;
    subLetter?: string;       // a, b, c
    text: string;
    domain?: string;
    register?: string;
    examples: string[];
  }[];
  idioms: string[];
  crossReferences: {
    type: 'see' | 'compare';
    target: string;
  }[];
  source: 'matica-srpska-2011';
}
```

---

## Phase 4: Database Import

**Script**: `scripts/import-matica-only.ts`

**Process**:
1. Create Word entries in batches of 1000
2. Create Definition entries with proper numbering
3. Create Example entries from usage examples
4. Create Etymology entries with origin language
5. Create WordRelation entries for cross-references (в., уп.)

**Database Schema** (existing, no changes needed):
- `words` → Word entries with cyrillic, latin, partOfSpeech, gender, aspect
- `definitions` → Multiple definitions per word with domain, register
- `examples` → Usage examples linked to definitions
- `etymologies` → Origin language and etymology text
- `word_relations` → Cross-references between words

---

## Phase 5: Validation

**Script**: `scripts/validate-import.ts`

**Checks**:
1. Total word count: 80,000-85,000 expected
2. Part of speech distribution:
   - imenica: ~40,000
   - pridev: ~25,000
   - glagol: ~15,000
   - prilog: ~3,000
   - other: ~2,000
3. Definition coverage: >95% of words should have definitions
4. Sample verification: Test common words (књига, човек, радити, леп, брзо)

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `scripts/reset-database.ts` | CREATE | Clear all existing data |
| `scripts/parse-matica-complete.ts` | CREATE | New comprehensive parser |
| `scripts/import-matica-only.ts` | CREATE | Clean import (no merge logic) |
| `scripts/validate-import.ts` | CREATE | Quality validation |
| `src/lib/abbreviations.ts` | CREATE | Centralized abbreviation mappings |

**Files to deprecate** (move to `scripts/deprecated/`):
- `parse-srlex.ts`
- `parse-wiktionary.ts`
- `merge-data.ts`
- `parse-matica-srpska.ts` (old incomplete parser)

---

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Total entries | 16,865 | **80,000-85,000** |
| Adjectives | 26 | **~25,000** |
| Nouns | 11,246 | **~40,000** |
| Verbs | 4,203 | **~15,000** |
| Definition coverage | ~70% | **>95%** |
| Etymology entries | 1,776 | **~5,000+** |
| Cross-references | 0 | **~10,000+** |
| Data source | Mixed (srLex, Wiktionary, Matica) | **Matica Srpska only** |

---

## Verification Steps

1. Run reset-database.ts → Confirm 0 records in all tables
2. Run parse-matica-complete.ts → Verify ~85K entries parsed
3. Run import-matica-only.ts → Confirm all entries imported
4. Run validate-import.ts → Check all validation metrics pass
5. Test application UI with new data

---

## Key Implementation Notes

1. **Adjective detection is critical** - Pattern: `word, -а, -о` accounts for ~25K entries
2. **Cross-references** should create bidirectional WordRelation entries
3. **Batch processing** essential for 85K entries - use transactions of 1000
4. **Source field** must be 'matica-srpska-2011' for all entries
5. **No first/last names** - Dictionary contains only common nouns, verbs, adjectives
