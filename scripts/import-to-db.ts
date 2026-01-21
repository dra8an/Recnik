/**
 * Import merged dictionary data into PostgreSQL via Prisma
 */

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const OUTPUT_DIR = path.join(process.cwd(), "data", "processed");

interface MergedEntry {
  word: string;
  cyrillic: string;
  latin: string;
  partOfSpeech: string;
  gender?: string;
  aspect?: string;
  definitions: {
    text: string;
    examples: string[];
  }[];
  inflections: {
    form: string;
    formCyrillic: string;
    formLatin: string;
    grammaticalInfo: string;
    case?: string;
    number?: string;
    gender?: string;
    person?: string;
    tense?: string;
    mood?: string;
  }[];
  pronunciation?: {
    ipa?: string;
    syllables?: string;
  };
  etymology?: string;
  synonyms: string[];
  antonyms: string[];
  source: string[];
}

// Common words list (approximate - words that appear frequently in text)
const commonWordsList = new Set([
  // Most common Serbian words
  "и", "је", "у", "да", "се", "на", "за", "не", "од", "са",
  "као", "али", "или", "бити", "то", "ја", "он", "она", "ми",
  "они", "ово", "оно", "што", "који", "када", "где", "како",
  "овај", "тај", "онај", "све", "сви", "неки", "много", "мало",
  "добар", "велик", "мали", "нов", "стар", "леп", "млад",
  "имати", "моћи", "хтети", "знати", "видети", "рећи", "дати",
  "ићи", "доћи", "узети", "ставити", "радити", "мислити",
  "човек", "жена", "деца", "дан", "ноћ", "година", "време",
  "место", "свет", "живот", "рад", "реч", "питање", "страна",
  "глава", "рука", "око", "срце", "кућа", "пут", "вода", "земља",
]);

function isCommonWord(word: string): boolean {
  return commonWordsList.has(word.toLowerCase());
}

async function loadMergedData(): Promise<MergedEntry[]> {
  const filepath = path.join(OUTPUT_DIR, "merged-dictionary.json");

  if (!fs.existsSync(filepath)) {
    throw new Error(`Merged data file not found: ${filepath}. Run merge-data.ts first.`);
  }

  console.log(`Loading merged data from ${filepath}...`);
  const content = fs.readFileSync(filepath, "utf-8");
  return JSON.parse(content);
}

async function clearDatabase(): Promise<void> {
  console.log("Clearing existing data...");

  // Delete in correct order due to foreign key constraints
  await prisma.wordOfDay.deleteMany();
  await prisma.wordRelation.deleteMany();
  await prisma.etymology.deleteMany();
  await prisma.pronunciation.deleteMany();
  await prisma.inflection.deleteMany();
  await prisma.example.deleteMany();
  await prisma.definition.deleteMany();
  await prisma.word.deleteMany();

  console.log("Database cleared.");
}

async function importWords(entries: MergedEntry[]): Promise<Map<string, string>> {
  console.log(`\nImporting ${entries.length} words...`);

  const wordIdMap = new Map<string, string>();
  const batchSize = 500;
  let imported = 0;

  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);

    const createPromises = batch.map(async (entry, batchIndex) => {
      try {
        const word = await prisma.word.create({
          data: {
            word: entry.cyrillic,
            cyrillic: entry.cyrillic,
            latin: entry.latin,
            partOfSpeech: entry.partOfSpeech,
            gender: entry.gender,
            aspect: entry.aspect,
            isCommon: isCommonWord(entry.cyrillic),
            source: entry.source.join(", "),
          },
        });

        const key = `${entry.cyrillic}:${entry.partOfSpeech}`;
        wordIdMap.set(key, word.id);

        return word;
      } catch (error) {
        // Handle duplicate entries gracefully
        console.error(`Error importing word "${entry.cyrillic}":`, error);
        return null;
      }
    });

    await Promise.all(createPromises);

    imported += batch.length;
    console.log(`  Imported ${imported}/${entries.length} words`);
  }

  return wordIdMap;
}

