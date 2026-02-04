import { prisma } from "./db";
import { normalizeForSearch } from "./transliterate";
import type { WordSummary, SearchResult } from "@/types/dictionary";

interface SearchOptions {
  query: string;
  page?: number;
  pageSize?: number;
  partOfSpeech?: string;
}

/**
 * Search for words with autocomplete support
 * Searches both Cyrillic and Latin versions
 */
export async function searchWords({
  query,
  page = 1,
  pageSize = 20,
  partOfSpeech,
}: SearchOptions): Promise<SearchResult> {
  const { cyrillic, latin } = normalizeForSearch(query);
  const skip = (page - 1) * pageSize;

  const whereClause = {
    OR: [
      { cyrillic: { startsWith: cyrillic, mode: "insensitive" as const } },
      { latin: { startsWith: latin, mode: "insensitive" as const } },
      { cyrillic: { contains: cyrillic, mode: "insensitive" as const } },
      { latin: { contains: latin, mode: "insensitive" as const } },
    ],
    ...(partOfSpeech && { partOfSpeech }),
  };

  const [words, total] = await Promise.all([
    prisma.word.findMany({
      where: whereClause,
      select: {
        id: true,
        word: true,
        cyrillic: true,
        latin: true,
        partOfSpeech: true,
        homonymNumber: true,
        definitions: {
          select: { definitionText: true },
          take: 1,
          orderBy: { definitionNumber: "asc" },
        },
      },
      orderBy: [
        { frequencyRank: { sort: "asc", nulls: "last" } },
        { word: "asc" },
      ],
      skip,
      take: pageSize,
    }),
    prisma.word.count({ where: whereClause }),
  ]);

  const results: WordSummary[] = words.map((w) => ({
    id: w.id,
    word: w.word,
    cyrillic: w.cyrillic,
    latin: w.latin,
    partOfSpeech: w.partOfSpeech,
    homonymNumber: w.homonymNumber,
    definition: w.definitions[0]?.definitionText,
  }));

  return {
    words: results,
    total,
    page,
    pageSize,
  };
}

/**
 * Get autocomplete suggestions for a prefix
 */
