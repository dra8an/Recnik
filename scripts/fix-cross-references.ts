/**
 * Fix cross-references: delete all word_relations and re-resolve
 * using the fixed parser logic (excludes sub-def "в." markers, idiom text,
 * and handles "в. под X" pattern correctly).
 *
 * Usage: tsx scripts/fix-cross-references.ts
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

const CYR_LOWER = "а-яђјљњћџ";
const CYR_UPPER = "А-ЯЂЈЉЊЋЏ";
const CYR_ALL = `${CYR_LOWER}${CYR_UPPER}`;

interface CrossReference {
  type: "see" | "compare";
  target: string;
}

function extractCrossReferences(text: string): CrossReference[] {
  const refs: CrossReference[] = [];

  // Only search text BEFORE idiom section (•)
  const idiomIdx = text.indexOf("•");
  const searchText = idiomIdx >= 0 ? text.substring(0, idiomIdx) : text;

  // "в." (see/videti) references
  // CRITICAL: "в." is also the 3rd sub-definition letter (а., б., в.)
  // Only extract when "а." and "б." are NOT present (their presence = sub-def structure)
  // Also limit to short entries (< 200 chars) as additional safety
  // Handle "в. под X" pattern: target is X, not "под"
  const hasSubDefs = /\sа\.\s/.test(searchText) || /\sб\.\s/.test(searchText);
  const hasNumberedDefs = /\s[12]\.\s/.test(searchText);
  if (!hasSubDefs && !hasNumberedDefs && text.length < 200) {
    const seeRegex = new RegExp(
      `(?:^|\\s)в\\.\\s+(?:(?:под|код)\\s+)?([${CYR_ALL}\\-]+(?:\\s*\\([^)]*\\))?)`,
      "g"
    );
    // Detect multi-redirect entries: "word1 в. target1, word2 в. target2, ..."
    // Only the first "в." belongs to this entry's headword.
    const allSeeMatches = [...searchText.matchAll(seeRegex)];
    const multiRedirectRegex = new RegExp(`,\\s*[${CYR_ALL}]`);
    const isMultiRedirect = allSeeMatches.length >= 2 &&
      multiRedirectRegex.test(searchText);
    const seeMatches = isMultiRedirect ? allSeeMatches.slice(0, 1) : allSeeMatches;
    for (const m of seeMatches) {
      // Skip "в." after Roman numerals (XVII в. = 17th century)
      const matchPos = m.index!;
      const before = searchText.substring(Math.max(0, matchPos - 10), matchPos);
      if (/[IVXLC]\s*$/.test(before)) continue;

      refs.push({ type: "see", target: m[1].trim() });
    }
  }

  // "уп." (compare) references
  const compRegex = new RegExp(
    `(?:^|\\s)уп\\.\\s+([${CYR_ALL}\\-]+(?:\\s+и\\s+[${CYR_ALL}\\-]+)?)`,
    "g"
  );
  const compMatches = searchText.matchAll(compRegex);
  for (const m of compMatches) {
    refs.push({ type: "compare", target: m[1].trim() });
  }

  return refs;
}

async function main(): Promise<void> {
  console.log("Fix Cross-References");
  console.log("====================\n");

  // Step 1: Delete all existing word_relations
  const deletedCount = await prisma.wordRelation.deleteMany({});
  console.log(`Deleted ${deletedCount.count} existing word_relations`);

  // Step 2: Build word lookup map from DB
  console.log("\nBuilding word lookup map...");
  const allWords = await prisma.word.findMany({
    select: { id: true, cyrillic: true, partOfSpeech: true, homonymNumber: true, rawText: true },
  });

  const wordIdMap = new Map<string, string>();
  for (const w of allWords) {
    const key = `${w.cyrillic}:${w.partOfSpeech}:${w.homonymNumber}`;
    wordIdMap.set(key, w.id);
    if (!wordIdMap.has(w.cyrillic)) {
      wordIdMap.set(w.cyrillic, w.id);
    }
  }
  console.log(`  ${allWords.length} words loaded, ${wordIdMap.size} lookup keys`);

  // Step 3: Extract cross-references from rawText using fixed logic
  console.log("\nExtracting cross-references with fixed parser...");
  const relations: Array<{ wordId: string; relatedWordId: string; relationType: string }> = [];
  const seen = new Set<string>();
  let entriesWithRefs = 0;
  let refsFound = 0;
  let refsResolved = 0;
  let refsFailed = 0;

  for (const word of allWords) {
    if (!word.rawText) continue;

    const crossRefs = extractCrossReferences(word.rawText);
    if (crossRefs.length === 0) continue;

    entriesWithRefs++;
    refsFound += crossRefs.length;

    for (const ref of crossRefs) {
      let target = ref.target
        .replace(/\s*\(.*?\)/g, "")
        .replace(/\s+и\s+.*/g, "")
        .replace(/[.,;:!?]/g, "")
        .trim()
        .toLowerCase();

      if (!target) {
        refsFailed++;
        continue;
      }

      const targetId = wordIdMap.get(target);
      if (!targetId) {
        refsFailed++;
        continue;
      }

      if (word.id === targetId) continue;

      const relationType = ref.type === "see" ? "synonym" : "related";
      const key = `${word.id}:${targetId}:${relationType}`;
      if (seen.has(key)) continue;
      seen.add(key);

      relations.push({ wordId: word.id, relatedWordId: targetId, relationType });
      refsResolved++;
    }
  }

  console.log(`  Entries with cross-refs: ${entriesWithRefs}`);
  console.log(`  Cross-refs found: ${refsFound}`);
  console.log(`  Cross-refs resolved: ${refsResolved}`);
  console.log(`  Cross-refs failed: ${refsFailed}`);

  // Step 4: Batch insert
  console.log("\nInserting word_relations...");
  const BATCH_SIZE = 500;
  let inserted = 0;

  for (let i = 0; i < relations.length; i += BATCH_SIZE) {
    const batch = relations.slice(i, i + BATCH_SIZE);
    try {
      const result = await prisma.wordRelation.createMany({
        data: batch,
        skipDuplicates: true,
      });
      inserted += result.count;
    } catch (err) {
      for (const rel of batch) {
        try {
          await prisma.wordRelation.create({ data: rel });
          inserted++;
        } catch {
          // skip
        }
      }
    }
  }

  console.log(`  Inserted: ${inserted} word_relations`);

  // Step 5: Verify — show top targets
  const topTargets = await prisma.$queryRaw<Array<{ cyrillic: string; count: bigint }>>`
    SELECT w2.cyrillic, COUNT(*)::bigint as count
    FROM word_relations wr
    JOIN words w2 ON wr.related_word_id = w2.id
    GROUP BY w2.cyrillic
    ORDER BY count DESC
    LIMIT 20
  `;

  console.log("\nTop cross-reference targets (should not contain prepositions or sub-def words):");
  for (const row of topTargets) {
    console.log(`  ${String(row.cyrillic).padEnd(20)} ${row.count}`);
  }

  const totalRelations = await prisma.wordRelation.count();
  console.log(`\nTotal word_relations: ${totalRelations}`);
  console.log("\nDone!");

  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