async function importDefinitions(
  entries: MergedEntry[],
  wordIdMap: Map<string, string>
): Promise<void> {
  console.log("\nImporting definitions...");

  let imported = 0;
  let examples = 0;

  for (const entry of entries) {
    const key = `${entry.cyrillic}:${entry.partOfSpeech}`;
    const wordId = wordIdMap.get(key);

    if (!wordId || entry.definitions.length === 0) continue;

    for (let i = 0; i < entry.definitions.length; i++) {
      const def = entry.definitions[i];

      try {
        const definition = await prisma.definition.create({
          data: {
            wordId,
            definitionText: def.text,
            definitionNumber: i + 1,
            source: entry.source.includes("wiktionary") ? "wiktionary" : "srLex",
          },
        });

        imported++;

        // Import examples for this definition
        if (def.examples.length > 0) {
          await prisma.example.createMany({
            data: def.examples.map((exampleText) => ({
              definitionId: definition.id,
              exampleText,
              source: "wiktionary",
            })),
          });
          examples += def.examples.length;
        }
      } catch (error) {
        console.error(`Error importing definition for "${entry.cyrillic}":`, error);
      }
    }
  }

  console.log(`  Imported ${imported} definitions, ${examples} examples`);
}

async function importInflections(
  entries: MergedEntry[],
  wordIdMap: Map<string, string>
): Promise<void> {
  console.log("\nImporting inflections...");

  let imported = 0;
  const batchSize = 1000;
  const allInflections: {
    wordId: string;
    form: string;
    formCyrillic: string;
    formLatin: string;
    grammaticalInfo: string;
    case?: string;
    number?: string;
    gender?: string;
    person?: string;
    tense?: string;
    mood?: string;
  }[] = [];

  for (const entry of entries) {
    const key = `${entry.cyrillic}:${entry.partOfSpeech}`;
    const wordId = wordIdMap.get(key);

    if (!wordId || entry.inflections.length === 0) continue;

    for (const inf of entry.inflections) {
      allInflections.push({
        wordId,
        form: inf.form,
        formCyrillic: inf.formCyrillic,
        formLatin: inf.formLatin,
        grammaticalInfo: inf.grammaticalInfo,
        case: inf.case,
        number: inf.number,
        gender: inf.gender,
        person: inf.person,
        tense: inf.tense,
        mood: inf.mood,
      });
    }
  }

  console.log(`  Total inflections to import: ${allInflections.length}`);

  // Batch insert
  for (let i = 0; i < allInflections.length; i += batchSize) {
    const batch = allInflections.slice(i, i + batchSize);

    await prisma.inflection.createMany({
      data: batch,
      skipDuplicates: true,
    });

    imported += batch.length;
    if (imported % 10000 === 0) {
      console.log(`  Imported ${imported}/${allInflections.length} inflections`);
    }
  }

  console.log(`  Imported ${imported} inflections`);
}

async function importPronunciations(
  entries: MergedEntry[],
  wordIdMap: Map<string, string>
): Promise<void> {
  console.log("\nImporting pronunciations...");

  let imported = 0;

  for (const entry of entries) {
    if (!entry.pronunciation?.ipa && !entry.pronunciation?.syllables) continue;

    const key = `${entry.cyrillic}:${entry.partOfSpeech}`;
    const wordId = wordIdMap.get(key);

    if (!wordId) continue;

    try {
      await prisma.pronunciation.create({
        data: {
          wordId,
          ipa: entry.pronunciation.ipa,
          syllables: entry.pronunciation.syllables,
          source: "wiktionary",
        },
      });
      imported++;
    } catch (error) {
      // Ignore duplicate errors
    }
  }

  console.log(`  Imported ${imported} pronunciations`);
}

async function importEtymologies(
  entries: MergedEntry[],
  wordIdMap: Map<string, string>
): Promise<void> {
  console.log("\nImporting etymologies...");

  let imported = 0;

  for (const entry of entries) {
    if (!entry.etymology) continue;

    const key = `${entry.cyrillic}:${entry.partOfSpeech}`;
    const wordId = wordIdMap.get(key);

    if (!wordId) continue;

    try {
      await prisma.etymology.create({
        data: {
          wordId,
          etymologyText: entry.etymology,
          source: "wiktionary",
        },
      });
      imported++;
    } catch (error) {
      // Ignore duplicate errors
    }
  }

  console.log(`  Imported ${imported} etymologies`);
}

