import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { WordDetail } from "@/types/dictionary";

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Try to find today's word of the day
    let wordOfDay = await prisma.wordOfDay.findUnique({
      where: { date: today },
      include: {
        word: {
          include: {
            definitions: {
              include: { examples: true },
              orderBy: { definitionNumber: "asc" },
            },
            pronunciations: true,
            etymologies: true,
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
        },
      },
    });

    // If no word of day exists for today, select a new one
    if (!wordOfDay) {
      // Get a random common word that hasn't been used recently
      const recentWordIds = await prisma.wordOfDay.findMany({
        select: { wordId: true },
        orderBy: { date: "desc" },
        take: 30,
      });

      const excludeIds = recentWordIds.map((w) => w.wordId);

      const commonWordsCount = await prisma.word.count({
        where: {
          isCommon: true,
          id: { notIn: excludeIds },
          definitions: { some: {} },
        },
      });

      if (commonWordsCount === 0) {
        return NextResponse.json(
          { success: false, error: "No suitable words available" },
          { status: 404 }
        );
      }

      const randomIndex = Math.floor(Math.random() * commonWordsCount);

      const randomWord = await prisma.word.findFirst({
        where: {
          isCommon: true,
          id: { notIn: excludeIds },
          definitions: { some: {} },
        },
        skip: randomIndex,
      });

      if (!randomWord) {
        return NextResponse.json(
          { success: false, error: "No suitable words available" },
          { status: 404 }
        );
      }

      // Create word of day entry
      wordOfDay = await prisma.wordOfDay.create({
        data: {
          wordId: randomWord.id,
          date: today,
        },
        include: {
          word: {
            include: {
              definitions: {
                include: { examples: true },
                orderBy: { definitionNumber: "asc" },
              },
              pronunciations: true,
              etymologies: true,
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
          },
        },
      });
    }

    const wordData = wordOfDay.word;

    // Transform to WordDetail type
    const synonyms = wordData.relatedFrom
      .filter((r) => r.relationType === "synonym")
      .map((r) => ({
        id: r.relatedWord.id,
        word: r.relatedWord.word,
        cyrillic: r.relatedWord.cyrillic,
        latin: r.relatedWord.latin,
        partOfSpeech: r.relatedWord.partOfSpeech,
      }));

    const antonyms = wordData.relatedFrom
      .filter((r) => r.relationType === "antonym")
      .map((r) => ({
        id: r.relatedWord.id,
        word: r.relatedWord.word,
        cyrillic: r.relatedWord.cyrillic,
        latin: r.relatedWord.latin,
        partOfSpeech: r.relatedWord.partOfSpeech,
      }));

    const relatedWords = wordData.relatedFrom
      .filter((r) => !["synonym", "antonym"].includes(r.relationType))
      .map((r) => ({
        id: r.relatedWord.id,
        word: r.relatedWord.word,
        cyrillic: r.relatedWord.cyrillic,
        latin: r.relatedWord.latin,
        partOfSpeech: r.relatedWord.partOfSpeech,
      }));

    const response: { word: WordDetail; date: string } = {
      word: {
        id: wordData.id,
        word: wordData.word,
        cyrillic: wordData.cyrillic,
        latin: wordData.latin,
        partOfSpeech: wordData.partOfSpeech,
        gender: wordData.gender,
        aspect: wordData.aspect,
        frequencyRank: wordData.frequencyRank,
        isCommon: wordData.isCommon,
        definitions: wordData.definitions.map((def) => ({
          id: def.id,
          definitionText: def.definitionText,
          definitionNumber: def.definitionNumber,
          register: def.register,
          domain: def.domain,
          examples: def.examples.map((ex) => ({
            id: ex.id,
            exampleText: ex.exampleText,
            source: ex.source,
            translation: ex.translation,
          })),
        })),
        pronunciations: wordData.pronunciations.map((p) => ({
          id: p.id,
          ipa: p.ipa,
          audioUrl: p.audioUrl,
          syllables: p.syllables,
          stressPosition: p.stressPosition,
        })),
        etymologies: wordData.etymologies.map((e) => ({
          id: e.id,
          originLanguage: e.originLanguage,
          etymologyText: e.etymologyText,
          cognates: e.cognates,
        })),
        synonyms,
        antonyms,
        relatedWords,
      },
      date: wordOfDay.date.toISOString().split("T")[0],
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error("Word of day error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get word of the day" },
      { status: 500 }
    );
  }
}
