/**
 * Merge all parsed data sources into a unified format
 *
 * Priority:
 * 1. srLex for inflections
 * 2. Wiktionary for definitions, synonyms, pronunciation
 */

import * as fs from "fs";
import * as path from "path";

const OUTPUT_DIR = path.join(process.cwd(), "data", "processed");

interface SrLexEntry {
  lemma: string;
  lemmaCyrillic: string;
  lemmaLatin: string;
  partOfSpeech: string;
  gender?: string;
  aspect?: string;
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

function loadJsonFile<T>(filepath: string): T | null {
  if (!fs.existsSync(filepath)) {
    console.log(`File not found: ${filepath}`);
    return null;
  }

  try {
    const content = fs.readFileSync(filepath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading ${filepath}:`, error);
    return null;
  }
}

async function main(): Promise<void> {
  console.log("Data Merger");
  console.log("===========\n");

  // Load srLex data
  const srLexPath = path.join(OUTPUT_DIR, "srlex-parsed.json");
  console.log("Loading srLex data...");
  const srLexData = loadJsonFile<SrLexEntry[]>(srLexPath);

  // Load Wiktionary data
  const wiktionaryPath = path.join(OUTPUT_DIR, "wiktionary-parsed.json");
  console.log("Loading Wiktionary data...");
  const wiktionaryData = loadJsonFile<WiktionaryEntry[]>(wiktionaryPath);

  // Create lookup maps
  const srLexMap = new Map<string, SrLexEntry>();
  const wiktionaryMap = new Map<string, WiktionaryEntry>();

  if (srLexData) {
    console.log(`srLex entries: ${srLexData.length}`);
    for (const entry of srLexData) {
      const key = `${entry.lemmaCyrillic}:${entry.partOfSpeech}`;
      srLexMap.set(key, entry);
    }
  }

  if (wiktionaryData) {
    console.log(`Wiktionary entries: ${wiktionaryData.length}`);
    for (const entry of wiktionaryData) {
      const key = `${entry.wordCyrillic}:${entry.partOfSpeech}`;
      wiktionaryMap.set(key, entry);
    }
  }

  // Collect all unique word+POS combinations
  const allKeys = new Set<string>();
  srLexMap.forEach((_, key) => allKeys.add(key));
  wiktionaryMap.forEach((_, key) => allKeys.add(key));

  console.log(`\nTotal unique word+POS combinations: ${allKeys.size}`);

  // Merge entries
  const mergedEntries: MergedEntry[] = [];
  let withDefinitions = 0;
  let withInflections = 0;
  let withPronunciation = 0;

  for (const key of allKeys) {
    const srLex = srLexMap.get(key);
    const wiktionary = wiktionaryMap.get(key);

    // Start with srLex data if available (for inflections)
    const merged: MergedEntry = {
      word: srLex?.lemmaCyrillic || wiktionary?.wordCyrillic || "",
      cyrillic: srLex?.lemmaCyrillic || wiktionary?.wordCyrillic || "",
      latin: srLex?.lemmaLatin || wiktionary?.wordLatin || "",
      partOfSpeech: srLex?.partOfSpeech || wiktionary?.partOfSpeech || "",
      gender: srLex?.gender,
      aspect: srLex?.aspect,
      definitions: [],
      inflections: srLex?.inflections || [],
      synonyms: [],
      antonyms: [],
      source: [],
    };

    // Track sources
    if (srLex) merged.source.push("srLex");
    if (wiktionary) merged.source.push("wiktionary");

    // Add definitions from Wiktionary
    if (wiktionary?.definitions.length) {
      merged.definitions = wiktionary.definitions.map((text, index) => ({
        text,
        examples: index === 0 ? wiktionary.examples : [],
      }));
      withDefinitions++;
    }

    // Add pronunciation from Wiktionary
    if (wiktionary?.ipa || wiktionary?.syllables) {
      merged.pronunciation = {
        ipa: wiktionary.ipa,
        syllables: wiktionary.syllables,
      };
      withPronunciation++;
    }

    // Add etymology from Wiktionary
    if (wiktionary?.etymology) {
      merged.etymology = wiktionary.etymology;
    }

    // Add synonyms and antonyms from Wiktionary
    if (wiktionary?.synonyms.length) {
      merged.synonyms = wiktionary.synonyms;
    }
    if (wiktionary?.antonyms.length) {
      merged.antonyms = wiktionary.antonyms;
    }

    // Count inflections
    if (merged.inflections.length > 0) {
      withInflections++;
    }

    mergedEntries.push(merged);
  }

  console.log(`\nMerge complete:`);
  console.log(`  Total entries: ${mergedEntries.length}`);
  console.log(`  With definitions: ${withDefinitions}`);
  console.log(`  With inflections: ${withInflections}`);
  console.log(`  With pronunciation: ${withPronunciation}`);

  // Sort by word
  mergedEntries.sort((a, b) => a.cyrillic.localeCompare(b.cyrillic, "sr"));

  // Save merged data
  const outputFile = path.join(OUTPUT_DIR, "merged-dictionary.json");
  console.log(`\nSaving to ${outputFile}...`);

  // Write in streaming fashion to handle large files
  const writeStream = fs.createWriteStream(outputFile);
  writeStream.write("[\n");

  for (let i = 0; i < mergedEntries.length; i++) {
    const entry = mergedEntries[i];
    writeStream.write(JSON.stringify(entry));
    if (i < mergedEntries.length - 1) {
      writeStream.write(",\n");
    }
  }

  writeStream.write("\n]");
  writeStream.end();

  console.log("[SUCCESS] Data merge complete");

  // Save summary
  const summaryFile = path.join(OUTPUT_DIR, "merged-summary.json");
  const summary = {
    totalEntries: mergedEntries.length,
    withDefinitions,
    withInflections,
    withPronunciation,
    sourceCounts: {
      srLexOnly: mergedEntries.filter(
        (e) => e.source.includes("srLex") && !e.source.includes("wiktionary")
      ).length,
      wiktionaryOnly: mergedEntries.filter(
        (e) => !e.source.includes("srLex") && e.source.includes("wiktionary")
      ).length,
      both: mergedEntries.filter(
        (e) => e.source.includes("srLex") && e.source.includes("wiktionary")
      ).length,
    },
    partOfSpeechCounts: {} as Record<string, number>,
  };

  for (const entry of mergedEntries) {
    summary.partOfSpeechCounts[entry.partOfSpeech] =
      (summary.partOfSpeechCounts[entry.partOfSpeech] || 0) + 1;
  }

  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  console.log(`  Summary: ${summaryFile}`);
}

main().catch(console.error);
