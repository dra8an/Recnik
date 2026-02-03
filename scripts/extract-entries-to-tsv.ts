/**
 * Extract dictionary entries from Matica Srpska PDF to TSV format
 *
 * Output format (tab-separated):
 * ENTRY_NUM \t HEADWORD \t POS \t GENDER \t ASPECT \t ETYMOLOGY \t RAW_TEXT
 *
 * This creates an intermediate file for validation before database import.
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

const INPUT_FILE = path.join(process.cwd(), "data", "raw", "matica-srpska", "recnik-raw.txt");
const OUTPUT_FILE = path.join(process.cwd(), "data", "processed", "matica-entries.tsv");

// Part of speech detection patterns
const POS_PATTERNS = {
  // Nouns: word м/ж/с
  noun_m: /^([а-яђћжшчџА-ЯЂЋЖШЧЏ][а-яђћжшчџ\-]*[¹²³⁴⁵⁶⁷⁸⁹⁰0-9]*),?\s+м[\s,\.(]/,
  noun_f: /^([а-яђћжшчџА-ЯЂЋЖШЧЏ][а-яђћжшчџ\-]*[¹²³⁴⁵⁶⁷⁸⁹⁰0-9]*),?\s+ж[\s,\.(]/,
  noun_n: /^([а-яђћжшчџА-ЯЂЋЖШЧЏ][а-яђћжшчџ\-]*[¹²³⁴⁵⁶⁷⁸⁹⁰0-9]*),?\s+с[\s,\.(]/,

  // Verbs: word, -suffix свр./несвр.
  verb: /^([а-яђћжшчџА-ЯЂЋЖШЧЏ][а-яђћжшчџ\-]*),\s+-[а-яђћжшчџ]+.*(свр\.|несвр\.)/,

  // Adjectives: word, -а, -о or word, -suffix, -о
  adjective: /^([а-яђћжшчџА-ЯЂЋЖШЧЏ][а-яђћжшчџ\-]*),\s+-[а-яђћжшчџ]*,\s+-о[\s,]/,

  // Adverbs: word прил.
  adverb: /^([а-яђћжшчџА-ЯЂЋЖШЧЏ][а-яђћжшчџ\-]*)\s+прил[\s\.]/,

  // Other parts of speech
  interjection: /^([а-яђћжшчџА-ЯЂЋЖШЧЏ][а-яђћжшчџ\-]*)\s+узвик/,
  conjunction: /^([а-яђћжшчџА-ЯЂЋЖШЧЏ][а-яђћжшчџ\-]*)\s+везн\./,
  preposition: /^([а-яђћжшчџА-ЯЂЋЖШЧЏ][а-яђћжшчџ\-]*)\s+предл\./,
  particle: /^([а-яђћжшчџА-ЯЂЋЖШЧЏ][а-яђћжшчџ\-]*)\s+реч\./,
  numeral: /^([а-яђћжшчџА-ЯЂЋЖШЧЏ][а-яђћжшчџ\-]*)\s+бр\./,
  pronoun: /^([а-яђћжшчџА-ЯЂЋЖШЧЏ][а-яђћжшчџ\-]*)\s+зам\./,
};

// Etymology patterns
const ETYMOLOGY_PATTERNS: [RegExp, string][] = [
  [/\sгрч\./, "grčki"],
  [/\sлат\./, "latinski"],
  [/\sфр\./, "francuski"],
  [/\sнем\./, "nemački"],
  [/\sитал\./, "italijanski"],
  [/\sтур\./, "turski"],
  [/\sенгл\./, "engleski"],
  [/\sмађ\./, "mađarski"],
  [/\sрус\./, "ruski"],
  [/\sшп\./, "španski"],
  [/\sараб\./, "arapski"],
  [/\sперс\./, "persijski"],
  [/\sјап\./, "japanski"],
  [/\sпорт\./, "portugalski"],
  [/\sхол\./, "holandski"],
  [/\sчеш\./, "češki"],
  [/\sпољ\./, "poljski"],
  [/\sалб\./, "albanski"],
];

// Check if line is a page header
function isPageHeader(line: string): boolean {
  const trimmed = line.trim();
  if (/^\d+$/.test(trimmed)) return true;
  if (/^[А-ЯЂЋЖШЧЏ\s\-]+\d+$/.test(trimmed)) return true;
  if (/^[А-ЯЂЋЖШЧЏ]+-[А-ЯЂЋЖШЧЏ]+\s*\d+$/.test(trimmed)) return true;
  return false;
}

// Detect entry and extract info
function detectEntry(line: string): { headword: string; pos: string; gender?: string; aspect?: string } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 3) return null;
  if (isPageHeader(trimmed)) return null;
  if (!/^[а-яђћжшчџА-ЯЂЋЖШЧЏ]/.test(trimmed)) return null;

  // Check each pattern
  let match;

  // Nouns
  if ((match = trimmed.match(POS_PATTERNS.noun_m))) {
    return { headword: cleanHeadword(match[1]), pos: "imenica", gender: "muški" };
  }
  if ((match = trimmed.match(POS_PATTERNS.noun_f))) {
    return { headword: cleanHeadword(match[1]), pos: "imenica", gender: "ženski" };
  }
  if ((match = trimmed.match(POS_PATTERNS.noun_n))) {
    return { headword: cleanHeadword(match[1]), pos: "imenica", gender: "srednji" };
  }

  // Adjectives (check before verbs - similar pattern)
  if ((match = trimmed.match(POS_PATTERNS.adjective))) {
    return { headword: cleanHeadword(match[1]), pos: "pridev" };
  }

  // Verbs
  if ((match = trimmed.match(POS_PATTERNS.verb))) {
    const aspect = trimmed.includes("свр.") && trimmed.includes("несвр.")
      ? "dvovidski"
      : trimmed.includes("свр.") ? "svršeni" : "nesvršeni";
    return { headword: cleanHeadword(match[1]), pos: "glagol", aspect };
  }

  // Adverbs
  if ((match = trimmed.match(POS_PATTERNS.adverb))) {
    return { headword: cleanHeadword(match[1]), pos: "prilog" };
  }

  // Other POS
  if ((match = trimmed.match(POS_PATTERNS.interjection))) {
    return { headword: cleanHeadword(match[1]), pos: "uzvik" };
  }
  if ((match = trimmed.match(POS_PATTERNS.conjunction))) {
    return { headword: cleanHeadword(match[1]), pos: "veznik" };
  }
  if ((match = trimmed.match(POS_PATTERNS.preposition))) {
    return { headword: cleanHeadword(match[1]), pos: "predlog" };
  }
  if ((match = trimmed.match(POS_PATTERNS.particle))) {
    return { headword: cleanHeadword(match[1]), pos: "čestica" };
  }
  if ((match = trimmed.match(POS_PATTERNS.numeral))) {
    return { headword: cleanHeadword(match[1]), pos: "broj" };
  }
  if ((match = trimmed.match(POS_PATTERNS.pronoun))) {
    return { headword: cleanHeadword(match[1]), pos: "zamenica" };
  }

  return null;
}

// Clean headword
function cleanHeadword(word: string): string {
  return word
    .replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰0-9]+$/, '')  // Remove homonym numbers
    .replace(/[,.:;!?]+$/, '')           // Remove trailing punctuation
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')     // Remove accent marks
    .normalize('NFC')
    .trim();
}

// Extract etymology from text
function extractEtymology(text: string): string {
  for (const [pattern, lang] of ETYMOLOGY_PATTERNS) {
    if (pattern.test(text)) {
      return lang;
    }
  }
  return "";
}

// Escape for TSV (replace tabs and newlines)
function escapeTsv(text: string): string {
  return text
    .replace(/\t/g, " ")
    .replace(/\n/g, " ")
    .replace(/\r/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function main(): Promise<void> {
  console.log("Matica Srpska Entry Extractor");
  console.log("=============================\n");

  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(`Input file not found: ${INPUT_FILE}. Run PDF extraction first.`);
  }

  const entries: {
    num: number;
    headword: string;
    pos: string;
    gender: string;
    aspect: string;
    etymology: string;
    rawText: string;
  }[] = [];

  let currentEntry = "";
  let currentInfo: { headword: string; pos: string; gender?: string; aspect?: string } | null = null;
  let linesProcessed = 0;
  let skippedIntro = false;

  const fileStream = fs.createReadStream(INPUT_FILE, { encoding: "utf-8" });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  console.log(`Reading from ${INPUT_FILE}...`);

  for await (const line of rl) {
    linesProcessed++;
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) continue;

    // Skip page headers
    if (isPageHeader(trimmed)) continue;

    // Skip intro pages (look for first entry starting with 'а')
    if (!skippedIntro) {
      if (linesProcessed < 3000) continue;
      const detected = detectEntry(trimmed);
      if (detected && trimmed.toLowerCase().startsWith('а')) {
        skippedIntro = true;
        currentInfo = detected;
        currentEntry = trimmed;
      }
      continue;
    }

    // Check if this line starts a new entry
    const detected = detectEntry(trimmed);

    if (detected) {
      // Save previous entry
      if (currentEntry && currentInfo) {
        entries.push({
          num: entries.length + 1,
          headword: currentInfo.headword,
          pos: currentInfo.pos,
          gender: currentInfo.gender || "",
          aspect: currentInfo.aspect || "",
          etymology: extractEtymology(currentEntry),
          rawText: escapeTsv(currentEntry),
        });

        if (entries.length % 10000 === 0) {
          console.log(`  Extracted ${entries.length} entries...`);
        }
      }

      // Start new entry
      currentInfo = detected;
      currentEntry = trimmed;
    } else {
      // Continue current entry
      currentEntry += " " + trimmed;
    }
  }

  // Save last entry
  if (currentEntry && currentInfo) {
    entries.push({
      num: entries.length + 1,
      headword: currentInfo.headword,
      pos: currentInfo.pos,
      gender: currentInfo.gender || "",
      aspect: currentInfo.aspect || "",
      etymology: extractEtymology(currentEntry),
      rawText: escapeTsv(currentEntry),
    });
  }

  console.log(`\nTotal lines processed: ${linesProcessed}`);
  console.log(`Total entries extracted: ${entries.length}`);

  // Write TSV file
  console.log(`\nWriting to ${OUTPUT_FILE}...`);

  const header = "ENTRY_NUM\tHEADWORD\tPOS\tGENDER\tASPECT\tETYMOLOGY\tRAW_TEXT";
  const lines = entries.map(e =>
    `${e.num}\t${e.headword}\t${e.pos}\t${e.gender}\t${e.aspect}\t${e.etymology}\t${e.rawText}`
  );

  fs.writeFileSync(OUTPUT_FILE, header + "\n" + lines.join("\n"), "utf-8");

  // Statistics
  console.log("\n[SUCCESS] Extraction complete!");
  console.log(`\nOutput: ${OUTPUT_FILE}`);
  console.log(`File size: ${(fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2)} MB`);

  // POS distribution
  const posCounts: Record<string, number> = {};
  for (const e of entries) {
    posCounts[e.pos] = (posCounts[e.pos] || 0) + 1;
  }

  console.log("\nPart of Speech distribution:");
  for (const [pos, count] of Object.entries(posCounts).sort((a, b) => b[1] - a[1])) {
    const pct = ((count / entries.length) * 100).toFixed(1);
    console.log(`  ${pos}: ${count} (${pct}%)`);
  }

  // Etymology distribution
  const etymCounts: Record<string, number> = {};
  for (const e of entries) {
    if (e.etymology) {
      etymCounts[e.etymology] = (etymCounts[e.etymology] || 0) + 1;
    }
  }

  console.log("\nEtymology distribution (top 10):");
  const etymSorted = Object.entries(etymCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  for (const [etym, count] of etymSorted) {
    console.log(`  ${etym}: ${count}`);
  }

  // Sample entries
  console.log("\nSample entries (first 5):");
  for (const e of entries.slice(0, 5)) {
    console.log(`  ${e.num}. ${e.headword} [${e.pos}] - ${e.rawText.substring(0, 60)}...`);
  }

  console.log("\nSample entries (random from middle):");
  const mid = Math.floor(entries.length / 2);
  for (const e of entries.slice(mid, mid + 5)) {
    console.log(`  ${e.num}. ${e.headword} [${e.pos}] - ${e.rawText.substring(0, 60)}...`);
  }
}

main().catch(console.error);
