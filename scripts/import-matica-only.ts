/**
 * Import Matica Srpska dictionary data into the database (clean slate)
 *
 * Reads parsed JSON from parse-matica-complete.ts and populates all tables.
 * All existing data is truncated first — this is a full replacement.
 *
 * Two passes:
 *   Pass A: Create Word + Definition + Example + Etymology + Idiom records
 *   Pass B: Resolve cross-references into WordRelation records
 *
 * Usage: tsx scripts/import-matica-only.ts
 */

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// --- Setup ---

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const INPUT_FILE = path.join(process.cwd(), "data", "processed", "matica-srpska-parsed.json");

const BATCH_SIZE = 50;
const SOURCE = "matica-srpska-2011";

// --- Types ---

interface ParsedDefinition {
  number: number;
  subLetter?: string;
  text: string;
  domain?: string;
  register?: string;
  examples: string[];
}

interface CrossReference {
  type: "see" | "compare";
  target: string;
}

interface ParsedEntry {
  headword: string;
  headwordClean: string;
  homonymNumber: number;
  alternativeForms: string[];
  partOfSpeech: string;
  gender?: string;
  aspect?: string;
  inflectionInfo?: string;
  etymology?: string;
  definitions: ParsedDefinition[];
  idioms: string[];
  crossReferences: CrossReference[];
  hasReflexive: boolean;
  rawText: string;
}

interface ParsedData {
  metadata: Record<string, unknown>;
  entries: ParsedEntry[];
}

// --- Transliteration ---

function cyrillicToLatin(text: string): string {
  const map: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'ђ': 'đ', 'е': 'e',
    'ж': 'ž', 'з': 'z', 'и': 'i', 'ј': 'j', 'к': 'k', 'л': 'l', 'љ': 'lj',
    'м': 'm', 'н': 'n', 'њ': 'nj', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's',
    'т': 't', 'ћ': 'ć', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'č',
    'џ': 'dž', 'ш': 'š',
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Ђ': 'Đ', 'Е': 'E',
    'Ж': 'Ž', 'З': 'Z', 'И': 'I', 'Ј': 'J', 'К': 'K', 'Л': 'L', 'Љ': 'Lj',
    'М': 'M', 'Н': 'N', 'Њ': 'Nj', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S',
    'Т': 'T', 'Ћ': 'Ć', 'У': 'U', 'Ф': 'F', 'Х': 'H', 'Ц': 'C', 'Ч': 'Č',
    'Џ': 'Dž', 'Ш': 'Š',
  };
  return [...text].map(c => map[c] ?? c).join('');
}

// --- Truncate ---

