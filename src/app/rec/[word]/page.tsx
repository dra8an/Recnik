import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { findWordBySlug } from "@/lib/search";
import { prisma } from "@/lib/db";
import DefinitionList from "@/components/DefinitionList";
import AudioPlayer from "@/components/AudioPlayer";
import InflectionTable from "@/components/InflectionTable";
import WordCard from "@/components/WordCard";
import type { WordSummary, InflectionData } from "@/types/dictionary";

interface PageProps {
  params: Promise<{ word: string }>;
}

const partOfSpeechLabels: Record<string, string> = {
  imenica: "именица",
  glagol: "глагол",
  pridev: "придев",
  prilog: "прилог",
  zamenica: "заменица",
  predlog: "предлог",
  veznik: "везник",
  uzvik: "узвик",
  broj: "број",
  čestica: "честица",
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { word } = await params;
  const wordData = await findWordBySlug(word);

  if (!wordData) {
    return {
      title: "Реч није пронађена",
    };
  }

  const firstDefinition = wordData.definitions[0]?.definitionText || "";
  const description = `${wordData.cyrillic} (${wordData.latin}) - ${firstDefinition.substring(0, 150)}${firstDefinition.length > 150 ? "..." : ""}`;

  return {
    title: `${wordData.cyrillic} - дефиниција и значење`,
    description,
    openGraph: {
      title: `${wordData.cyrillic} - дефиниција`,
      description,
    },
  };
}

export default async function WordPage({ params }: PageProps) {
  const { word } = await params;
  const wordData = await findWordBySlug(word);

  if (!wordData) {
    notFound();
  }

  // Get inflections
  const inflections = await prisma.inflection.findMany({
    where: { wordId: wordData.id },
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

  // Transform related words
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

  const pronunciation = wordData.pronunciations[0];
  const etymology = wordData.etymologies[0];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400">
          Почетна
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/abeceda/${wordData.cyrillic[0].toLowerCase()}`}
          className="hover:text-blue-600 dark:hover:text-blue-400"
        >
          {wordData.cyrillic[0].toUpperCase()}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 dark:text-gray-100">{wordData.cyrillic}</span>
      </nav>

      <article className="max-w-4xl">
        {/* Word Header */}
        <header className="mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {wordData.cyrillic}
              </h1>
              <p className="text-lg text-gray-500 dark:text-gray-400">
                {wordData.latin}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm font-medium">
              {partOfSpeechLabels[wordData.partOfSpeech] || wordData.partOfSpeech}
              {wordData.gender && `, ${wordData.gender} род`}
              {wordData.aspect && `, ${wordData.aspect}`}
            </span>
          </div>

          {/* Pronunciation */}
          <div className="mt-4">
            <AudioPlayer
              audioUrl={pronunciation?.audioUrl}
              ipa={pronunciation?.ipa}
              syllables={pronunciation?.syllables}
            />
          </div>
        </header>

        {/* Definitions */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
              />
            </svg>
            Дефиниције
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <DefinitionList
              definitions={wordData.definitions.map((def) => ({
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
              }))}
            />
          </div>
        </section>

        {/* Inflections */}
        {inflectionData.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12"
                />
              </svg>
              Облици
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <InflectionTable
                inflections={inflectionData}
                partOfSpeech={wordData.partOfSpeech}
                gender={wordData.gender}
              />
            </div>
          </section>
        )}

        {/* Etymology */}
        {etymology && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
              Етимологија
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              {etymology.originLanguage && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Порекло: <span className="font-medium">{etymology.originLanguage}</span>
                </p>
              )}
              <p className="text-gray-800 dark:text-gray-200">
                {etymology.etymologyText}
              </p>
              {etymology.cognates && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Сродне речи: {etymology.cognates}
                </p>
              )}
            </div>
          </section>
        )}

        {/* Synonyms */}
        {synonyms.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
                />
              </svg>
              Синоними
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {synonyms.map((syn) => (
                <WordCard key={syn.id} word={syn} showDefinition={false} />
              ))}
            </div>
          </section>
        )}

        {/* Antonyms */}
        {antonyms.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
              Антоними
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {antonyms.map((ant) => (
                <WordCard key={ant.id} word={ant} showDefinition={false} />
              ))}
            </div>
          </section>
        )}

        {/* Related Words */}
        {relatedWords.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
                />
              </svg>
              Повезане речи
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {relatedWords.map((rel) => (
                <WordCard key={rel.id} word={rel} showDefinition={false} />
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}
