import { NextRequest, NextResponse } from "next/server";
import { findWordBySlug } from "@/lib/search";
import type { WordDetail, WordSummary } from "@/types/dictionary";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ word: string }> }
) {
  const { word } = await params;

  if (!word) {
    return NextResponse.json(
      { success: false, error: "Word parameter is required" },
      { status: 400 }
    );
  }

  try {
    const wordData = await findWordBySlug(word);

    if (!wordData) {
      return NextResponse.json(
        { success: false, error: "Word not found" },
        { status: 404 }
      );
    }

    // Transform the data to match WordDetail type
    const synonyms: WordSummary[] = [];
    const antonyms: WordSummary[] = [];
    const relatedWords: WordSummary[] = [];

    for (const relation of wordData.relatedFrom) {
      const relatedWord: WordSummary = {
        id: relation.relatedWord.id,
        word: relation.relatedWord.word,
        cyrillic: relation.relatedWord.cyrillic,
        latin: relation.relatedWord.latin,
        partOfSpeech: relation.relatedWord.partOfSpeech,
      };

      switch (relation.relationType) {
        case "synonym":
          synonyms.push(relatedWord);
          break;
        case "antonym":
          antonyms.push(relatedWord);
          break;
        default:
          relatedWords.push(relatedWord);
      }
    }

    const response: WordDetail = {
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
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error("Word lookup error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch word" },
      { status: 500 }
    );
  }
}
