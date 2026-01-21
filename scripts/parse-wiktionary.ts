/**
 * Parse putnich/sr-sh-nlp Wiktionary data
 *
 * This repository contains:
 * - Definitions extracted from Serbian Wiktionary
 * - Synonyms
 * - Pronunciation (IPA, syllables)
 */

import * as fs from "fs";
import * as path from "path";
import { parseString } from "xml2js";
import { promisify } from "util";
import { toBothScripts } from "../src/lib/transliterate";

const parseXml = promisify(parseString);

const DATA_DIR = path.join(process.cwd(), "data", "raw");
const OUTPUT_DIR = path.join(process.cwd(), "data", "processed");

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

interface WiktionaryEntry {
  word: string;
  wordCyrillic: string;
  wordLatin: string;
  partOfSpeech: string;
  definitions: string[];
  synonyms: string[];
  antonyms: string[];
  ipa?: string;
  syllables?: string;
  etymology?: string;
  examples: string[];
}

// Part of speech mapping from Wiktionary categories
const posMapping: Record<string, string> = {
  noun: "imenica",
  verb: "glagol",
  adjective: "pridev",
  adverb: "prilog",
  pronoun: "zamenica",
  preposition: "predlog",
  conjunction: "veznik",
  interjection: "uzvik",
  numeral: "broj",
  particle: "čestica",
  imenica: "imenica",
  glagol: "glagol",
  pridjev: "pridev",
  pridev: "pridev",
  prilog: "prilog",
  zamjenica: "zamenica",
  zamenica: "zamenica",
  prijedlog: "predlog",
  predlog: "predlog",
  veznik: "veznik",
  uzvik: "uzvik",
  broj: "broj",
  čestica: "čestica",
};

async function parseJsonFile(filepath: string): Promise<WiktionaryEntry[]> {
  const entries: WiktionaryEntry[] = [];

  try {
    const content = fs.readFileSync(filepath, "utf-8");
    const data = JSON.parse(content);

    if (Array.isArray(data)) {
      for (const item of data) {
        const entry = parseWiktionaryItem(item);
        if (entry) entries.push(entry);
      }
    } else if (typeof data === "object") {
      // Handle object with word keys
      for (const [word, value] of Object.entries(data)) {
        const entry = parseWiktionaryItem({ word, ...value as object });
        if (entry) entries.push(entry);
      }
    }
  } catch (error) {
    console.error(`Error parsing ${filepath}:`, error);
  }

  return entries;
}

function parseWiktionaryItem(item: Record<string, unknown>): WiktionaryEntry | null {
  if (!item.word && !item.lemma && !item.title) return null;

  const word = String(item.word || item.lemma || item.title);
  const { cyrillic, latin } = toBothScripts(word);

  // Determine part of speech
  let partOfSpeech = "imenica"; // default
  if (item.pos || item.part_of_speech || item.category) {
    const posRaw = String(item.pos || item.part_of_speech || item.category).toLowerCase();
    partOfSpeech = posMapping[posRaw] || posRaw;
  }

  // Extract definitions
  let definitions: string[] = [];
  if (item.definitions) {
    if (Array.isArray(item.definitions)) {
      definitions = item.definitions.map(String).filter(Boolean);
    } else if (typeof item.definitions === "string") {
      definitions = [item.definitions];
    }
  } else if (item.definition) {
    definitions = [String(item.definition)];
  } else if (item.meaning) {
    if (Array.isArray(item.meaning)) {
      definitions = item.meaning.map(String).filter(Boolean);
    } else {
      definitions = [String(item.meaning)];
    }
  }

  // Extract synonyms
  let synonyms: string[] = [];
  if (item.synonyms) {
    if (Array.isArray(item.synonyms)) {
      synonyms = item.synonyms.map(String).filter(Boolean);
    } else if (typeof item.synonyms === "string") {
      synonyms = item.synonyms.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean);
    }
  }

  // Extract antonyms
  let antonyms: string[] = [];
  if (item.antonyms) {
    if (Array.isArray(item.antonyms)) {
      antonyms = item.antonyms.map(String).filter(Boolean);
    } else if (typeof item.antonyms === "string") {
      antonyms = item.antonyms.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean);
    }
  }

  // Extract examples
  let examples: string[] = [];
  if (item.examples) {
    if (Array.isArray(item.examples)) {
      examples = item.examples.map(String).filter(Boolean);
    } else if (typeof item.examples === "string") {
      examples = [item.examples];
    }
  }

  // Extract pronunciation
  let ipa: string | undefined;
  let syllables: string | undefined;

  if (item.pronunciation) {
    if (typeof item.pronunciation === "string") {
      ipa = item.pronunciation;
    } else if (typeof item.pronunciation === "object") {
      const pron = item.pronunciation as Record<string, unknown>;
      ipa = String(pron.ipa || pron.IPA || "");
    }
  }
  if (item.ipa) ipa = String(item.ipa);
  if (item.syllables) syllables = String(item.syllables);

  // Extract etymology
  let etymology: string | undefined;
  if (item.etymology) {
    etymology = String(item.etymology);
  }

  return {
    word,
    wordCyrillic: cyrillic,
    wordLatin: latin,
    partOfSpeech,
    definitions,
    synonyms,
    antonyms,
    ipa,
    syllables,
    etymology,
    examples,
  };
}

