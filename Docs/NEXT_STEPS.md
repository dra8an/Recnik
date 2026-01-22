# Next Steps

Guide to continue development of the Recnik project.

---

## Quick Resume

After a break, run these commands to get back to work:

```bash
# 1. Start PostgreSQL
brew services start postgresql@17

# 2. Navigate to project
cd /Users/draganbesevic/Projects/claude/Recnik

# 3. Start dev server
npm run dev

# 4. Open in browser
open http://localhost:3000

# 5. (Optional) Open database UI
npx prisma studio
```

---

## Priority Tasks

### 1. Import Full Dictionary Data (HIGH PRIORITY)

Currently only 10 sample words. Run the full pipeline to get ~200K words:

```bash
# Step 1: Download source data (~5-10 min, ~500MB download)
npx tsx scripts/download-sources.ts

# Step 2: Parse srLex inflections
npx tsx scripts/parse-srlex.ts

# Step 3: Parse Wiktionary definitions
npx tsx scripts/parse-wiktionary.ts

# Step 4: Merge all data
npx tsx scripts/merge-data.ts

# Step 5: Import to database (~10-20 min)
npx tsx scripts/import-to-db.ts
```

**Expected result:** ~200K words, ~6.9M inflections

**Disk space needed:** ~2-3GB

---

### 2. Test the Application

After importing data:

- [ ] Search for common words (реч, књига, човек)
- [ ] Test Cyrillic and Latin search
- [ ] Check word detail pages
- [ ] Verify inflection tables display correctly
- [ ] Test browse by letter
- [ ] Check dark/light mode

---

### 3. Serbian WordNet Integration (MEDIUM PRIORITY)

Add semantic relations from Serbian WordNet:

**Need to create:** `scripts/integrate-wordnet.ts`

**Data source:** https://wn.jerteh.rs/

**What it adds:**
- Better synonym/antonym relationships
- Hypernyms (broader terms)
- Hyponyms (narrower terms)
- Semantic domains

---

### 4. Category Browsing Page (MEDIUM PRIORITY)

**Need to create:** `src/app/kategorija/[category]/page.tsx`

Browse words by domain/category (e.g., medicine, law, cooking).

Requires WordNet integration first for domain data.

---

### 5. SEO Optimization (BEFORE LAUNCH)

- [ ] Add JSON-LD structured data for dictionary entries
- [ ] Generate sitemap.xml
- [ ] Optimize meta tags per page
- [ ] Add Open Graph images

---

### 6. Production Deployment (FINAL)

**Option A: Vercel + Supabase**
1. Create Supabase project
2. Update `.env` with Supabase DATABASE_URL
3. Run `npx prisma db push`
4. Import data (subset for free tier)
5. Deploy to Vercel

**Option B: Self-hosted**
- VPS with PostgreSQL
- Docker deployment

See `DATABASE_SETUP.md` for Supabase migration guide.

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
- See PROJECT_PLAN.md for details

### Full-Text Search
- Enable PostgreSQL `pg_trgm` extension
- Add fuzzy matching for typos

---

## File Reference

| Need to work on... | Look at... |
|-------------------|------------|
| Database setup | `Docs/DATABASE_SETUP.md` |
| Project plan | `Docs/PROJECT_PLAN.md` |
| Current status | `Docs/PROJECT_STATUS.md` |
| API routes | `src/app/api/` |
| Page components | `src/app/` |
| UI components | `src/components/` |
| Database queries | `src/lib/search.ts` |
| Schema | `prisma/schema.prisma` |
| Import scripts | `scripts/` |

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
npx tsx scripts/seed.ts        # Reset to 10 sample words

# Data Pipeline
npx tsx scripts/download-sources.ts
npx tsx scripts/parse-srlex.ts
npx tsx scripts/parse-wiktionary.ts
npx tsx scripts/merge-data.ts
npx tsx scripts/import-to-db.ts

# PostgreSQL
brew services start postgresql@17
brew services stop postgresql@17
/usr/local/opt/postgresql@17/bin/psql recnik   # Connect to DB
```

---

## Questions?

Refer to documentation in `Docs/` folder or ask Claude to continue from this point.
