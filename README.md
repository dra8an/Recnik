# Recnik - Serbian Dictionary

A comprehensive Serbian language dictionary website featuring definitions, etymology, pronunciation, examples, synonyms/antonyms, and word inflections.

## Features

- **Search** - Autocomplete search supporting both Cyrillic and Latin scripts
- **Word Details** - Definitions, examples, etymology, pronunciation (IPA)
- **Inflection Tables** - Full conjugation and declension tables
- **Synonyms & Antonyms** - Related words and semantic relations
- **Browse by Letter** - Alphabetical navigation (А-Ш)
- **Dark/Light Mode** - Theme toggle with system preference support
- **Responsive Design** - Mobile-first approach

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Database:** PostgreSQL
- **ORM:** Prisma 7.x
- **Styling:** Tailwind CSS
- **Language:** TypeScript

## Data Sources

| Source | Content | License |
|--------|---------|---------|
| [srLex](https://www.clarin.si/repository/xmlui/handle/11356/1233) | 192K lemmas, 6.9M inflections | Open |
| [putnich/sr-sh-nlp](https://github.com/putnich/sr-sh-nlp) | Wiktionary definitions | CC-BY-SA |
| [Serbian Wiktionary](https://sr.wiktionary.org/) | Additional definitions | CC-BY-SA |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or pnpm

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd Recnik
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your DATABASE_URL
```

4. Initialize the database
```bash
npx prisma generate
npx prisma db push
```

5. (Optional) Seed with sample data
```bash
npx tsx scripts/seed.ts
```

6. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Data Pipeline

To populate the database with full dictionary data:

```bash
# 1. Download data sources
npx tsx scripts/download-sources.ts

# 2. Parse srLex inflections
npx tsx scripts/parse-srlex.ts

# 3. Parse Wiktionary definitions
npx tsx scripts/parse-wiktionary.ts

# 4. Merge all data sources
npx tsx scripts/merge-data.ts

# 5. Import to database
npx tsx scripts/import-to-db.ts
```

## Project Structure

```
Recnik/
├── Docs/                    # Documentation
│   ├── PROJECT_PLAN.md
│   ├── PROJECT_STATUS.md
│   └── CHANGELOG.md
├── prisma/
│   └── schema.prisma        # Database schema
├── scripts/                 # Data processing scripts
├── src/
│   ├── app/                 # Next.js pages & API routes
│   ├── components/          # React components
│   ├── lib/                 # Utilities (db, search, transliterate)
│   └── types/               # TypeScript definitions
└── data/                    # Downloaded datasets
```

## API Routes

| Endpoint | Description |
|----------|-------------|
| `GET /api/words/search?q=` | Search with autocomplete |
| `GET /api/words/[word]` | Get word details |
| `GET /api/words/random` | Get random word |
| `GET /api/words/word-of-day` | Get daily featured word |
| `GET /api/inflections/[word]` | Get word inflections |

## License

This project uses open data sources. See individual data source licenses above.
