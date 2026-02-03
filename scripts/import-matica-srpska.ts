/**
 * Import Matica Srpska dictionary definitions into the database
 *
 * This script:
 * 1. Reads the parsed Matica Srpska data
 * 2. For words that exist in DB but lack definitions, adds the definitions
 * 3. For words that don't exist, creates new entries
 * 4. Adds etymology data where available
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

const INPUT_FILE = path.join(process.cwd(), "data", "processed", "matica-srpska-parsed.json");

interface MaticaEntry {
  headword: string;
  headwordClean: string;
  partOfSpeech: string;
  gender?: string;
  aspect?: string;
  etymology?: string;
  definitions: string[];
  fullText: string;
  source: string;
}

// Cyrillic to Latin transliteration
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

  return text.split('').map(c => map[c] || c).join('');
}

async function loadMaticaData(): Promise<MaticaEntry[]> {
  console.log(`Loading Matica Srpska data from ${INPUT_FILE}...`);

  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(`Input file not found: ${INPUT_FILE}. Run parse-matica-srpska.ts first.`);
  }

  const content = fs.readFileSync(INPUT_FILE, "utf-8");
  const entries: MaticaEntry[] = JSON.parse(content);

  console.log(`  Loaded ${entries.length} entries`);
  return entries;
}

async function main(): Promise<void> {
  console.log("Matica Srpska Dictionary Importer");
  console.log("==================================\n");

  try {
    // Load Matica data
    const entries = await loadMaticaData();

    // Get current database statistics
    const totalWords = await prisma.word.count();
    const wordsWithDefs = await prisma.word.count({
      where: {
        definitions: { some: {} }
      }
    });

    console.log(`\nCurrent database state:`);
    console.log(`  Total words: ${totalWords}`);
    console.log(`  Words with definitions: ${wordsWithDefs}`);
    console.log(`  Words without definitions: ${totalWords - wordsWithDefs}`);

    // Process entries
    let updatedWords = 0;
    let newDefinitions = 0;
    let newEtymologies = 0;
    let skippedNoMatch = 0;
    let alreadyHasDefs = 0;
    let errors = 0;

    console.log(`\nProcessing ${entries.length} Matica Srpska entries...`);

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      try {
        // Try to find matching word in database
        const existingWord = await prisma.word.findUnique({
          where: {
            cyrillic_partOfSpeech: {
              cyrillic: entry.headwordClean,
              partOfSpeech: entry.partOfSpeech,
            }
          },
          include: {
            definitions: true,
            etymologies: true,
          }
        });

        if (existingWord) {
          // Word exists - check if it needs definitions
          if (existingWord.definitions.length === 0 && entry.definitions.length > 0) {
            // Add definitions
            for (let defNum = 0; defNum < entry.definitions.length; defNum++) {
              await prisma.definition.create({
                data: {
                  wordId: existingWord.id,
                  definitionText: entry.definitions[defNum],
                  definitionNumber: defNum + 1,
                  source: "matica-srpska-2011",
                }
              });
              newDefinitions++;
            }
            updatedWords++;

            // Update word source to indicate Matica Srpska data was added
            await prisma.word.update({
              where: { id: existingWord.id },
              data: {
                source: existingWord.source
                  ? `${existingWord.source}, matica-srpska`
                  : "matica-srpska",
              }
            });
          } else if (existingWord.definitions.length > 0) {
            alreadyHasDefs++;
          }

          // Add etymology if available and not present
          if (entry.etymology && existingWord.etymologies.length === 0) {
            await prisma.etymology.create({
              data: {
                wordId: existingWord.id,
                originLanguage: entry.etymology,
                etymologyText: `Poreklo: ${entry.etymology}`,
                source: "matica-srpska-2011",
              }
            });
            newEtymologies++;
          }
        } else {
          // Word doesn't exist in database
          skippedNoMatch++;
        }
      } catch (error) {
        errors++;
        if (errors < 10) {
          console.error(`  Error processing "${entry.headwordClean}":`, error);
        }
      }

      if ((i + 1) % 2000 === 0) {
        console.log(`  Processed ${i + 1}/${entries.length} entries...`);
      }
    }

    console.log(`\nImport complete!`);
    console.log(`\nResults:`);
    console.log(`  Words updated with definitions: ${updatedWords}`);
    console.log(`  New definitions added: ${newDefinitions}`);
    console.log(`  New etymologies added: ${newEtymologies}`);
    console.log(`  Skipped (already has definitions): ${alreadyHasDefs}`);
    console.log(`  Skipped (no match in DB): ${skippedNoMatch}`);
    console.log(`  Errors: ${errors}`);

    // Final statistics
    const finalWordsWithDefs = await prisma.word.count({
      where: {
        definitions: { some: {} }
      }
    });
    const finalDefCount = await prisma.definition.count();
    const finalEtymCount = await prisma.etymology.count();

    console.log(`\nFinal database state:`);
    console.log(`  Words with definitions: ${finalWordsWithDefs} (was ${wordsWithDefs})`);
    console.log(`  Total definitions: ${finalDefCount}`);
    console.log(`  Total etymologies: ${finalEtymCount}`);

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
