/**
 * Extract dictionary entries from Matica Srpska PDF to TSV format - Version 2
 *
 * Key improvements:
 * 1. Pre-processes text to join soft-hyphenated lines
 * 2. More flexible POS pattern matching
 * 3. Better entry boundary detection
 *
 * Output format (tab-separated):
 * ENTRY_NUM \t HEADWORD \t POS \t GENDER \t ASPECT \t ETYMOLOGY \t RAW_TEXT
 */

import * as fs from "fs";
import * as path from "path";

const INPUT_FILE = path.join(process.cwd(), "data", "raw", "matica-srpska", "recnik-raw.txt");
const OUTPUT_FILE = path.join(process.cwd(), "data", "processed", "matica-entries.tsv");

// Part of speech patterns - more flexible matching
const POS_PATTERNS: { pattern: RegExp; pos: string; gender?: string; aspect?: string }[] = [
  // Masculine nouns: word м or word, -suffix м
  { pattern: /^([а-яђћжшчџ][а-яђћжшчџ\-]*[¹²³⁴⁵⁶⁷⁸⁹⁰0-9]*)\s+м(\s|\(|,|\.|$)/, pos: "imenica", gender: "muški" },
  { pattern: /^([а-яђћжшчџ][а-яђћжшчџ\-]*[¹²³⁴⁵⁶⁷⁸⁹⁰0-9]*),\s*-[а-яђћжшчџ]+\s+м(\s|\(|,|\.|$)/, pos: "imenica", gender: "muški" },

  // Feminine nouns: word ж or word, -suffix ж
  { pattern: /^([а-яђћжшчџ][а-яђћжшчџ\-]*[¹²³⁴⁵⁶⁷⁸⁹⁰0-9]*)\s+ж(\s|\(|,|\.|$)/, pos: "imenica", gender: "ženski" },
  { pattern: /^([а-яђћжшчџ][а-яђћжшчџ\-]*[¹²³⁴⁵⁶⁷⁸⁹⁰0-9]*),\s*-[а-яђћжшчџ]+\s+ж(\s|\(|,|\.|$)/, pos: "imenica", gender: "ženski" },

  // Neuter nouns: word с or word, -suffix с
  { pattern: /^([а-яђћжшчџ][а-яђћжшчџ\-]*[¹²³⁴⁵⁶⁷⁸⁹⁰0-9]*)\s+с(\s|\(|,|\.|$)/, pos: "imenica", gender: "srednji" },
  { pattern: /^([а-яђћжшчџ][а-яђћжшчџ\-]*[¹²³⁴⁵⁶⁷⁸⁹⁰0-9]*),\s*-[а-яђћжшчџ]+\s+с(\s|\(|,|\.|$)/, pos: "imenica", gender: "srednji" },

  // Adjectives: word, -а, -о OR word, -suffix, -о (various suffixes like -лна, -вна, -чна, etc.)
  { pattern: /^([а-яђћжшчџ][а-яђћжшчџ\-]*[¹²³⁴⁵⁶⁷⁸⁹⁰0-9]*),\s*-[а-яђћжшчџ]*,\s*-о(\s|,|\(|$)/, pos: "pridev" },

  // Verbs: word, -suffix свр./несвр.
  { pattern: /^([а-яђћжшчџ][а-яђћжшчџ\-]*),\s*-[а-яђћжшчџёйЁЙ]+.*свр\.\s*и\s*несвр\./, pos: "glagol", aspect: "dvovidski" },
  { pattern: /^([а-яђћжшчџ][а-яђћжшчџ\-]*),\s*-[а-яђћжшчџёйЁЙ]+.*несвр\./, pos: "glagol", aspect: "nesvršeni" },
  { pattern: /^([а-яђћжшчџ][а-яђћжшчџ\-]*),\s*-[а-яђћжшчџёйЁЙ]+.*свр\./, pos: "glagol", aspect: "svršeni" },

  // Adverbs: word прил.
  { pattern: /^([а-яђћжшчџ][а-яђћжшчџ\-]*[¹²³⁴⁵⁶⁷⁸⁹⁰0-9]*)\s*прил[\.\s]/, pos: "prilog" },

  // Other POS
  { pattern: /^([а-яђћжшчџ][а-яђћжшчџ\-]*[¹²³⁴⁵⁶⁷⁸⁹⁰0-9]*)\s+узвик/, pos: "uzvik" },
  { pattern: /^([а-яђћжшчџ][а-яђћжшчџ\-]*[¹²³⁴⁵⁶⁷⁸⁹⁰0-9]*)\s+везн[\.\s]/, pos: "veznik" },
  { pattern: /^([а-яђћжшчџ][а-яђћжшчџ\-]*[¹²³⁴⁵⁶⁷⁸⁹⁰0-9]*)\s+предл[\.\s]/, pos: "predlog" },
  { pattern: /^([а-яђћжшчџ][а-яђћжшчџ\-]*[¹²³⁴⁵⁶⁷⁸⁹⁰0-9]*)\s+реч[\.\s]/, pos: "čestica" },
  { pattern: /^([а-яђћжшчџ][а-яђћжшчџ\-]*[¹²³⁴⁵⁶⁷⁸⁹⁰0-9]*)\s+бр[\.\s]/, pos: "broj" },
  { pattern: /^([а-яђћжшчџ][а-яђћжшчџ\-]*[¹²³⁴⁵⁶⁷⁸⁹⁰0-9]*)\s+зам[\.\s]/, pos: "zamenica" },
];

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
  // Pure page number
  if (/^\d+$/.test(trimmed)) return true;
  // Header like "WORD-WORD 123" at top of page
  if (/^[А-ЯЂЋЖШЧЏ\s\-]+\d+$/.test(trimmed)) return true;
  if (/^\d+\s+[А-ЯЂЋЖШЧЏ\s\-]+$/.test(trimmed)) return true;
  return false;
}

// Detect entry and extract info
function detectEntry(line: string): { headword: string; pos: string; gender?: string; aspect?: string } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 3) return null;
  if (isPageHeader(trimmed)) return null;
  if (!/^[а-яђћжшчџА-ЯЂЋЖШЧЏ]/.test(trimmed)) return null;

  // Try each pattern
  for (const { pattern, pos, gender, aspect } of POS_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      return {
        headword: cleanHeadword(match[1]),
        pos,
        gender,
        aspect,
      };
    }
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

// Escape for TSV
function escapeTsv(text: string): string {
  return text
    .replace(/\t/g, " ")
    .replace(/\n/g, " ")
    .replace(/\r/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Pre-process: join soft-hyphenated lines
function preprocessText(rawText: string): string[] {
  // Replace soft hyphen + newline with nothing (join words)
  // Soft hyphen is \u00AD (­)
  let processed = rawText.replace(/\u00AD\n/g, '');

  // Also handle regular hyphen at end of line (continuation)
  // But be careful - some lines end with hyphen as part of word
  // Only join if next line starts with lowercase
  processed = processed.replace(/-\n([а-яђћжшчџ])/g, '$1');

  return processed.split('\n');
}

async function main(): Promise<void> {
  console.log("Matica Srpska Entry Extractor v2");
  console.log("=================================\n");

  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(`Input file not found: ${INPUT_FILE}. Run PDF extraction first.`);
  }

  // Read entire file and preprocess
  console.log(`Reading and preprocessing ${INPUT_FILE}...`);
  const rawText = fs.readFileSync(INPUT_FILE, 'utf-8');
  const lines = preprocessText(rawText);
  console.log(`  Total lines after preprocessing: ${lines.length}`);

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
  let skippedIntro = false;
  let lineNum = 0;

  console.log(`Processing lines...`);

  for (const line of lines) {
    lineNum++;
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) continue;

    // Skip page headers
    if (isPageHeader(trimmed)) continue;

    // Skip intro pages (look for first entry starting with 'а')
    // The dictionary entries start around line 2000-3000
    if (!skippedIntro) {
      if (lineNum < 2000) continue;
      const detected = detectEntry(trimmed);
      if (detected && trimmed.toLowerCase().startsWith('а')) {
        skippedIntro = true;
        currentInfo = detected;
        currentEntry = trimmed;
        console.log(`  Found first entry at line ${lineNum}: ${detected.headword}`);
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

  console.log(`\nTotal lines processed: ${lineNum}`);
  console.log(`Total entries extracted: ${entries.length}`);

  // Write TSV file
  console.log(`\nWriting to ${OUTPUT_FILE}...`);

  const header = "ENTRY_NUM\tHEADWORD\tPOS\tGENDER\tASPECT\tETYMOLOGY\tRAW_TEXT";
  const tsvLines = entries.map(e =>
    `${e.num}\t${e.headword}\t${e.pos}\t${e.gender}\t${e.aspect}\t${e.etymology}\t${e.rawText}`
  );

  fs.writeFileSync(OUTPUT_FILE, header + "\n" + tsvLines.join("\n"), "utf-8");

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