export async function getAutocompleteSuggestions(
  prefix: string,
  limit: number = 10
): Promise<WordSummary[]> {
  const { cyrillic, latin } = normalizeForSearch(prefix);

  const words = await prisma.word.findMany({
    where: {
      OR: [
        { cyrillic: { startsWith: cyrillic, mode: "insensitive" } },
        { latin: { startsWith: latin, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      word: true,
      cyrillic: true,
      latin: true,
      partOfSpeech: true,
      homonymNumber: true,
      definitions: {
        select: { definitionText: true },
        take: 1,
        orderBy: { definitionNumber: "asc" },
      },
    },
    orderBy: [
      { isCommon: "desc" },
      { frequencyRank: { sort: "asc", nulls: "last" } },
    ],
    take: limit,
  });

  return words.map((w) => ({
    id: w.id,
    word: w.word,
    cyrillic: w.cyrillic,
    latin: w.latin,
    partOfSpeech: w.partOfSpeech,
    homonymNumber: w.homonymNumber,
    definition: w.definitions[0]?.definitionText,
  }));
}

/**
 * Valid POS values used as URL suffixes to disambiguate words with same spelling but different POS.
 * E.g., /rec/pravo-prilog vs /rec/pravo-imenica
 */
const VALID_POS = new Set([
  "imenica", "glagol", "pridev", "prilog", "zamenica", "predlog",
  "veznik", "uzvik", "broj", "cestica", "prefiks", "odrednica", "skracenica",
]);

/**
 * Parse a slug that may contain a homonym suffix or POS suffix.
 * Examples:
 *   "а-2"       → { word: "а", homonymNumber: 2 }
 *   "pravo-prilog" → { word: "pravo", partOfSpeech: "prilog" }
 *   "pravo"     → { word: "pravo" }
 */
function parseSlug(slug: string): { word: string; homonymNumber?: number; partOfSpeech?: string } {
  const decoded = decodeURIComponent(slug);

  // Check for homonym number suffix: word-2
  const numMatch = decoded.match(/^(.+)-(\d+)$/);
  if (numMatch) {
    return { word: numMatch[1], homonymNumber: parseInt(numMatch[2], 10) };
  }

  // Check for POS suffix: word-imenica, word-prilog, etc.
  const posMatch = decoded.match(/^(.+)-([a-z]+)$/);
  if (posMatch && VALID_POS.has(posMatch[2])) {
    return { word: posMatch[1], partOfSpeech: posMatch[2] };
  }

  return { word: decoded };
}

/**
 * Find word by exact match (used for word detail page)
 * Supports homonym suffix in slug: /rec/а-2 → word "а", homonymNumber 2
 */
export async function findWordBySlug(slug: string) {
  const { word, homonymNumber, partOfSpeech } = parseSlug(slug);
  const { cyrillic, latin } = normalizeForSearch(word);

  const whereClause = {
    OR: [
      { cyrillic: { equals: cyrillic, mode: "insensitive" as const } },
      { latin: { equals: latin, mode: "insensitive" as const } },
    ],
    ...(homonymNumber !== undefined ? { homonymNumber } : {}),
    ...(partOfSpeech ? { partOfSpeech } : {}),
  };

  return prisma.word.findFirst({
    where: whereClause,
    include: {
      definitions: {
        include: {
          examples: true,
        },
        orderBy: { definitionNumber: "asc" },
      },
      pronunciations: true,
      etymologies: true,
      idioms: true,
      relatedFrom: {
        include: {
          relatedWord: {
            select: {
              id: true,
              word: true,
              cyrillic: true,
              latin: true,
              partOfSpeech: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Find all homonyms for a given word (for navigation between homonyms)
 */
export async function findHomonyms(cyrillic: string) {
  return prisma.word.findMany({
    where: { cyrillic: { equals: cyrillic, mode: "insensitive" } },
    select: {
      id: true,
      cyrillic: true,
      latin: true,
      partOfSpeech: true,
      homonymNumber: true,
      definitions: {
        select: { definitionText: true },
        take: 1,
        orderBy: { definitionNumber: "asc" },
      },
    },
    orderBy: { homonymNumber: "asc" },
  });
}

/**
 * Get words by first letter for alphabetical browsing
 */
export async function getWordsByLetter(
  letter: string,
  page: number = 1,
  pageSize: number = 50
): Promise<SearchResult> {
  const skip = (page - 1) * pageSize;

  // Get both Cyrillic and Latin versions of the letter
  const { cyrillic: cyrillicLetter, latin: latinLetter } = normalizeForSearch(letter);

  const whereClause = {
    OR: [
      { cyrillic: { startsWith: cyrillicLetter, mode: "insensitive" as const } },
      { latin: { startsWith: latinLetter, mode: "insensitive" as const } },
    ],
  };

  const [words, total] = await Promise.all([
    prisma.word.findMany({
      where: whereClause,
      select: {
        id: true,
        word: true,
        cyrillic: true,
        latin: true,
        partOfSpeech: true,
        homonymNumber: true,
        definitions: {
          select: { definitionText: true },
          take: 1,
          orderBy: { definitionNumber: "asc" },
        },
      },
      orderBy: { word: "asc" },
      skip,
      take: pageSize,
    }),
    prisma.word.count({ where: whereClause }),
  ]);

  return {
    words: words.map((w) => ({
      id: w.id,
      word: w.word,
      cyrillic: w.cyrillic,
      latin: w.latin,
      partOfSpeech: w.partOfSpeech,
      homonymNumber: w.homonymNumber,
      definition: w.definitions[0]?.definitionText,
    })),
    total,
    page,
    pageSize,
  };
}

/**
 * Get a random word (for random word feature)
 */
export async function getRandomWord(): Promise<WordSummary | null> {
  const count = await prisma.word.count({
    where: { isCommon: true },
  });

  if (count === 0) {
    const totalCount = await prisma.word.count();
    if (totalCount === 0) return null;

    const randomIndex = Math.floor(Math.random() * totalCount);
    const word = await prisma.word.findFirst({
      skip: randomIndex,
      select: {
        id: true,
        word: true,
        cyrillic: true,
        latin: true,
        partOfSpeech: true,
        definitions: {
          select: { definitionText: true },
          take: 1,
        },
      },
    });

    if (!word) return null;

    return {
      id: word.id,
      word: word.word,
      cyrillic: word.cyrillic,
      latin: word.latin,
      partOfSpeech: word.partOfSpeech,
      definition: word.definitions[0]?.definitionText,
    };
  }

  const randomIndex = Math.floor(Math.random() * count);
  const word = await prisma.word.findFirst({
    where: { isCommon: true },
    skip: randomIndex,
    select: {
      id: true,
      word: true,
      cyrillic: true,
      latin: true,
      partOfSpeech: true,
      definitions: {
        select: { definitionText: true },
        take: 1,
      },
    },
  });

  if (!word) return null;

  return {
    id: word.id,
    word: word.word,
    cyrillic: word.cyrillic,
    latin: word.latin,
    partOfSpeech: word.partOfSpeech,
    definition: word.definitions[0]?.definitionText,
  };
}
