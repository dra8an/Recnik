/**
 * Download data sources for Serbian Dictionary
 *
 * Data sources:
 * 1. srLex - Inflectional lexicon (CLARIN.SI)
 * 2. putnich/sr-sh-nlp - Wiktionary definitions, synonyms, pronunciation
 * 3. Serbian Wiktionary API - Additional definitions
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const DATA_DIR = path.join(process.cwd(), "data", "raw");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function downloadFile(url: string, filename: string): Promise<void> {
  const filepath = path.join(DATA_DIR, filename);

  if (fs.existsSync(filepath)) {
    console.log(`[SKIP] ${filename} already exists`);
    return;
  }

  console.log(`[DOWNLOAD] ${filename} from ${url}`);

  try {
    execSync(`curl -L -o "${filepath}" "${url}"`, { stdio: "inherit" });
    console.log(`[SUCCESS] Downloaded ${filename}`);
  } catch (error) {
    console.error(`[ERROR] Failed to download ${filename}:`, error);
    throw error;
  }
}

async function cloneGitRepo(repoUrl: string, dirname: string): Promise<void> {
  const dirpath = path.join(DATA_DIR, dirname);

  if (fs.existsSync(dirpath)) {
    console.log(`[SKIP] ${dirname} already exists`);
    return;
  }

  console.log(`[CLONE] ${dirname} from ${repoUrl}`);

  try {
    execSync(`git clone --depth 1 "${repoUrl}" "${dirpath}"`, { stdio: "inherit" });
    console.log(`[SUCCESS] Cloned ${dirname}`);
  } catch (error) {
    console.error(`[ERROR] Failed to clone ${dirname}:`, error);
    throw error;
  }
}

async function downloadSrLex(): Promise<void> {
  console.log("\n=== Downloading srLex ===");

  // srLex is available from CLARIN.SI repository
  // The data is in XML format
  const srLexUrl = "https://www.clarin.si/repository/xmlui/bitstream/handle/11356/1233/srLex.zip";

  await downloadFile(srLexUrl, "srLex.zip");

  // Extract the zip file
  const zipPath = path.join(DATA_DIR, "srLex.zip");
  const extractDir = path.join(DATA_DIR, "srLex");

  if (!fs.existsSync(extractDir)) {
    console.log("[EXTRACT] Extracting srLex.zip...");
    execSync(`unzip -o "${zipPath}" -d "${extractDir}"`, { stdio: "inherit" });
    console.log("[SUCCESS] Extracted srLex");
  }
}

async function downloadPutnichData(): Promise<void> {
  console.log("\n=== Downloading putnich/sr-sh-nlp ===");

  // Clone the GitHub repository
  await cloneGitRepo(
    "https://github.com/putnich/sr-sh-nlp.git",
    "sr-sh-nlp"
  );
}

async function downloadWiktionaryDump(): Promise<void> {
  console.log("\n=== Downloading Serbian Wiktionary ===");

  // Serbian Wiktionary XML dump
  // Note: This is a large file and may take a while
  const wiktionaryUrl =
    "https://dumps.wikimedia.org/srwiktionary/latest/srwiktionary-latest-pages-articles.xml.bz2";

  await downloadFile(wiktionaryUrl, "srwiktionary-latest-pages-articles.xml.bz2");

  // Decompress if needed
  const bzPath = path.join(DATA_DIR, "srwiktionary-latest-pages-articles.xml.bz2");
  const xmlPath = path.join(DATA_DIR, "srwiktionary-latest-pages-articles.xml");

  if (!fs.existsSync(xmlPath) && fs.existsSync(bzPath)) {
    console.log("[DECOMPRESS] Decompressing Wiktionary dump...");
    try {
      execSync(`bunzip2 -k "${bzPath}"`, { stdio: "inherit" });
      console.log("[SUCCESS] Decompressed Wiktionary dump");
    } catch (error) {
      console.log("[INFO] bunzip2 not available, skipping decompression");
    }
  }
}

async function main(): Promise<void> {
  console.log("Serbian Dictionary Data Downloader");
  console.log("===================================\n");
  console.log(`Data directory: ${DATA_DIR}\n`);

  try {
    // Download srLex (inflections)
    await downloadSrLex();

    // Download putnich/sr-sh-nlp (definitions, synonyms, pronunciation)
    await downloadPutnichData();

    // Download Serbian Wiktionary (optional, large file)
    // Uncomment to download:
    // await downloadWiktionaryDump();

    console.log("\n=== Download Complete ===");
    console.log("\nNext steps:");
    console.log("1. Run: npx tsx scripts/parse-srlex.ts");
    console.log("2. Run: npx tsx scripts/parse-wiktionary.ts");
    console.log("3. Run: npx tsx scripts/merge-data.ts");
    console.log("4. Run: npx tsx scripts/import-to-db.ts");
  } catch (error) {
    console.error("\n[FATAL] Download failed:", error);
    process.exit(1);
  }
}

main();
