/**
 * Seed the database with sample Serbian words for testing
 */

import "dotenv/config";
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

interface SeedWord {
  word: string;
  cyrillic: string;
  latin: string;
  partOfSpeech: string;
  gender?: string;
  isCommon: boolean;
  definitions: { text: string; examples: string[] }[];
  inflections?: {
    form: string;
    formCyrillic: string;
    formLatin: string;
    case?: string;
    number?: string;
    grammaticalInfo: string;
  }[];
  pronunciation?: { ipa: string; syllables: string };
  etymology?: string;
}

const sampleWords: SeedWord[] = [
  {
    word: "реч",
    cyrillic: "реч",
    latin: "reč",
    partOfSpeech: "imenica",
    gender: "ženski",
    isCommon: true,
    definitions: [
      {
        text: "Најмања језичка јединица која има значење и може стајати самостално у реченици.",
        examples: [
          "Ова реченица садржи пет речи.",
          "Није могао да нађе праву реч.",
        ],
      },
      {
        text: "Оно што неко каже; изјава, исказ.",
        examples: ["Његова реч је закон.", "Дао сам реч да ћу доћи."],
      },
    ],
    inflections: [
      { form: "реч", formCyrillic: "реч", formLatin: "reč", case: "nominativ", number: "jednina", grammaticalInfo: "Nfsn" },
      { form: "речи", formCyrillic: "речи", formLatin: "reči", case: "genitiv", number: "jednina", grammaticalInfo: "Nfsg" },
      { form: "речи", formCyrillic: "речи", formLatin: "reči", case: "dativ", number: "jednina", grammaticalInfo: "Nfsd" },
      { form: "реч", formCyrillic: "реч", formLatin: "reč", case: "akuzativ", number: "jednina", grammaticalInfo: "Nfsa" },
      { form: "речи", formCyrillic: "речи", formLatin: "reči", case: "vokativ", number: "jednina", grammaticalInfo: "Nfsv" },
      { form: "речју", formCyrillic: "речју", formLatin: "rečju", case: "instrumental", number: "jednina", grammaticalInfo: "Nfsi" },
      { form: "речи", formCyrillic: "речи", formLatin: "reči", case: "lokativ", number: "jednina", grammaticalInfo: "Nfsl" },
      { form: "речи", formCyrillic: "речи", formLatin: "reči", case: "nominativ", number: "množina", grammaticalInfo: "Nfpn" },
      { form: "речи", formCyrillic: "речи", formLatin: "reči", case: "genitiv", number: "množina", grammaticalInfo: "Nfpg" },
      { form: "речима", formCyrillic: "речима", formLatin: "rečima", case: "dativ", number: "množina", grammaticalInfo: "Nfpd" },
      { form: "речи", formCyrillic: "речи", formLatin: "reči", case: "akuzativ", number: "množina", grammaticalInfo: "Nfpa" },
      { form: "речи", formCyrillic: "речи", formLatin: "reči", case: "vokativ", number: "množina", grammaticalInfo: "Nfpv" },
      { form: "речима", formCyrillic: "речима", formLatin: "rečima", case: "instrumental", number: "množina", grammaticalInfo: "Nfpi" },
      { form: "речима", formCyrillic: "речима", formLatin: "rečima", case: "lokativ", number: "množina", grammaticalInfo: "Nfpl" },
    ],
    pronunciation: { ipa: "rɛ̂tʃ", syllables: "реч" },
    etymology: "Од прасловенског *rěčь, сродно са руским речь, пољским rzecz.",
  },
  {
    word: "књига",
    cyrillic: "књига",
    latin: "knjiga",
    partOfSpeech: "imenica",
    gender: "ženski",
    isCommon: true,
    definitions: [
      {
        text: "Штампано или писано дело увезано у корице.",
        examples: ["Прочитао сам целу књигу.", "Библиотека има хиљаде књига."],
      },
      {
        text: "Службени документ, регистар.",
        examples: ["Матична књига рођених.", "Земљишна књига."],
      },
    ],
    pronunciation: { ipa: "kɲǐːɡa", syllables: "књи-га" },
    etymology: "Од старословенског кънѩгы, преко германског *kuningaz (краљ).",
  },
  {
    word: "писати",
    cyrillic: "писати",
    latin: "pisati",
    partOfSpeech: "glagol",
    isCommon: true,
    definitions: [
      {
        text: "Бележити мисли или информације писменим знаковима.",
        examples: ["Пише писмо пријатељу.", "Научио је да пише са пет година."],
      },
      {
        text: "Стварати књижевно или новинарско дело.",
        examples: ["Пише роман већ две године.", "Пише за новине."],
      },
    ],
    pronunciation: { ipa: "pǐːsati", syllables: "пи-са-ти" },
  },
  {
    word: "читати",
    cyrillic: "читати",
    latin: "čitati",
    partOfSpeech: "glagol",
    isCommon: true,
    definitions: [
      {
        text: "Разумевати писане знакове; тумачити текст.",
        examples: ["Чита књигу сваке вечери.", "Научила је да чита врло рано."],
      },
    ],
    pronunciation: { ipa: "tʃǐːtati", syllables: "чи-та-ти" },
  },
  {
    word: "леп",
    cyrillic: "леп",
    latin: "lep",
    partOfSpeech: "pridev",
    isCommon: true,
    definitions: [
      {
        text: "Који изазива естетско задовољство; пријатан за гледање.",
        examples: ["Леп дан за шетњу.", "Имала је леп осмех."],
      },
      {
        text: "Који је добар, квалитетан.",
        examples: ["То је леп гест.", "Лепо се провели."],
      },
    ],
    pronunciation: { ipa: "lɛ̂ːp", syllables: "леп" },
  },
  {
    word: "добар",
    cyrillic: "добар",
    latin: "dobar",
    partOfSpeech: "pridev",
    isCommon: true,
    definitions: [
      {
        text: "Који има позитивна својства; квалитетан.",
        examples: ["Добар човек.", "Добра вест."],
      },
      {
        text: "Способан, вешт у нечему.",
        examples: ["Добар је у математици.", "Добар играч."],
      },
    ],
    pronunciation: { ipa: "dǒbar", syllables: "до-бар" },
  },
  {
    word: "човек",
    cyrillic: "човек",
    latin: "čovek",
    partOfSpeech: "imenica",
    gender: "muški",
    isCommon: true,
    definitions: [
      {
        text: "Биће које припада врсти Homo sapiens.",
        examples: ["Човек је друштвено биће."],
      },
      {
        text: "Одрасла мушка особа.",
        examples: ["Ушао је један човек.", "Човек у оделу."],
      },
    ],
    pronunciation: { ipa: "tʃǒʋek", syllables: "чо-век" },
  },
  {
    word: "жена",
    cyrillic: "жена",
    latin: "žena",
    partOfSpeech: "imenica",
    gender: "ženski",
    isCommon: true,
    definitions: [
      {
        text: "Одрасла особа женског пола.",
        examples: ["Жена у црвеној хаљини.", "Успешна жена."],
      },
      {
        text: "Супруга, венчана партнерка.",
        examples: ["Моја жена се зове Ана.", "Упознао сам његову жену."],
      },
    ],
    pronunciation: { ipa: "ʒěːna", syllables: "же-на" },
  },
  {
    word: "дан",
    cyrillic: "дан",
    latin: "dan",
    partOfSpeech: "imenica",
    gender: "muški",
    isCommon: true,
    definitions: [
      {
        text: "Период од 24 сата.",
        examples: ["Има седам дана у недељи."],
      },
      {
        text: "Светли део дана, од изласка до заласка сунца.",
        examples: ["Радим током дана.", "Леп сунчан дан."],
      },
    ],
    pronunciation: { ipa: "dâːn", syllables: "дан" },
  },
  {
    word: "ноћ",
    cyrillic: "ноћ",
    latin: "noć",
    partOfSpeech: "imenica",
    gender: "ženski",
    isCommon: true,
    definitions: [
      {
        text: "Тамни део дана, од заласка до изласка сунца.",
        examples: ["Лаку ноћ!", "Ноћ је била хладна."],
      },
    ],
    pronunciation: { ipa: "nôːtɕ", syllables: "ноћ" },
  },
];

