/**
 * Parse srLex inflectional lexicon data
 *
 * srLex contains:
 * - Lemmas (base forms)
 * - Part of speech tags
 * - Full inflection paradigms
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { cyrillicToLatin, latinToCyrillic, isCyrillic, toBothScripts } from "../src/lib/transliterate";

const DATA_DIR = path.join(process.cwd(), "data", "raw");
const OUTPUT_DIR = path.join(process.cwd(), "data", "processed");

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

interface LexiconEntry {
  lemma: string;
  lemmaCyrillic: string;
  lemmaLatin: string;
  partOfSpeech: string;
  gender?: string;
  aspect?: string;
  inflections: InflectionEntry[];
}

interface InflectionEntry {
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
}

// Part of speech mapping from srLex tags
const posMapping: Record<string, string> = {
  N: "imenica",
  V: "glagol",
  A: "pridev",
  R: "prilog",
  P: "zamenica",
  S: "predlog",
  C: "veznik",
  I: "uzvik",
  M: "broj",
  Q: "čestica",
};

// Gender mapping
const genderMapping: Record<string, string> = {
  m: "muški",
  f: "ženski",
  n: "srednji",
};

// Case mapping
const caseMapping: Record<string, string> = {
  n: "nominativ",
  g: "genitiv",
  d: "dativ",
  a: "akuzativ",
  v: "vokativ",
  i: "instrumental",
  l: "lokativ",
};

// Number mapping
const numberMapping: Record<string, string> = {
  s: "jednina",
  p: "množina",
};

// Person mapping
const personMapping: Record<string, string> = {
  "1": "prvo",
  "2": "drugo",
  "3": "treće",
};

// Tense mapping
const tenseMapping: Record<string, string> = {
  r: "prezent",
  a: "aorist",
  m: "imperfekat",
  f: "futur",
  p: "particip",
};

function parseMorphologicalTag(tag: string): Partial<InflectionEntry> {
  const result: Partial<InflectionEntry> = {
    grammaticalInfo: tag,
  };

  // Parse the tag character by character
  // Format varies by POS, but generally:
  // Position 0: POS
  // Position 1: Type/Subtype
  // Position 2-3: Gender
  // Position 4: Number
  // Position 5: Case (for nouns/adj) or Person (for verbs)
  // etc.

  const chars = tag.split("");

  // Gender (usually position 2 or 3)
  for (const char of chars) {
    if (genderMapping[char]) {
      result.gender = genderMapping[char];
      break;
    }
  }

  // Number
  for (const char of chars) {
    if (numberMapping[char]) {
      result.number = numberMapping[char];
      break;
    }
  }

  // Case (for nouns, pronouns, adjectives)
  for (const char of chars) {
    if (caseMapping[char]) {
      result.case = caseMapping[char];
      break;
    }
  }

  // Person (for verbs)
  for (const char of chars) {
    if (personMapping[char]) {
      result.person = personMapping[char];
      break;
    }
  }

  // Tense (for verbs)
  for (const char of chars) {
    if (tenseMapping[char]) {
      result.tense = tenseMapping[char];
      break;
    }
  }

  return result;
}

async function parseSrLexFile(filepath: string): Promise<LexiconEntry[]> {
  const entries: Map<string, LexiconEntry> = new Map();

  const fileStream = fs.createReadStream(filepath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let lineCount = 0;

  for await (const line of rl) {
    lineCount++;

    if (lineCount % 100000 === 0) {
      console.log(`  Processed ${lineCount} lines...`);
    }

    // Skip empty lines and comments
    if (!line.trim() || line.startsWith("#")) continue;

    // srLex format: form<TAB>lemma<TAB>msd
    const parts = line.split("\t");
    if (parts.length < 3) continue;

    const [form, lemma, msd] = parts;

    // Get both script versions
    const { cyrillic: formCyrillic, latin: formLatin } = toBothScripts(form);
    const { cyrillic: lemmaCyrillic, latin: lemmaLatin } = toBothScripts(lemma);

    // Extract POS from MSD tag (first character)
    const posTag = msd[0];
    const partOfSpeech = posMapping[posTag] || "ostalo";

    // Create key for grouping inflections
    const entryKey = `${lemmaCyrillic}:${partOfSpeech}`;

    // Get or create entry
    let entry = entries.get(entryKey);
    if (!entry) {
      entry = {
        lemma: lemmaCyrillic,
        lemmaCyrillic,
        lemmaLatin,
        partOfSpeech,
        inflections: [],
      };

      // Extract gender for nouns
      if (partOfSpeech === "imenica" && msd.length > 2) {
        const genderChar = msd[2];
        if (genderMapping[genderChar]) {
          entry.gender = genderMapping[genderChar];
        }
      }

      // Extract aspect for verbs
      if (partOfSpeech === "glagol" && msd.length > 1) {
        const aspectChar = msd[1];
        if (aspectChar === "e") entry.aspect = "svršeni";
        if (aspectChar === "p") entry.aspect = "nesvršeni";
      }

      entries.set(entryKey, entry);
    }

    // Parse and add inflection
    const morphInfo = parseMorphologicalTag(msd);
    const inflection: InflectionEntry = {
      form,
      formCyrillic,
      formLatin,
      grammaticalInfo: msd,
      ...morphInfo,
    };

    // Avoid duplicate inflections
    const inflectionKey = `${formCyrillic}:${msd}`;
    const exists = entry.inflections.some(
      (inf) => `${inf.formCyrillic}:${inf.grammaticalInfo}` === inflectionKey
    );
    if (!exists) {
      entry.inflections.push(inflection);
    }
  }

  console.log(`  Total lines processed: ${lineCount}`);
  console.log(`  Unique lemmas found: ${entries.size}`);

  return Array.from(entries.values());
}

async function main(): Promise<void> {
  console.log("srLex Parser");
  console.log("============\n");

  // Find srLex data files
  const srLexDir = path.join(DATA_DIR, "srLex");

  if (!fs.existsSync(srLexDir)) {
    console.error("[ERROR] srLex directory not found. Run download-sources.ts first.");
    process.exit(1);
  }

  // Look for the main lexicon file
  const possibleFiles = [
    "srLex.txt",
    "srLex_v1.3.txt",
    "sr_full.txt",
    "lexicon.txt",
  ];

  let lexiconFile: string | null = null;

  // Search for any .txt file in the directory
  const files = fs.readdirSync(srLexDir);
  for (const file of files) {
    if (file.endsWith(".txt") || file.endsWith(".tsv")) {
      lexiconFile = path.join(srLexDir, file);
      break;
    }
  }

  // Also check subdirectories
  if (!lexiconFile) {
    for (const item of files) {
      const itemPath = path.join(srLexDir, item);
      if (fs.statSync(itemPath).isDirectory()) {
        const subFiles = fs.readdirSync(itemPath);
        for (const subFile of subFiles) {
          if (subFile.endsWith(".txt") || subFile.endsWith(".tsv")) {
            lexiconFile = path.join(itemPath, subFile);
            break;
          }
        }
      }
      if (lexiconFile) break;
    }
  }

  if (!lexiconFile) {
    console.error("[ERROR] No lexicon file found in srLex directory");
    console.log("Directory contents:", files);
    process.exit(1);
  }

  console.log(`Found lexicon file: ${lexiconFile}`);
  console.log("Parsing (this may take a while)...\n");

  const entries = await parseSrLexFile(lexiconFile);

  // Save to JSON
  const outputFile = path.join(OUTPUT_DIR, "srlex-parsed.json");
  console.log(`\nSaving to ${outputFile}...`);

  // Write in chunks to avoid memory issues
  const writeStream = fs.createWriteStream(outputFile);
  writeStream.write("[\n");

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const json = JSON.stringify(entry);
    writeStream.write(json);
    if (i < entries.length - 1) {
      writeStream.write(",\n");
    }
  }

  writeStream.write("\n]");
  writeStream.end();

  console.log("[SUCCESS] srLex parsing complete");
  console.log(`  Output: ${outputFile}`);
  console.log(`  Entries: ${entries.length}`);

  // Also save a summary
  const summaryFile = path.join(OUTPUT_DIR, "srlex-summary.json");
  const summary = {
    totalEntries: entries.length,
    totalInflections: entries.reduce((sum, e) => sum + e.inflections.length, 0),
    partOfSpeechCounts: {} as Record<string, number>,
  };

  for (const entry of entries) {
    summary.partOfSpeechCounts[entry.partOfSpeech] =
      (summary.partOfSpeechCounts[entry.partOfSpeech] || 0) + 1;
  }

  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  console.log(`  Summary: ${summaryFile}`);
}

main().catch(console.error);
