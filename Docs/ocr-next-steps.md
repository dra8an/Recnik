# OCR Processing - Progress Update

**Last Updated**: 2025-01-25
**Status**: Post-processing In Progress

---

## Current Progress

### OCR Correction Status

| Metric | Value |
|--------|-------|
| Pages corrected | 16-81 (65 pages) |
| Total pages | 1,530 |
| Progress | ~5% of pages |
| Corrected file lines | 7,240 |
| Last entry | `билансист(а)` |
| Raw OCR resume line | ~12,863 (PAGE 82) |

### Completed Sessions

| Date | Pages | Entries Range |
|------|-------|---------------|
| 2025-01-23 | 16-27 | а → безвредност |
| 2025-01-24 | 28-50 | безвредност → бездушност |
| 2025-01-24 | 51-70 | бездушно → безразложност |
| 2025-01-25 | 71-81 | безрачан → билансист(а) |

---

## OCR Correction Patterns

| OCR Error | Correct | Example | Frequency |
|-----------|---------|---------|-----------|
| ш → т | т | ошворени → отворени | ~50+ per page |
| ћ → г | г | одређеноћ → одређеног | ~10+ per page |
| л → г | г | малична → магична | Occasional |
| х → ж | ж | Gender marker х → ж | Common |
| -4, -0 → -а, -о | -а, -о | Adjective endings | Common |
| 6. → б. | б. | Sub-definition markers | Common |

**Additional Fixes**:
- Latin scientific names (Salix viminalis, Atropa belladonna, Piper, etc.)
- Chemical symbols (Be, Bi, Ba, C₆H₆)
- Line merging for hyphenated entries
- Page markers preserved

---

## To Resume Tomorrow

### Quick Start

```bash
# 1. Read raw OCR starting from page 82
# Line ~12,863 in: data/raw/matica-srpska/recnik-tesseract-400dpi.txt

# 2. Last corrected entry was:
# билансист(а), -е м онај који израђује билансе.

# 3. Append corrections to:
# data/raw/matica-srpska/recnik-corrected.txt (currently 7,240 lines)
```

### Suggested Next Batch
- **Pages 82-131** (50 pages) - testing larger batch size
- Read raw OCR lines: 12,863 - ~20,500
- Goal: See if 50-page batches maintain quality while improving throughput

### Process
1. Read 10-page chunks from raw OCR
2. Apply OCR corrections (ш→т, ћ→г, etc.)
3. Merge hyphenated lines
4. Restore Latin scientific names
5. Append to `recnik-corrected.txt`
6. Verify line count increased

---

## Key Files

| File | Description |
|------|-------------|
| `data/raw/matica-srpska/recnik-tesseract-400dpi.txt` | Raw OCR (17MB, 273,786 lines) |
| `data/raw/matica-srpska/recnik-corrected.txt` | Corrected output (7,240 lines) |
| `Docs/ocr-next-steps.md` | This file |

---

## Remaining Work

### 1. Continue OCR Corrections (~95% remaining)
- Pages 82-1530 still need processing
- Estimate: ~150 more sessions at 10 pages/session
- Or batch larger chunks (50-100 pages) with automation

### 2. Validate Corrected Text
- Sample check common words (књига, човек, радити, леп)
- Verify gender markers (м, ж, с) are correct
- Check POS abbreviations preserved

### 3. Extract Dictionary Entries to TSV
- Parse corrected text into structured format
- Expected: ~85,000 entries
- Output: `data/processed/matica-entries.tsv`

---

## Notes

- Dictionary content starts at page 17 (raw OCR line ~1,021)
- Pages 1-16 contain front matter (title, preface, abbreviations)
- Average ~110 lines of corrected output per page
- Processing speed: ~10 pages per session manually