async function parseTeiXml(filepath: string): Promise<WiktionaryEntry[]> {
  const entries: WiktionaryEntry[] = [];

  try {
    const content = fs.readFileSync(filepath, "utf-8");
    const result = await parseXml(content);

    // Navigate TEI structure
    const body = result?.TEI?.text?.[0]?.body?.[0];
    if (!body) return entries;

    const entryElements = body.entry || body.div || [];

    for (const entry of entryElements) {
      const word = entry.$?.n || entry.form?.[0]?.orth?.[0] || "";
      if (!word) continue;

      const { cyrillic, latin } = toBothScripts(word);

      // Extract POS
      let partOfSpeech = "imenica";
      if (entry.gramGrp?.[0]?.pos?.[0]) {
        const posRaw = entry.gramGrp[0].pos[0].toLowerCase();
        partOfSpeech = posMapping[posRaw] || posRaw;
      }

      // Extract definitions from sense elements
      const definitions: string[] = [];
      const senses = entry.sense || [];
      for (const sense of senses) {
        if (sense.def?.[0]) {
          definitions.push(sense.def[0]);
        }
      }

      // Extract examples
      const examples: string[] = [];
      for (const sense of senses) {
        if (sense.cit) {
          for (const cit of sense.cit) {
            if (cit.quote?.[0]) {
              examples.push(cit.quote[0]);
            }
          }
        }
      }

      // Extract pronunciation
      let ipa: string | undefined;
      if (entry.form?.[0]?.pron?.[0]) {
        ipa = entry.form[0].pron[0];
      }

      entries.push({
        word,
        wordCyrillic: cyrillic,
        wordLatin: latin,
        partOfSpeech,
        definitions,
        synonyms: [],
        antonyms: [],
        ipa,
        syllables: undefined,
        etymology: undefined,
        examples,
      });
    }
  } catch (error) {
    console.error(`Error parsing TEI XML ${filepath}:`, error);
  }

  return entries;
}

async function findAndParseFiles(dir: string): Promise<WiktionaryEntry[]> {
  const allEntries: WiktionaryEntry[] = [];

  if (!fs.existsSync(dir)) {
    console.log(`Directory not found: ${dir}`);
    return allEntries;
  }

  const items = fs.readdirSync(dir);

  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);

    if (stat.isDirectory()) {
      // Recursively search subdirectories
      const subEntries = await findAndParseFiles(itemPath);
      allEntries.push(...subEntries);
    } else if (item.endsWith(".json")) {
      console.log(`  Parsing JSON: ${itemPath}`);
      const entries = await parseJsonFile(itemPath);
      console.log(`    Found ${entries.length} entries`);
      allEntries.push(...entries);
    } else if (item.endsWith(".xml")) {
      console.log(`  Parsing XML: ${itemPath}`);
      const entries = await parseTeiXml(itemPath);
      console.log(`    Found ${entries.length} entries`);
      allEntries.push(...entries);
    }
  }

  return allEntries;
}

async function main(): Promise<void> {
  console.log("Wiktionary Data Parser");
  console.log("======================\n");

  const srShNlpDir = path.join(DATA_DIR, "sr-sh-nlp");

  if (!fs.existsSync(srShNlpDir)) {
    console.error("[ERROR] sr-sh-nlp directory not found. Run download-sources.ts first.");
    process.exit(1);
  }

  console.log("Searching for data files...\n");

  const entries = await findAndParseFiles(srShNlpDir);

  // Deduplicate entries by word + POS
  const uniqueEntries = new Map<string, WiktionaryEntry>();
  for (const entry of entries) {
    const key = `${entry.wordCyrillic}:${entry.partOfSpeech}`;
    const existing = uniqueEntries.get(key);

    if (existing) {
      // Merge entries
      existing.definitions = [...new Set([...existing.definitions, ...entry.definitions])];
      existing.synonyms = [...new Set([...existing.synonyms, ...entry.synonyms])];
      existing.antonyms = [...new Set([...existing.antonyms, ...entry.antonyms])];
      existing.examples = [...new Set([...existing.examples, ...entry.examples])];
      if (!existing.ipa && entry.ipa) existing.ipa = entry.ipa;
      if (!existing.syllables && entry.syllables) existing.syllables = entry.syllables;
      if (!existing.etymology && entry.etymology) existing.etymology = entry.etymology;
    } else {
      uniqueEntries.set(key, entry);
    }
  }

  const finalEntries = Array.from(uniqueEntries.values());

  // Save to JSON
  const outputFile = path.join(OUTPUT_DIR, "wiktionary-parsed.json");
  console.log(`\nSaving to ${outputFile}...`);

  fs.writeFileSync(outputFile, JSON.stringify(finalEntries, null, 2));

  console.log("[SUCCESS] Wiktionary parsing complete");
  console.log(`  Output: ${outputFile}`);
  console.log(`  Total entries: ${finalEntries.length}`);
  console.log(`  With definitions: ${finalEntries.filter(e => e.definitions.length > 0).length}`);
  console.log(`  With synonyms: ${finalEntries.filter(e => e.synonyms.length > 0).length}`);
  console.log(`  With pronunciation: ${finalEntries.filter(e => e.ipa).length}`);

  // Save summary
  const summaryFile = path.join(OUTPUT_DIR, "wiktionary-summary.json");
  const summary = {
    totalEntries: finalEntries.length,
    withDefinitions: finalEntries.filter(e => e.definitions.length > 0).length,
    withSynonyms: finalEntries.filter(e => e.synonyms.length > 0).length,
    withAntonyms: finalEntries.filter(e => e.antonyms.length > 0).length,
    withPronunciation: finalEntries.filter(e => e.ipa).length,
    withEtymology: finalEntries.filter(e => e.etymology).length,
    withExamples: finalEntries.filter(e => e.examples.length > 0).length,
    partOfSpeechCounts: {} as Record<string, number>,
  };

  for (const entry of finalEntries) {
    summary.partOfSpeechCounts[entry.partOfSpeech] =
      (summary.partOfSpeechCounts[entry.partOfSpeech] || 0) + 1;
  }

  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  console.log(`  Summary: ${summaryFile}`);
}

main().catch(console.error);
