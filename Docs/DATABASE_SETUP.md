# Database Setup Guide

This document covers the complete PostgreSQL setup for the Recnik project.

---

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Environment Configuration](#environment-configuration)
3. [Prisma Setup](#prisma-setup)
4. [Seeding the Database](#seeding-the-database)
5. [Data Pipeline (Full Import)](#data-pipeline-full-import)
6. [Useful Commands](#useful-commands)
7. [Switching to Supabase (Production)](#switching-to-supabase-production)
8. [Troubleshooting](#troubleshooting)

---

## Local Development Setup

### Prerequisites

- macOS with Homebrew installed
- Node.js 18+

### Install PostgreSQL

```bash
# Install PostgreSQL 17 via Homebrew
brew install postgresql@17

# Start PostgreSQL service (runs on startup)
brew services start postgresql@17

# Or start manually (one-time, stops when terminal closes)
LC_ALL="en_US.UTF-8" /usr/local/opt/postgresql@17/bin/postgres -D /usr/local/var/postgresql@17
```

### Create the Database

```bash
# Create the recnik database
/usr/local/opt/postgresql@17/bin/createdb recnik

# Verify it was created
/usr/local/opt/postgresql@17/bin/psql -l | grep recnik
```

### Add PostgreSQL to PATH (Optional)

To use `psql`, `createdb`, etc. without full paths:

```bash
# Add to ~/.zshrc
echo 'export PATH="/usr/local/opt/postgresql@17/bin:$PATH"' >> ~/.zshrc

# Reload shell
source ~/.zshrc
```

---

## Environment Configuration

### .env File

The project uses a `.env` file for database configuration:

```bash
# Location: /Recnik/.env

# Local development (macOS Homebrew)
DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/recnik?schema=public"

# Example for user "draganbesevic"
DATABASE_URL="postgresql://draganbesevic@localhost:5432/recnik?schema=public"
```

### Connection String Format

```
postgresql://[user]:[password]@[host]:[port]/[database]?schema=[schema]
```

| Component | Local (Homebrew) | Supabase |
|-----------|------------------|----------|
| user | Your macOS username | `postgres.[project-ref]` |
| password | (none) | Your database password |
| host | `localhost` | `aws-0-[region].pooler.supabase.com` |
| port | `5432` | `6543` |
| database | `recnik` | `postgres` |

---

## Prisma Setup

### What is Prisma?

Prisma is a modern database toolkit for Node.js and TypeScript. It replaces traditional ORMs and raw SQL with a type-safe, auto-generated client.

**Instead of writing SQL like this:**
```sql
SELECT * FROM words WHERE cyrillic = 'реч';
```

**You write TypeScript like this:**
```typescript
const word = await prisma.word.findFirst({
  where: { cyrillic: 'реч' }
});
```

**Benefits:**
- **Type safety** - TypeScript knows the shape of your data
- **Auto-completion** - IDE suggests available fields and methods
- **No SQL injection** - Queries are parameterized automatically
- **Easy relations** - Fetch related data with `include`

### How Prisma Works

```
┌─────────────────────┐
│  schema.prisma      │  ← You define your models here
│  (prisma/schema.prisma)
└──────────┬──────────┘
           │
           │  npx prisma generate
           ▼
┌─────────────────────┐
│  Prisma Client      │  ← Auto-generated TypeScript client
│  (@prisma/client)   │
└──────────┬──────────┘
           │
           │  npx prisma db push
           ▼
┌─────────────────────┐
│  PostgreSQL         │  ← Actual database tables
│  (recnik database)  │
└─────────────────────┘
```

### The Schema File

Location: `prisma/schema.prisma`

This file defines your database structure. Example from this project:

```prisma
// Database connection (reads from .env)
datasource db {
  provider = "postgresql"
}

// Generate TypeScript client
generator client {
  provider = "prisma-client-js"
}

// Define a model (becomes a database table)
model Word {
  id           String   @id @default(cuid())    // Primary key
  word         String                            // The word itself
  cyrillic     String                            // Cyrillic form
  latin        String                            // Latin form
  partOfSpeech String                            // noun, verb, etc.

  // Relations to other tables
  definitions  Definition[]                      // One word has many definitions
  inflections  Inflection[]                      // One word has many inflections

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Definition {
  id             String   @id @default(cuid())
  definitionText String

  // Foreign key relation
  word           Word     @relation(fields: [wordId], references: [id])
  wordId         String

  // A definition can have many examples
  examples       Example[]
}
```

**Key concepts:**
- `model` = database table
- `@id` = primary key
- `@default(cuid())` = auto-generate unique ID
- `String`, `Int`, `DateTime` = column types
- `@relation` = foreign key relationship
- `Definition[]` = one-to-many relation (one word has many definitions)

### Generate Prisma Client

After any changes to `prisma/schema.prisma`, regenerate the client:

```bash
npx prisma generate
```

This creates TypeScript code in `node_modules/@prisma/client` that knows about your models.

**You must run this:**
- After cloning the project
- After changing `schema.prisma`
- After updating Prisma version

### Push Schema to Database

Create or update tables in the database to match your schema:

```bash
npx prisma db push
```

This is for development. For production, use migrations instead:
```bash
npx prisma migrate dev --name description_of_change
```

### Using Prisma Client in Code

#### Import and Initialize

```typescript
// src/lib/db.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export { prisma };
```

#### Basic Queries

```typescript
import { prisma } from "@/lib/db";

// Find one word
const word = await prisma.word.findFirst({
  where: { cyrillic: "реч" }
});

// Find many words
const words = await prisma.word.findMany({
  where: { partOfSpeech: "именица" },
  take: 10  // Limit to 10 results
});

// Find by ID
const word = await prisma.word.findUnique({
  where: { id: "some-id-here" }
});
```

#### Include Related Data

```typescript
// Get word with its definitions
const word = await prisma.word.findFirst({
  where: { cyrillic: "реч" },
  include: {
    definitions: true  // Include all definitions
  }
});
// word.definitions is now an array

// Nested includes
const word = await prisma.word.findFirst({
  where: { cyrillic: "реч" },
  include: {
    definitions: {
      include: {
        examples: true  // Include examples for each definition
      }
    },
    pronunciations: true,
    etymologies: true
  }
});
```

#### Select Specific Fields

```typescript
// Only get certain columns (more efficient)
const words = await prisma.word.findMany({
  select: {
    id: true,
    cyrillic: true,
    latin: true
    // Other fields are NOT fetched
  }
});
```

#### Search and Filter

```typescript
// Search with LIKE (contains)
const words = await prisma.word.findMany({
  where: {
    cyrillic: {
      contains: "реч",
      mode: "insensitive"  // Case-insensitive
    }
  }
});

// Starts with
const words = await prisma.word.findMany({
  where: {
    cyrillic: {
      startsWith: "а"
    }
  }
});

// Multiple conditions (AND)
const words = await prisma.word.findMany({
  where: {
    partOfSpeech: "именица",
    isCommon: true
  }
});

// OR conditions
const words = await prisma.word.findMany({
  where: {
    OR: [
      { cyrillic: { startsWith: "а" } },
      { latin: { startsWith: "a" } }
    ]
  }
});
```

#### Sorting and Pagination

```typescript
// Sort results
const words = await prisma.word.findMany({
  orderBy: {
    cyrillic: "asc"  // or "desc"
  }
});

// Pagination
const page = 2;
const pageSize = 20;

const words = await prisma.word.findMany({
  skip: (page - 1) * pageSize,  // Skip first N results
  take: pageSize                 // Limit results
});
```

#### Create Records

```typescript
// Create a word
const word = await prisma.word.create({
  data: {
    word: "нов",
    cyrillic: "нов",
    latin: "nov",
    partOfSpeech: "придев"
  }
});

// Create with related records
const word = await prisma.word.create({
  data: {
    word: "нов",
    cyrillic: "нов",
    latin: "nov",
    partOfSpeech: "придев",
    definitions: {
      create: [
        { definitionText: "који није стар" },
        { definitionText: "који је скоро настао" }
      ]
    }
  }
});
```

#### Update Records

```typescript
// Update by ID
await prisma.word.update({
  where: { id: "some-id" },
  data: { isCommon: true }
});

// Update many
await prisma.word.updateMany({
  where: { partOfSpeech: "noun" },
  data: { partOfSpeech: "именица" }
});
```

#### Delete Records

```typescript
// Delete one
await prisma.word.delete({
  where: { id: "some-id" }
});

// Delete many
await prisma.word.deleteMany({
  where: { source: "test" }
});
```

#### Count Records

```typescript
const totalWords = await prisma.word.count();

const nounCount = await prisma.word.count({
  where: { partOfSpeech: "именица" }
});
```

### View Database in Prisma Studio

Visual database browser - great for debugging:

```bash
npx prisma studio
```

Opens at http://localhost:5555

Features:
- Browse all tables
- View and edit records
- Filter and search
- See relations

### Reset Database (DESTRUCTIVE)

Drop all tables and recreate:

```bash
npx prisma db push --force-reset
```

**Warning:** This deletes ALL data!

### Common Prisma Commands

```bash
# Generate TypeScript client (run after schema changes)
npx prisma generate

# Push schema to database (development)
npx prisma db push

# Create a migration (production)
npx prisma migrate dev --name add_new_field

# Open visual database browser
npx prisma studio

# Format schema file
npx prisma format

# Validate schema syntax
npx prisma validate

# View current database status
npx prisma db pull
```

---

## Seeding the Database

### Quick Seed (10 Sample Words)

For development and testing:

```bash
npx tsx scripts/seed.ts
```

This creates:
- 10 Serbian words (реч, књига, писати, читати, леп, добар, човек, жена, дан, ноћ)
- 18 definitions with examples
- 14 inflections
- 10 pronunciations
- Word relations (synonyms, antonyms)

### Seed Output

```
Database Seeder
===============

Clearing existing data...

Seeding database with sample words...

  Adding: реч (reč)
  Adding: књига (knjiga)
  ...

[SUCCESS] Seeded 10 words

Database Statistics:
  Words: 10
  Definitions: 18
  Examples: 34
  Inflections: 14
  Pronunciations: 10
  Etymologies: 2
  Word Relations: 3
```

---

## Data Pipeline (Full Import)

To import the complete dictionary data (~200K words, 6.9M inflections):

### Step 1: Download Data Sources

```bash
npx tsx scripts/download-sources.ts
```

Downloads:
- srLex from CLARIN.SI (inflections)
- putnich/sr-sh-nlp from GitHub (definitions)

Files saved to `data/raw/`

### Step 2: Parse srLex Inflections

```bash
npx tsx scripts/parse-srlex.ts
```

Parses the srLex XML and extracts lemmas with inflections.
Output: `data/processed/srlex-parsed.json`

### Step 3: Parse Wiktionary Definitions

```bash
npx tsx scripts/parse-wiktionary.ts
```

Parses Wiktionary data for definitions, examples, pronunciation.
Output: `data/processed/wiktionary-parsed.json`

### Step 4: Merge Data Sources

```bash
npx tsx scripts/merge-data.ts
```

Combines srLex and Wiktionary data, deduplicates entries.
Output: `data/processed/merged-dictionary.json`

### Step 5: Import to Database

```bash
npx tsx scripts/import-to-db.ts
```

Imports the merged data into PostgreSQL.

### Full Pipeline (All Steps)

```bash
# Run all steps in sequence
npx tsx scripts/download-sources.ts && \
npx tsx scripts/parse-srlex.ts && \
npx tsx scripts/parse-wiktionary.ts && \
npx tsx scripts/merge-data.ts && \
npx tsx scripts/import-to-db.ts
```

---

## Useful Commands

### PostgreSQL Service Management

```bash
# Start PostgreSQL
brew services start postgresql@17

# Stop PostgreSQL
brew services stop postgresql@17

# Restart PostgreSQL
brew services restart postgresql@17

# Check status
brew services list | grep postgresql
```

### Database Operations

```bash
# Connect to database
/usr/local/opt/postgresql@17/bin/psql recnik

# List all databases
/usr/local/opt/postgresql@17/bin/psql -l

# Drop database (DESTRUCTIVE)
/usr/local/opt/postgresql@17/bin/dropdb recnik

# Create database
/usr/local/opt/postgresql@17/bin/createdb recnik
```

### Quick Database Stats

```bash
# Connect and run query
/usr/local/opt/postgresql@17/bin/psql recnik -c "
SELECT
  (SELECT COUNT(*) FROM \"Word\") as words,
  (SELECT COUNT(*) FROM \"Definition\") as definitions,
  (SELECT COUNT(*) FROM \"Inflection\") as inflections,
  (SELECT COUNT(*) FROM \"Example\") as examples;
"
```

### Prisma Commands

```bash
# Generate client
npx prisma generate

# Push schema
npx prisma db push

# Open studio
npx prisma studio

# Format schema file
npx prisma format

# Validate schema
npx prisma validate
```

---

## Switching to Supabase (Production)

### 1. Create Supabase Project

1. Go to https://supabase.com
2. Create new project
3. Note your project URL and database password

### 2. Get Connection String

In Supabase dashboard:
- Go to Settings > Database
- Copy the "Connection string" (URI format)
- Select "Transaction pooler" for better performance

### 3. Update .env

```bash
# Replace local URL with Supabase URL
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?schema=public"
```

### 4. Push Schema

```bash
npx prisma db push
```

### 5. Import Data

Run the seed script or full data pipeline against Supabase.

### Storage Considerations

| Tier | Storage | Cost | Suitable For |
|------|---------|------|--------------|
| Free | 500 MB | $0 | ~20K words (subset) |
| Pro | 8 GB | $25/mo | Full dictionary |

---

## Troubleshooting

### "User was denied access"

Wrong username in connection string. On macOS, use your system username:

```bash
# Check your username
whoami

# Update .env
DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/recnik?schema=public"
```

### "Database does not exist"

Create the database:

```bash
/usr/local/opt/postgresql@17/bin/createdb recnik
```

### "Connection refused"

PostgreSQL not running. Start it:

```bash
brew services start postgresql@17
```

### "Port 5432 already in use"

Another PostgreSQL instance running. Either:

```bash
# Stop the other instance
brew services stop postgresql  # (older version)

# Or use a different port in .env
DATABASE_URL="postgresql://username@localhost:5433/recnik?schema=public"
```

### Prisma Client Out of Sync

After schema changes:

```bash
npx prisma generate
```

### Reset Everything

Nuclear option - drop and recreate:

```bash
/usr/local/opt/postgresql@17/bin/dropdb recnik
/usr/local/opt/postgresql@17/bin/createdb recnik
npx prisma db push
npx tsx scripts/seed.ts
```

---

## Database Schema Overview

The database has 8 main tables:

| Table | Purpose | Relations |
|-------|---------|-----------|
| `Word` | Main word entries (lemmas) | Has many definitions, inflections, etc. |
| `Definition` | Word meanings | Belongs to Word, has many Examples |
| `Example` | Usage examples | Belongs to Definition |
| `Inflection` | Word forms (conjugation/declension) | Belongs to Word |
| `Pronunciation` | IPA, audio URL, syllables | Belongs to Word |
| `Etymology` | Word origin and history | Belongs to Word |
| `WordRelation` | Synonyms, antonyms | Links two Words |
| `WordOfDay` | Featured daily words | References Word |

See `prisma/schema.prisma` for full schema definition.
