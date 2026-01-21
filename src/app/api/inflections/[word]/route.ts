import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeForSearch } from "@/lib/transliterate";
import type { InflectionData } from "@/types/dictionary";

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
    const { cyrillic, latin } = normalizeForSearch(decodeURIComponent(word));

    // First find the word
    const wordEntry = await prisma.word.findFirst({
      where: {
        OR: [
          { cyrillic: { equals: cyrillic, mode: "insensitive" } },
          { latin: { equals: latin, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        word: true,
        cyrillic: true,
        latin: true,
        partOfSpeech: true,
        gender: true,
      },
    });

    if (!wordEntry) {
      return NextResponse.json(
        { success: false, error: "Word not found" },
        { status: 404 }
      );
    }

    // Get all inflections for this word
    const inflections = await prisma.inflection.findMany({
      where: { wordId: wordEntry.id },
      orderBy: [
        { number: "asc" },
        { case: "asc" },
        { person: "asc" },
        { tense: "asc" },
      ],
    });

    const inflectionData: InflectionData[] = inflections.map((inf) => ({
      id: inf.id,
      form: inf.form,
      formCyrillic: inf.formCyrillic,
      formLatin: inf.formLatin,
      grammaticalInfo: inf.grammaticalInfo,
      case: inf.case,
      number: inf.number,
      gender: inf.gender,
      person: inf.person,
      tense: inf.tense,
      mood: inf.mood,
      voice: inf.voice,
      definiteness: inf.definiteness,
      degree: inf.degree,
    }));

    return NextResponse.json({
      success: true,
      data: {
        word: {
          id: wordEntry.id,
          word: wordEntry.word,
          cyrillic: wordEntry.cyrillic,
          latin: wordEntry.latin,
          partOfSpeech: wordEntry.partOfSpeech,
          gender: wordEntry.gender,
        },
        inflections: inflectionData,
      },
    });
  } catch (error) {
    console.error("Inflections lookup error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch inflections" },
      { status: 500 }
    );
  }
}
