# Next Steps

Guide to continue development of the Recnik project.

**Site is live at:** https://recnik.onrender.com/
**GitHub**: `git@github.com:dra8an/Recnik.git` (private)

---

## Project Context (read this first if starting fresh)

Recnik is an online Serbian dictionary built from the official Rečnik Matice Srpske (2011), the most authoritative single-volume Serbian dictionary. There is no official digital version — we created one by OCR-ing the 1,530-page PDF, correcting systematic errors, parsing entries into structured data, and deploying as a web app.

**How the data got here**:
1. Source PDF: `~/Projects/claude/fetch/Recnik-srpskoga-jezika-2011.pdf`
2. Tesseract OCR at 400 DPI → `data/raw/matica-srpska/recnik-tesseract-400dpi.txt`
3. Error correction (OCR had systematic errors: т↔ш, г↔ћ, 6↔б, 0↔о) → `data/raw/matica-srpska/recnik-corrected.txt`
4. Two-pass parser (`scripts/parse-matica-complete.ts`) → `data/processed/matica-srpska-parsed.json` (~71K entries)
5. Import script (`scripts/import-matica-only.ts`) → PostgreSQL (Neon production DB)

**Other parsed data available but not yet imported**:
- `data/processed/srlex-parsed.json` — 192K lemmas, 6.9M inflections (1.2 GB). Source: srLex v1.3
- `data/processed/wiktionary-parsed.json` — definitions from Serbian Wiktionary

**Key design features**:
- Search works in both Cyrillic and Latin script (transliteration via `src/lib/transliterate.ts`)
- Dictionary cross-references (`в.` = see, `уп.` = compare) are parsed and rendered as clickable links
- The `~` character in the original dictionary is shorthand for the headword in examples/compounds

For full architecture details, see `Docs/PROJECT_STATUS.md`.

---

## Quick Resume

After a break, run these commands to get back to work:

```bash
# 1. Start PostgreSQL (for local development)
brew services start postgresql@17

# 2. Navigate to project
cd /Users/draganbesevic/Projects/claude/recnik

# 3. Start dev server
npm run dev

# 4. Open in browser
open http://localhost:3000

# 5. (Optional) Open database UI
npx prisma studio
```

---

## Priority Tasks

### 1. Fix Tilde (~) Replacement in Examples (HIGH PRIORITY)

**Problem**: The import script replaces `~` with the base headword form in examples and compounds. This produces grammatically incorrect text for adjectives and some verb entries where the headword should be inflected to match context.

**Example**: For "стран" (foreign), `~ војска` becomes "стран војска" but should be "страна војска" (feminine form).

**Scope**: Affects adjective entries (~14K) and some verb entries. Nouns are generally unaffected.

**Options**:

1. **Option A (recommended)**: Stop replacing `~` and display it as-is, matching printed dictionary convention. Serbian readers expect `~` notation.
   - Change `import-matica-only.ts` line 163: remove `.replace(/~/g, cyrillic)`
   - Optionally style `~` in the UI (bold, or show headword on hover/tooltip)
   - Re-import data to Neon

2. **Option B (advanced)**: Use srLex inflection data to look up the correct inflected form based on grammatical context. Requires NLP-level analysis — long-term enhancement.

---

### 2. Import srLex Inflections (MEDIUM PRIORITY)

Link the 6.9M inflected forms from srLex to the ~71K Matica dictionary entries, enabling declension/conjugation tables.

**Blocker**: Would add 200-400 MB to the database. Neon free tier has a 500 MB limit (currently using ~115 MB). Options:
- Import only inflections for words that exist in the DB (~40-50K lemmas, ~1.4-1.8M rows) — may fit within limits
- Upgrade to Neon paid tier or migrate to self-hosted PostgreSQL
- Use Neon's Launch plan ($19/mo) or a VPS with Docker (see `plan-deployment.md`)

**Full plan**: See `Docs/plan-inflections.md`

**Summary**:
1. Create `scripts/import-inflections.ts` — stream `srlex-parsed.json`, match lemmas to existing Word records, batch insert
2. Wire up `InflectionTable.tsx` component (already exists) with real data
3. Restore "Падежи" feature card on homepage
4. (Optional) Search by inflected form — fallback search on `inflections.formCyrillic`

---

### 3. SEO Optimization (MEDIUM PRIORITY)

Before promoting the site:

- [ ] Add JSON-LD structured data for dictionary entries (`DefinedTerm` schema)
- [ ] Generate `sitemap.xml` (~71K word URLs)
- [ ] Optimize meta tags per page (title, description)
- [ ] Add Open Graph images for social sharing
- [ ] Submit sitemap to Google Search Console

---

### 4. Serbian WordNet Integration (LOW PRIORITY)

