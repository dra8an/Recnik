# Matica Srpska Dictionary OCR & Processing Plan

**Created**: 2025-01-23

---

## Overview

Extract ~85,000 dictionary entries from the official Matica Srpska dictionary PDF using Tesseract OCR + Claude post-processing to fix systematic errors.

**Source PDF**: `/Users/draganbesevic/Projects/claude/fetch/Recnik-srpskoga-jezika-2011.pdf`
- 1,530 pages
- Two-column layout
- Serbian Cyrillic

---

## Completed

1. **Tested Tesseract OCR** with multiple configurations:
   - Different PSM modes (1, 3, 4, 6)
   - Different DPI (300, 400, 600)
   - Image preprocessing (sharpen, contrast, grayscale, binarize)

2. **Found best settings**: 400 DPI gives best balance of accuracy
   - Correct gender markers (ж not х)
   - Fewer т/ш confusions than 600 DPI

3. **Validated Claude post-processing approach**:
   - Successfully corrected page 17 with excellent results
   - Proof of concept: `ocr-test-output/test7-400dpi-CORRECTED.txt`

4. **Identified systematic OCR errors**:
   | Error | Example | Frequency |
   |-------|---------|-----------|
   | ш → т | ошворени → отворени | ~50+ per page |
   | ћ → г | самоћласник → самогласник | ~10+ per page |
   | 6 → б | Cyrillic б misread as 6 | Common |
   | 0 → о | Zero vs letter о | Common |
   | г → д | Occasional | Rare |

---

## Next Steps

### Step 1: Run full Tesseract OCR (~1-2 hours)

```bash
cd /Users/draganbesevic/Projects/claude/Recnik
./scripts/ocr-full-400dpi.sh
```

- Processes all 1,530 pages at 400 DPI
- Output: `data/raw/matica-srpska/recnik-tesseract-400dpi.txt`
- Progress logged to: `data/raw/matica-srpska/ocr-progress.log`

### Step 2: Claude post-processing

- Read through OCR output in chunks (50-100 pages at a time)
- Fix systematic errors (ш→т, ћ→г, etc.)
- Use linguistic knowledge to correct context-dependent errors
- Save corrected text to: `data/raw/matica-srpska/recnik-corrected.txt`

### Step 3: Extract dictionary entries

- Parse corrected text into structured TSV format
- Use improved entry detection patterns
- Expected output: ~85,000 entries
- Output: `data/processed/matica-entries.tsv`

### Step 4: Validate & import to database

- Verify entry count (~85,000 expected)
- Check POS distribution matches expectations
- Import to PostgreSQL database

---

## Files Reference

### Scripts
- `scripts/ocr-full-400dpi.sh` - Full OCR processing script
- `scripts/extract-entries-to-tsv-v2.ts` - Entry extraction (needs update after OCR)

### Test Output
- `data/raw/matica-srpska/ocr-test-output/`
  - `test7-400dpi.txt` - Best Tesseract output (uncorrected)
  - `test7-400dpi-CORRECTED.txt` - Claude-corrected version (proof of concept)
  - `page-0017.png` through `page-0020.png` - Sample dictionary page images

### Final Output (to be created)
- `data/raw/matica-srpska/recnik-tesseract-400dpi.txt` - Raw OCR output
- `data/raw/matica-srpska/recnik-corrected.txt` - Post-processed text
- `data/processed/matica-entries.tsv` - Structured dictionary entries

---

## Why This Approach

1. **Original PDF OCR (ClearScan) was unusable** - too many errors, garbled text
2. **Tesseract with Serbian language pack** - much better, but systematic errors
3. **Claude post-processing** - leverages linguistic knowledge to fix errors that OCR cannot detect
4. **No official digital version exists** - must work with what we have

---

## Expected Results

| Metric | Target |
|--------|--------|
| Total entries | ~85,000 |
| Nouns (imenica) | ~40,000 |
| Adjectives (pridev) | ~25,000 |
| Verbs (glagol) | ~15,000 |
| Other POS | ~5,000 |
| Definition coverage | >95% |