async function importWordRelations(
  entries: MergedEntry[],
  wordIdMap: Map<string, string>
): Promise<void> {
  console.log("\nImporting word relations (synonyms/antonyms)...");

  let synonymsImported = 0;
  let antonymsImported = 0;

  for (const entry of entries) {
    const key = `${entry.cyrillic}:${entry.partOfSpeech}`;
    const wordId = wordIdMap.get(key);

    if (!wordId) continue;

    // Import synonyms
    for (const synonym of entry.synonyms) {
      // Try to find the related word in the database
      // First check with same POS, then any POS
      let relatedWordId: string | undefined;

      const synonymKey = `${synonym}:${entry.partOfSpeech}`;
      relatedWordId = wordIdMap.get(synonymKey);

      if (!relatedWordId) {
        // Try to find any word with this name
        for (const [k, v] of wordIdMap) {
          if (k.startsWith(synonym + ":")) {
            relatedWordId = v;
            break;
          }
        }
      }

      if (relatedWordId && relatedWordId !== wordId) {
        try {
          await prisma.wordRelation.create({
            data: {
              wordId,
              relatedWordId,
              relationType: "synonym",
            },
          });
          synonymsImported++;
        } catch (error) {
          // Ignore duplicate errors
        }
      }
    }

    // Import antonyms
    for (const antonym of entry.antonyms) {
      let relatedWordId: string | undefined;

      const antonymKey = `${antonym}:${entry.partOfSpeech}`;
      relatedWordId = wordIdMap.get(antonymKey);

      if (!relatedWordId) {
        for (const [k, v] of wordIdMap) {
          if (k.startsWith(antonym + ":")) {
            relatedWordId = v;
            break;
          }
        }
      }

      if (relatedWordId && relatedWordId !== wordId) {
        try {
          await prisma.wordRelation.create({
            data: {
              wordId,
              relatedWordId,
              relationType: "antonym",
            },
          });
          antonymsImported++;
        } catch (error) {
          // Ignore duplicate errors
        }
      }
    }
  }

  console.log(`  Imported ${synonymsImported} synonyms, ${antonymsImported} antonyms`);
}

async function main(): Promise<void> {
  console.log("Database Importer");
  console.log("=================\n");

  try {
    // Load merged data
    const entries = await loadMergedData();
    console.log(`Loaded ${entries.length} entries`);

    // Clear existing data
    await clearDatabase();

    // Import words first
    const wordIdMap = await importWords(entries);

    // Import related data
    await importDefinitions(entries, wordIdMap);
    await importInflections(entries, wordIdMap);
    await importPronunciations(entries, wordIdMap);
    await importEtymologies(entries, wordIdMap);
    await importWordRelations(entries, wordIdMap);

    // Update frequency ranks based on common words
    console.log("\nUpdating frequency ranks...");
    let rank = 1;
    for (const [key, wordId] of wordIdMap) {
      const word = key.split(":")[0];
      if (isCommonWord(word)) {
        await prisma.word.update({
          where: { id: wordId },
          data: { frequencyRank: rank++ },
        });
      }
    }
    console.log(`  Set frequency rank for ${rank - 1} common words`);

    console.log("\n[SUCCESS] Database import complete!");

    // Print final statistics
    const wordCount = await prisma.word.count();
    const defCount = await prisma.definition.count();
    const inflCount = await prisma.inflection.count();
    const pronCount = await prisma.pronunciation.count();
    const etymCount = await prisma.etymology.count();
    const relCount = await prisma.wordRelation.count();

    console.log("\nDatabase Statistics:");
    console.log(`  Words: ${wordCount}`);
    console.log(`  Definitions: ${defCount}`);
    console.log(`  Inflections: ${inflCount}`);
    console.log(`  Pronunciations: ${pronCount}`);
    console.log(`  Etymologies: ${etymCount}`);
    console.log(`  Word Relations: ${relCount}`);
  } catch (error) {
    console.error("\n[ERROR] Import failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
