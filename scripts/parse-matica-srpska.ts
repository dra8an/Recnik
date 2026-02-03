/**
 * Parse the Matica Srpska Dictionary (Rečnik srpskoga jezika 2011)
 *
 * This script parses the extracted text from the official Serbian dictionary PDF
 * and converts it into structured data for the database.
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

const INPUT_FILE = path.join(process.cwd(), "data", "raw", "matica-srpska", "recnik-raw.txt");
const OUTPUT_DIR = path.join(process.cwd(), "data", "processed");

// Etymology language mappings
const ETYMOLOGY_MAPPINGS: Record<string, string> = {
  "грч.": "grčki",
  "лат.": "latinski",
  "фр.": "francuski",
  "нем.": "nemački",
  "итал.": "italijanski",
  "тур.": "turski",
  "енгл.": "engleski",
  "мађ.": "mađarski",
  "рус.": "ruski",
  "шп.": "španski",
  "перс.": "persijski",
  "араб.": "arapski",
  "јап.": "japanski",
  "порт.": "portugalski",
  "хол.": "holandski",
  "чеш.": "češki",
  "пољ.": "poljski",
  "алб.": "albanski",
  "рум.": "rumunski",
};

interface ParsedEntry {
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

// Check if line is a page header (e.g., "WORD - WORD 123" or just "123")
function isPageHeader(line: string): boolean {
  const trimmed = line.trim();

  // Page number only
  if (/^\d+$/.test(trimmed)) return true;

  // WORD - WORD PAGE_NUM format (all caps with page number at end)
  if (/^[А-ЯЂЋЖШЧЏ\s\-]+\d+$/.test(trimmed)) return true;

  // WORD-WORD PAGE_NUM (no spaces)
  if (/^[А-ЯЂЋЖШЧЏ]+-[А-ЯЂЋЖШЧЏ]+\s*\d+$/.test(trimmed)) return true;

  return false;
}

// Check if this looks like an entry start
function isEntryStart(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 3) return false;

  // Skip page headers
  if (isPageHeader(trimmed)) return false;

  // Entry patterns:
  // word м - noun masculine
  // word ж - noun feminine
  // word с - noun neuter
  // word, -suffix свр./несвр. - verb
  // word прил. - adverb
  // word1 м - numbered homonym

  // Must start with lowercase Cyrillic (or uppercase for proper nouns)
  if (!/^[а-яђћжшчџА-ЯЂЋЖШЧЏ]/.test(trimmed)) return false;

  // Check for POS markers within first 80 characters
  const first80 = trimmed.substring(0, 80);

  const posPatterns = [
    /\sм\s/,           // masculine noun
    /\sж\s/,           // feminine noun
    /\sс\s/,           // neuter noun
    /\sм\(/,           // м (мн.
    /\sж\(/,           // ж (мн.
    /\sсвр\./,         // perfective verb
    /\sнесвр\./,       // imperfective verb
    /\sприл\./,        // adverb
    /\sприл$/,         // adverb at end
    /\sузвик/,         // interjection
    /\sвезн\./,        // conjunction
    /\sпредл\./,       // preposition
    /\sреч\./,         // particle
    /\sбр\./,          // numeral
    /\sзам\./,         // pronoun
  ];

  return posPatterns.some(pattern => pattern.test(first80));
}

// Clean and normalize headword
function cleanHeadword(word: string): string {
  // Remove superscript numbers (homonym markers)
  let clean = word.replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰0-9]+$/, '');

  // Remove trailing punctuation
  clean = clean.replace(/[,.:;!?]+$/, '');

  // Remove stress/accent marks (combining diacritical marks)
  clean = clean.normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC');

  return clean.trim();
}

// Extract headword and parse grammatical info
function parseEntry(text: string): ParsedEntry | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Split into words
  const words = trimmed.split(/\s+/);
  if (words.length < 2) return null;

  // First word is the headword (possibly with number suffix)
  const rawHeadword = words[0].replace(/,$/, '');
  const headword = cleanHeadword(rawHeadword);

  if (!headword || headword.length < 1) return null;

  // Find part of speech and other grammatical info
  let partOfSpeech = "";
  let gender: string | undefined;
  let aspect: string | undefined;
  let etymology: string | undefined;

  // Search through first 15 words for grammatical markers
  const searchLimit = Math.min(words.length, 20);
  let defStartIndex = 1;

  for (let i = 1; i < searchLimit; i++) {
    const word = words[i];
    const wordLower = word.toLowerCase();

    // Check for POS markers
    if (word === 'м' || word === 'м,' || word === 'м.') {
      partOfSpeech = 'imenica';
      gender = 'muški';
      defStartIndex = Math.max(defStartIndex, i + 1);
    } else if (word === 'ж' || word === 'ж,' || word === 'ж.') {
      partOfSpeech = 'imenica';
      gender = 'ženski';
      defStartIndex = Math.max(defStartIndex, i + 1);
    } else if (word === 'с' || word === 'с,' || word === 'с.') {
      partOfSpeech = 'imenica';
      gender = 'srednji';
      defStartIndex = Math.max(defStartIndex, i + 1);
    } else if (wordLower.includes('свр.') && wordLower.includes('несвр.')) {
      partOfSpeech = 'glagol';
      aspect = 'dvovidski';
      defStartIndex = Math.max(defStartIndex, i + 1);
    } else if (wordLower.includes('свр.') || word === 'свр') {
      partOfSpeech = 'glagol';
      aspect = 'svršeni';
      defStartIndex = Math.max(defStartIndex, i + 1);
    } else if (wordLower.includes('несвр.') || word === 'несвр') {
      partOfSpeech = 'glagol';
      aspect = 'nesvršeni';
      defStartIndex = Math.max(defStartIndex, i + 1);
    } else if (wordLower === 'прил.' || wordLower === 'прил') {
      partOfSpeech = 'prilog';
      defStartIndex = Math.max(defStartIndex, i + 1);
    } else if (wordLower === 'узвик') {
      partOfSpeech = 'uzvik';
      defStartIndex = Math.max(defStartIndex, i + 1);
    } else if (wordLower === 'везн.' || wordLower === 'везн') {
      partOfSpeech = 'veznik';
      defStartIndex = Math.max(defStartIndex, i + 1);
    } else if (wordLower === 'предл.' || wordLower === 'предл') {
      partOfSpeech = 'predlog';
      defStartIndex = Math.max(defStartIndex, i + 1);
    } else if (wordLower === 'реч.' || wordLower === 'реч') {
      partOfSpeech = 'cestica';
      defStartIndex = Math.max(defStartIndex, i + 1);
    } else if (wordLower === 'бр.' || wordLower === 'бр') {
      partOfSpeech = 'broj';
      defStartIndex = Math.max(defStartIndex, i + 1);
    } else if (wordLower === 'зам.' || wordLower === 'зам') {
      partOfSpeech = 'zamenica';
      defStartIndex = Math.max(defStartIndex, i + 1);
    }

    // Check for etymology markers
    for (const [marker, lang] of Object.entries(ETYMOLOGY_MAPPINGS)) {
      if (word === marker || word.startsWith(marker)) {
        etymology = lang;
        defStartIndex = Math.max(defStartIndex, i + 1);
        break;
      }
    }

    // Stop if we found POS
    if (partOfSpeech && (etymology || i > 10)) break;
  }

  // Skip entries without POS
  if (!partOfSpeech) return null;

  // Extract definition text (everything after grammatical info)
  const defWords = words.slice(defStartIndex);
  let definitionText = defWords.join(' ');

  // Clean up definition text
  // Remove cross-references at the very end
  definitionText = definitionText.replace(/;\s*в\.\s*[а-яђћжшчџ\-]+\s*\.?\s*$/i, '');

  // Split by definition numbers if present
  const definitions: string[] = [];

  // Check for numbered definitions (1., 2., a., b.)
  const defParts = definitionText.split(/(?:^|\s)([1-9]\.|[а-гд]\.)\s/);

  if (defParts.length > 2) {
    // Multiple definitions
    for (let i = 1; i < defParts.length; i += 2) {
      const num = defParts[i];
      const content = defParts[i + 1]?.trim();
      if (content && content.length > 5) {
        definitions.push(content.split('•')[0].trim()); // Remove expressions
      }
    }
  } else if (definitionText.length > 5) {
    // Single definition
    definitions.push(definitionText.split('•')[0].trim());
  }

  // Clean definitions - remove trailing references
  const cleanedDefs = definitions.map(def => {
    let cleaned = def;
    // Remove "уп." references
    cleaned = cleaned.replace(/;\s*уп\.\s*[а-яђћжшчџ\-\s]+$/i, '');
    // Remove trailing punctuation artifacts
    cleaned = cleaned.replace(/[;,]\s*$/, '').trim();
    // Limit length
    if (cleaned.length > 500) cleaned = cleaned.substring(0, 500) + '...';
    return cleaned;
  }).filter(d => d.length > 3);

  if (cleanedDefs.length === 0) {
    // Try to extract something from the full text
    if (definitionText.length > 10) {
      cleanedDefs.push(definitionText.substring(0, Math.min(300, definitionText.length)));
    } else {
      return null;
    }
  }

  return {
    headword: rawHeadword,
    headwordClean: headword,
    partOfSpeech,
    gender,
    aspect,
    etymology,
    definitions: cleanedDefs,
    fullText: trimmed.substring(0, 500),
    source: "matica-srpska-2011",
  };
}

async function parseFile(): Promise<ParsedEntry[]> {
  console.log(`Reading from ${INPUT_FILE}...`);

  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(`Input file not found: ${INPUT_FILE}`);
  }

  const entries: ParsedEntry[] = [];
  const seenHeadwords = new Set<string>();
  let currentEntry = "";
  let linesProcessed = 0;
  let entriesFound = 0;
  let skippedIntro = false;

  const fileStream = fs.createReadStream(INPUT_FILE, { encoding: "utf-8" });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    linesProcessed++;

    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) continue;

    // Skip page headers
    if (isPageHeader(trimmed)) continue;

    // Skip intro pages (before the letter А section)
    if (!skippedIntro) {
      // Look for the start of dictionary entries (around line 3000+ for letter А)
      if (linesProcessed < 3500) continue;
      if (trimmed.startsWith('а') && isEntryStart(trimmed)) {
        skippedIntro = true;
      } else {
        continue;
      }
    }

    // Check if this line starts a new entry
    if (isEntryStart(trimmed)) {
      // Process previous entry
      if (currentEntry) {
        const parsed = parseEntry(currentEntry);
        if (parsed) {
          // Avoid duplicates
          const key = `${parsed.headwordClean}:${parsed.partOfSpeech}`;
          if (!seenHeadwords.has(key)) {
            seenHeadwords.add(key);
            entries.push(parsed);
            entriesFound++;

            if (entriesFound % 5000 === 0) {
              console.log(`  Parsed ${entriesFound} entries...`);
            }
          }
        }
      }

      // Start new entry
      currentEntry = trimmed;
    } else {
      // Continue current entry (append line)
      currentEntry += " " + trimmed;
    }
  }

  // Process last entry
  if (currentEntry) {
    const parsed = parseEntry(currentEntry);
    if (parsed) {
      const key = `${parsed.headwordClean}:${parsed.partOfSpeech}`;
      if (!seenHeadwords.has(key)) {
        entries.push(parsed);
      }
    }
  }

  console.log(`Total lines processed: ${linesProcessed}`);
  console.log(`Total entries parsed: ${entries.length}`);

  return entries;
}

async function main(): Promise<void> {
  console.log("Matica Srpska Dictionary Parser");
  console.log("================================\n");

  try {
    const entries = await parseFile();

    // Statistics
    const withEtymology = entries.filter(e => e.etymology).length;

    console.log("\nStatistics:");
    console.log(`  Total entries: ${entries.length}`);
    console.log(`  With etymology: ${withEtymology}`);

    // Count by POS
    const posCounts: Record<string, number> = {};
    for (const entry of entries) {
      posCounts[entry.partOfSpeech] = (posCounts[entry.partOfSpeech] || 0) + 1;
    }
    console.log("\nBy part of speech:");
    for (const [pos, count] of Object.entries(posCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${pos}: ${count}`);
    }

    // Count by etymology
    const etymCounts: Record<string, number> = {};
    for (const entry of entries) {
      if (entry.etymology) {
        etymCounts[entry.etymology] = (etymCounts[entry.etymology] || 0) + 1;
      }
    }
    console.log("\nBy etymology (top 10):");
    const sortedEtym = Object.entries(etymCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    for (const [etym, count] of sortedEtym) {
      console.log(`  ${etym}: ${count}`);
    }

    // Save output
    const outputFile = path.join(OUTPUT_DIR, "matica-srpska-parsed.json");
    console.log(`\nSaving to ${outputFile}...`);

    // Write in streaming fashion
    const writeStream = fs.createWriteStream(outputFile);
    writeStream.write("[\n");

    for (let i = 0; i < entries.length; i++) {
      writeStream.write(JSON.stringify(entries[i]));
      if (i < entries.length - 1) {
        writeStream.write(",\n");
      }
    }

    writeStream.write("\n]");
    writeStream.end();

    // Save summary
    const summaryFile = path.join(OUTPUT_DIR, "matica-srpska-summary.json");
    fs.writeFileSync(summaryFile, JSON.stringify({
      totalEntries: entries.length,
      withEtymology,
      partOfSpeechCounts: posCounts,
      etymologyCounts: etymCounts,
      source: "Rečnik srpskoga jezika, Matica srpska, 2011",
    }, null, 2));

    console.log("[SUCCESS] Parsing complete!");

    // Show sample entries
    console.log("\nSample entries:");
    for (const entry of entries.slice(0, 5)) {
      console.log(`\n  ${entry.headwordClean} (${entry.partOfSpeech}${entry.gender ? ', ' + entry.gender : ''})`);
      if (entry.etymology) console.log(`    Etymology: ${entry.etymology}`);
      console.log(`    Definition: ${entry.definitions[0]?.substring(0, 100)}...`);
    }

  } catch (error) {
    console.error("\n[ERROR] Parsing failed:", error);
    throw error;
  }
}

main().catch(console.error);