async function truncateAll(): Promise<void> {
  console.log("Truncating all tables...");
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE idioms, examples, definitions, etymologies, word_relations, inflections, pronunciations, word_of_day, words CASCADE`
  );
  console.log("  Done.");
}

// --- Load Data ---

function loadData(): ParsedData {
  console.log(`Loading parsed data from ${INPUT_FILE}...`);
  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(`Input file not found: ${INPUT_FILE}. Run parse-matica-complete.ts first.`);
  }
  const content = fs.readFileSync(INPUT_FILE, "utf-8");
  const data: ParsedData = JSON.parse(content);
  console.log(`  Loaded ${data.entries.length} entries`);
  return data;
}

// --- Pass A: Import Entries ---

async function importEntries(entries: ParsedEntry[]): Promise<{
  wordsCreated: number;
  definitionsCreated: number;
  examplesCreated: number;
  etymologiesCreated: number;
  idiomsCreated: number;
  errors: number;
  wordIdMap: Map<string, string>;
}> {
  let wordsCreated = 0;
  let definitionsCreated = 0;
  let examplesCreated = 0;
  let etymologiesCreated = 0;
  let idiomsCreated = 0;
  let errors = 0;

  // cyrillic -> wordId (for cross-reference lookup in Pass B)
  const wordIdMap = new Map<string, string>();

  const totalBatches = Math.ceil(entries.length / BATCH_SIZE);
  console.log(`\nPass A: Importing ${entries.length} entries in ${totalBatches} batches...`);

  for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
    const start = batchNum * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, entries.length);
    const batch = entries.slice(start, end);

    try {
      // Build array of Prisma create promises for this batch
      const creates = batch.map(entry => {
        const cyrillic = entry.headwordClean;
        const latin = cyrillicToLatin(cyrillic);

        // Definitions with nested examples
        const definitionsData = entry.definitions.map(def => ({
          definitionText: def.text,
          definitionNumber: def.number,
          subLetter: def.subLetter || null,
          domain: def.domain || null,
          register: def.register || null,
          source: SOURCE,
          ...(def.examples.length > 0
            ? {
                examples: {
                  create: def.examples.map(ex => ({
                    exampleText: ex.replace(/~/g, cyrillic),
                    source: SOURCE,
                  })),
                },
              }
            : {}),
        }));

        // Etymology
        const etymologyData = entry.etymology
          ? [{ originLanguage: entry.etymology, etymologyText: `Poreklo: ${entry.etymology}`, source: SOURCE }]
          : [];

        // Idioms
        const idiomsData = entry.idioms.map(phrase => ({
          phrase,
          source: SOURCE,
        }));

        return prisma.word.create({
          data: {
            word: cyrillic,
            cyrillic,
            latin,
            partOfSpeech: entry.partOfSpeech,
            gender: entry.gender || null,
            aspect: entry.aspect || null,
            homonymNumber: entry.homonymNumber || 0,
            rawText: entry.rawText || null,
            inflectionInfo: entry.inflectionInfo || null,
            source: SOURCE,
            isCommon: false,
            ...(definitionsData.length > 0 ? { definitions: { create: definitionsData } } : {}),
            ...(etymologyData.length > 0 ? { etymologies: { create: etymologyData } } : {}),
            ...(idiomsData.length > 0 ? { idioms: { create: idiomsData } } : {}),
          },
          select: { id: true, cyrillic: true, partOfSpeech: true, homonymNumber: true },
        });
      });

      const results = await prisma.$transaction(creates);

      // Update counts and build ID map
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const entry = batch[i];
        wordsCreated++;
        definitionsCreated += entry.definitions.length;
        examplesCreated += entry.definitions.reduce((sum, d) => sum + d.examples.length, 0);
        if (entry.etymology) etymologiesCreated++;
        idiomsCreated += entry.idioms.length;

        // Store in map with multiple key formats for flexible lookup
        wordIdMap.set(`${result.cyrillic}:${result.partOfSpeech}:${result.homonymNumber}`, result.id);
        // Simpler keys (first match wins)
        if (!wordIdMap.has(result.cyrillic)) {
          wordIdMap.set(result.cyrillic, result.id);
        }
      }
    } catch (batchError) {
      // Batch failed — fall back to individual inserts
      errors++;
      if (errors <= 3) {
        const errMsg = (batchError as Error).message || String(batchError);
        console.error(`  Batch ${batchNum + 1} failed, falling back to individual inserts:`);
        console.error(`    ${errMsg.substring(errMsg.indexOf('Unknown arg'), errMsg.indexOf('Unknown arg') + 300) || errMsg.substring(0, 500)}`);
      }

      for (const entry of batch) {
        try {
          const cyrillic = entry.headwordClean;
          const latin = cyrillicToLatin(cyrillic);

          const definitionsData = entry.definitions.map(def => ({
            definitionText: def.text,
            definitionNumber: def.number,
            subLetter: def.subLetter || null,
            domain: def.domain || null,
            register: def.register || null,
            source: SOURCE,
            ...(def.examples.length > 0
              ? {
                  examples: {
                    create: def.examples.map(ex => ({
                      exampleText: ex.replace(/~/g, cyrillic),
                      source: SOURCE,
                    })),
                  },
                }
              : {}),
          }));

          const etymologyData = entry.etymology
            ? [{ originLanguage: entry.etymology, etymologyText: `Poreklo: ${entry.etymology}`, source: SOURCE }]
            : [];

          const idiomsData = entry.idioms.map(phrase => ({ phrase, source: SOURCE }));

          const result = await prisma.word.create({
            data: {
              word: cyrillic,
              cyrillic,
              latin,
              partOfSpeech: entry.partOfSpeech,
              gender: entry.gender || null,
              aspect: entry.aspect || null,
              homonymNumber: entry.homonymNumber || 0,
              rawText: entry.rawText || null,
              inflectionInfo: entry.inflectionInfo || null,
              source: SOURCE,
              isCommon: false,
              ...(definitionsData.length > 0 ? { definitions: { create: definitionsData } } : {}),
              ...(etymologyData.length > 0 ? { etymologies: { create: etymologyData } } : {}),
              ...(idiomsData.length > 0 ? { idioms: { create: idiomsData } } : {}),
            },
            select: { id: true, cyrillic: true, partOfSpeech: true, homonymNumber: true },
          });

          wordsCreated++;
          definitionsCreated += entry.definitions.length;
          examplesCreated += entry.definitions.reduce((sum, d) => sum + d.examples.length, 0);
          if (entry.etymology) etymologiesCreated++;
          idiomsCreated += entry.idioms.length;

          wordIdMap.set(`${result.cyrillic}:${result.partOfSpeech}:${result.homonymNumber}`, result.id);
          if (!wordIdMap.has(result.cyrillic)) {
            wordIdMap.set(result.cyrillic, result.id);
          }
        } catch {
          // Unique constraint violation or other error — skip silently
        }
      }
    }

    if ((batchNum + 1) % 50 === 0 || batchNum === totalBatches - 1) {
      console.log(`  ${batchNum + 1}/${totalBatches} batches — ${wordsCreated} words, ${definitionsCreated} defs, ${examplesCreated} examples`);
    }
  }

  return { wordsCreated, definitionsCreated, examplesCreated, etymologiesCreated, idiomsCreated, errors, wordIdMap };
}

// --- Pass B: Resolve Cross-References ---

async function resolveCrossReferences(
  entries: ParsedEntry[],
  wordIdMap: Map<string, string>,
): Promise<{ resolved: number; failed: number }> {
  let resolved = 0;
  let failed = 0;

  const entriesWithRefs = entries.filter(e => e.crossReferences?.length > 0);
  console.log(`\nPass B: Resolving cross-references for ${entriesWithRefs.length} entries...`);

  const relations: Array<{ wordId: string; relatedWordId: string; relationType: string }> = [];
  const seen = new Set<string>();

  for (const entry of entriesWithRefs) {
    // Find source word ID
    const sourceId =
      wordIdMap.get(`${entry.headwordClean}:${entry.partOfSpeech}:${entry.homonymNumber || 0}`) ||
      wordIdMap.get(entry.headwordClean);

    if (!sourceId) {
      failed += entry.crossReferences.length;
      continue;
    }

    for (const ref of entry.crossReferences) {
      // Clean target: remove parentheticals, trailing punctuation, "и ..." alternatives
      let target = ref.target
        .replace(/\s*\(.*?\)/g, "")   // remove (1), (2) etc.
        .replace(/\s+и\s+.*/g, "")    // "азбука и алфабет" → "азбука"
        .replace(/[.,;:!?]/g, "")
        .trim()
        .toLowerCase();

      if (!target) {
        failed++;
        continue;
      }

      const targetId = wordIdMap.get(target);
      if (!targetId) {
        failed++;
        continue;
      }

      if (sourceId === targetId) continue;

      const relationType = ref.type === "see" ? "synonym" : "related";
      const key = `${sourceId}:${targetId}:${relationType}`;
      if (seen.has(key)) continue;
      seen.add(key);

      relations.push({ wordId: sourceId, relatedWordId: targetId, relationType });
    }
  }

  // Batch insert relations
  const REL_BATCH = 500;
  for (let i = 0; i < relations.length; i += REL_BATCH) {
    const batch = relations.slice(i, i + REL_BATCH);
    try {
      const result = await prisma.wordRelation.createMany({
        data: batch,
        skipDuplicates: true,
      });
      resolved += result.count;
    } catch {
      // Fall back to individual creates
      for (const rel of batch) {
        try {
          await prisma.wordRelation.create({ data: rel });
          resolved++;
        } catch {
          failed++;
        }
      }
    }
  }

  return { resolved, failed };
}

// --- Main ---

async function main(): Promise<void> {
  console.log("Matica Srpska Full Import");
  console.log("========================\n");

  const startTime = Date.now();

  try {
    const data = loadData();
    await truncateAll();

    // Pass A
    const result = await importEntries(data.entries);

    console.log("\n--- Pass A Results ---");
    console.log(`  Words created:       ${result.wordsCreated}`);
    console.log(`  Definitions created: ${result.definitionsCreated}`);
    console.log(`  Examples created:    ${result.examplesCreated}`);
    console.log(`  Etymologies created: ${result.etymologiesCreated}`);
    console.log(`  Idioms created:      ${result.idiomsCreated}`);
    console.log(`  Batch errors:        ${result.errors}`);

    // Pass B
    const crossRefs = await resolveCrossReferences(data.entries, result.wordIdMap);

    console.log("\n--- Pass B Results ---");
    console.log(`  Cross-refs resolved: ${crossRefs.resolved}`);
    console.log(`  Cross-refs failed:   ${crossRefs.failed}`);

    // Verification
    const counts = {
      words: await prisma.word.count(),
      definitions: await prisma.definition.count(),
      examples: await prisma.example.count(),
      etymologies: await prisma.etymology.count(),
      idioms: await prisma.idiom.count(),
      relations: await prisma.wordRelation.count(),
    };

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log("\n=== Final Database State ===");
    console.log(`  Words:          ${counts.words}`);
    console.log(`  Definitions:    ${counts.definitions}`);
    console.log(`  Examples:       ${counts.examples}`);
    console.log(`  Etymologies:    ${counts.etymologies}`);
    console.log(`  Idioms:         ${counts.idioms}`);
    console.log(`  Word Relations: ${counts.relations}`);
    console.log(`\n  Completed in ${elapsed}s`);
    console.log("\n[SUCCESS] Import complete!");
  } catch (error) {
    console.error("\n[ERROR] Import failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