async function clearDatabase(): Promise<void> {
  console.log("Clearing existing data...");
  await prisma.wordOfDay.deleteMany();
  await prisma.wordRelation.deleteMany();
  await prisma.etymology.deleteMany();
  await prisma.pronunciation.deleteMany();
  await prisma.inflection.deleteMany();
  await prisma.example.deleteMany();
  await prisma.definition.deleteMany();
  await prisma.word.deleteMany();
}

async function seedDatabase(): Promise<void> {
  console.log("\nSeeding database with sample words...\n");

  for (const wordData of sampleWords) {
    console.log(`  Adding: ${wordData.cyrillic} (${wordData.latin})`);

    // Create word
    const word = await prisma.word.create({
      data: {
        word: wordData.word,
        cyrillic: wordData.cyrillic,
        latin: wordData.latin,
        partOfSpeech: wordData.partOfSpeech,
        gender: wordData.gender,
        isCommon: wordData.isCommon,
        source: "seed",
      },
    });

    // Create definitions and examples
    for (let i = 0; i < wordData.definitions.length; i++) {
      const def = wordData.definitions[i];
      const definition = await prisma.definition.create({
        data: {
          wordId: word.id,
          definitionText: def.text,
          definitionNumber: i + 1,
          source: "seed",
        },
      });

      // Add examples
      if (def.examples.length > 0) {
        await prisma.example.createMany({
          data: def.examples.map((exampleText) => ({
            definitionId: definition.id,
            exampleText,
            source: "seed",
          })),
        });
      }
    }

    // Create inflections
    if (wordData.inflections) {
      await prisma.inflection.createMany({
        data: wordData.inflections.map((inf) => ({
          wordId: word.id,
          form: inf.form,
          formCyrillic: inf.formCyrillic,
          formLatin: inf.formLatin,
          case: inf.case,
          number: inf.number,
          grammaticalInfo: inf.grammaticalInfo,
        })),
      });
    }

    // Create pronunciation
    if (wordData.pronunciation) {
      await prisma.pronunciation.create({
        data: {
          wordId: word.id,
          ipa: wordData.pronunciation.ipa,
          syllables: wordData.pronunciation.syllables,
          source: "seed",
        },
      });
    }

    // Create etymology
    if (wordData.etymology) {
      await prisma.etymology.create({
        data: {
          wordId: word.id,
          etymologyText: wordData.etymology,
          source: "seed",
        },
      });
    }
  }

  // Create some word relations (synonyms)
  console.log("\nCreating word relations...");

  const lepWord = await prisma.word.findFirst({ where: { cyrillic: "леп" } });
  const dobarWord = await prisma.word.findFirst({ where: { cyrillic: "добар" } });

  if (lepWord && dobarWord) {
    await prisma.wordRelation.create({
      data: {
        wordId: lepWord.id,
        relatedWordId: dobarWord.id,
        relationType: "synonym",
      },
    });
    console.log("  Added: леп <-> добар (synonym)");
  }

  const danWord = await prisma.word.findFirst({ where: { cyrillic: "дан" } });
  const nocWord = await prisma.word.findFirst({ where: { cyrillic: "ноћ" } });

  if (danWord && nocWord) {
    await prisma.wordRelation.create({
      data: {
        wordId: danWord.id,
        relatedWordId: nocWord.id,
        relationType: "antonym",
      },
    });
    console.log("  Added: дан <-> ноћ (antonym)");
  }

  const coveekWord = await prisma.word.findFirst({ where: { cyrillic: "човек" } });
  const zenaWord = await prisma.word.findFirst({ where: { cyrillic: "жена" } });

  if (coveekWord && zenaWord) {
    await prisma.wordRelation.create({
      data: {
        wordId: coveekWord.id,
        relatedWordId: zenaWord.id,
        relationType: "antonym",
      },
    });
    console.log("  Added: човек <-> жена (antonym)");
  }

  // Set frequency ranks
  console.log("\nSetting frequency ranks...");
  const allWords = await prisma.word.findMany({ orderBy: { cyrillic: "asc" } });
  for (let i = 0; i < allWords.length; i++) {
    await prisma.word.update({
      where: { id: allWords[i].id },
      data: { frequencyRank: i + 1 },
    });
  }
}

async function main(): Promise<void> {
  console.log("Database Seeder");
  console.log("===============\n");

  try {
    await clearDatabase();
    await seedDatabase();

    const count = await prisma.word.count();
    console.log(`\n[SUCCESS] Seeded ${count} words`);

    // Print statistics
    const stats = {
      words: await prisma.word.count(),
      definitions: await prisma.definition.count(),
      examples: await prisma.example.count(),
      inflections: await prisma.inflection.count(),
      pronunciations: await prisma.pronunciation.count(),
      etymologies: await prisma.etymology.count(),
      relations: await prisma.wordRelation.count(),
    };

    console.log("\nDatabase Statistics:");
    console.log(`  Words: ${stats.words}`);
    console.log(`  Definitions: ${stats.definitions}`);
    console.log(`  Examples: ${stats.examples}`);
    console.log(`  Inflections: ${stats.inflections}`);
    console.log(`  Pronunciations: ${stats.pronunciations}`);
    console.log(`  Etymologies: ${stats.etymologies}`);
    console.log(`  Word Relations: ${stats.relations}`);
  } catch (error) {
    console.error("\n[ERROR] Seeding failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