Add semantic relations from Serbian WordNet (https://wn.jerteh.rs/):

**Need to create**: `scripts/integrate-wordnet.ts`

**What it adds**:
- Better synonym/antonym relationships
- Hypernyms (broader terms) / hyponyms (narrower terms)
- Semantic domains for category browsing

---

### 5. Category Browsing Page (LOW PRIORITY)

**Need to create**: `src/app/kategorija/[category]/page.tsx`

Browse words by domain/category (medicine, law, cooking, etc.). Requires WordNet integration for domain data.

---

## Known Issues

### 1. Tilde (~) Replacement (see Priority Task #1 above)

### 2. Cold Starts on Free Tier

- Render free tier spins down after ~15 min idle — cold start takes 30-60 seconds
- Neon auto-suspends after 5 min idle — adds ~1-2 seconds
- **Mitigation**: Use a free cron service (cron-job.org, UptimeRobot) to ping the site every 14 minutes

### 3. Neon Storage Limit

- Neon free tier: 500 MB storage
- Current usage: ~115 MB
- Inflections import would add 200-400 MB, potentially exceeding the limit
- **Options**: Import selectively, upgrade Neon, or migrate to self-hosted VPS

---

## Optional Enhancements

### Audio Pronunciation (TTS)
- Create `scripts/generate-audio.ts`
- Use Serbian TTS API/library
- Store audio files in cloud storage (S3/R2)

### Example Sentence Extraction
- Create `scripts/extract-examples.ts`
- Use MaCoCu corpus
- Implement GDEX algorithm for quality scoring

### TESLA Embeddings Integration
- Better synonym detection using word vectors
- See `PROJECT_PLAN.md` for details

### Full-Text Search with Fuzzy Matching
- Enable PostgreSQL `pg_trgm` extension
- Add fuzzy matching for typos

### Self-Hosted Migration
- Move to a VPS (Hetzner CX22 ~€4/mo) for no cold starts and unlimited DB size
- Docker deployment documented in `plan-deployment.md`

---

## Deployment Reference

### Current Setup
- **App**: Render free web service (GitHub auto-deploy on push to `main`)
- **Database**: Neon PostgreSQL free tier (eu-central-1)
- **URL**: https://recnik.onrender.com/
- **GitHub**: `git@github.com:dra8an/Recnik.git`

### Render Dashboard Config (no render.yaml file exists)
- **Build command**: `npm ci && npx prisma generate && npm run build`
- **Start command**: `npm start`
- **Instance type**: Free
- **Env vars**: `DATABASE_URL` = Neon connection string, `NODE_ENV` = `production`

### Neon Connection String Format
```
postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/recnik?sslmode=require
```
The actual credentials are in the Neon dashboard and in the local `.env` file (gitignored). The same `DATABASE_URL` is set in Render's environment variables.

### Deploying Changes
```bash
# Push to main branch — Render auto-deploys
git add <files>
git commit -m "Description of changes"
git push
```

### Importing Data to Production (Neon)
```bash
# Point at Neon and run import script
DATABASE_URL="<neon_connection_string>" npx tsx scripts/import-matica-only.ts
```

### Re-importing From Scratch
If you need to re-import all data (e.g., after fixing the tilde issue):
```bash
# 1. The parser reads from the corrected OCR text:
#    data/raw/matica-srpska/recnik-corrected.txt
# 2. Re-parse if needed (only if corrected text changed):
npx tsx scripts/parse-matica-complete.ts
# 3. Import truncates all tables and re-imports:
DATABASE_URL="<neon_connection_string>" npx tsx scripts/import-matica-only.ts
```

### Migrating Database Schema
```bash
DATABASE_URL="<neon_connection_string>" npx prisma db push
```

---

## File Reference

| Need to work on... | Look at... |
|-------------------|------------|
| Database schema | `prisma/schema.prisma` |
| Project plan | `Docs/PROJECT_PLAN.md` |
| Current status | `Docs/PROJECT_STATUS.md` |
| Deployment options | `Docs/plan-deployment.md` |
| Inflections plan | `Docs/plan-inflections.md` |
| API routes | `src/app/api/` |
| Page components | `src/app/` |
| UI components | `src/components/` |
| Database queries | `src/lib/search.ts` |
| Data import scripts | `scripts/` |

---

## Common Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production
npm run lint                   # Run linter

# Database
npx prisma studio              # Visual database browser
npx prisma generate            # Regenerate client after schema change
npx prisma db push             # Push schema changes to DB
npx tsx scripts/seed.ts        # Reset to 10 sample words (local dev only)

# Data Pipeline (local dev)
npx tsx scripts/download-sources.ts
npx tsx scripts/parse-srlex.ts
npx tsx scripts/parse-wiktionary.ts
npx tsx scripts/merge-data.ts
npx tsx scripts/import-to-db.ts

# Matica Srpska (the data currently in production)
npx tsx scripts/import-matica-only.ts

# PostgreSQL (local)
brew services start postgresql@17
brew services stop postgresql@17
```
