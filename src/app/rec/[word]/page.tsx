import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { findWordBySlug, findHomonyms } from "@/lib/search";
import { prisma } from "@/lib/db";
import DefinitionList from "@/components/DefinitionList";
import AudioPlayer from "@/components/AudioPlayer";
import InflectionTable from "@/components/InflectionTable";
import WordCard from "@/components/WordCard";
import type { WordSummary, InflectionData } from "@/types/dictionary";
import { RawTextWithLinks } from "@/components/CrossRefText";

interface PageProps {
  params: Promise<{ word: string }>;
}

/**
 * Split a single idiom blob into individual phrases.
 * In the dictionary, phrases are separated by ". " followed by a Cyrillic letter or "(" or "~".
 * We avoid splitting on ". " followed by a digit (numbered sub-definitions like "2)").
 */
function splitIdiomPhrases(text: string): string[] {
  // Known domain/register abbreviations (4+ Cyrillic chars) that should NOT trigger a split
  const KNOWN_ABBREVS = new Set([
    "зоол", "астр", "лингв", "правн", "техн", "грађ", "архит", "геогр", "геол",
    "анат", "информ", "цркв", "слик", "разг", "жарг", "књиж", "песн", "експр",
    "помор", "ковач", "кроз", "фарм", "технол",
  ]);

  // First split on "•" which separates sub-sections within idiom text
  const sections = text.split(/\s*•\s*/).filter((s) => s.trim().length > 0);

  const allPhrases: string[] = [];
  for (const section of sections) {
    // Split on ". " preceded by 4+ Cyrillic chars (optionally followed by ")")
    // and followed by a Cyrillic letter, ( or ~.
    const parts = section
      .split(/(?<=[а-яђјљњћџА-ЯЂЈЉЊЋЏ]{4,}\)?)\.\s+(?=[а-яђјљњћџА-ЯЂЈЉЊЋЏ(~])/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    // Merge back parts that were incorrectly split on an abbreviation
    const merged: string[] = [];
    for (const part of parts) {
      if (merged.length > 0) {
        const prev = merged[merged.length - 1];
        const lastWord = prev.match(/([а-яђјљњћџА-ЯЂЈЉЊЋЏ]+)\)?$/);
        if (lastWord && KNOWN_ABBREVS.has(lastWord[1].toLowerCase())) {
          merged[merged.length - 1] = prev + ". " + part;
          continue;
        }
      }
      merged.push(part);
    }

    allPhrases.push(...merged);
  }

  return allPhrases;
}

/**
 * Split an idiom phrase into the expression (bold) and its explanation.
 * The expression is the part containing ~ or the headword; the explanation follows.
 */
function splitExpressionAndExplanation(
  phrase: string,
  headword: string
): { expression: string; explanation: string } {
  // If the phrase starts with a numbered definition, no bold expression
  if (/^\d+\)/.test(phrase)) {
    return { expression: "", explanation: phrase };
  }

  // If explanation starts with "1)", split there
  const numberedStart = phrase.search(/\s1\)\s/);
  if (numberedStart > 0 && numberedStart < phrase.length * 0.6) {
    return {
      expression: phrase.substring(0, numberedStart).trim(),
      explanation: phrase.substring(numberedStart).trim(),
    };
  }

  // Build stem pattern to match headword inflections
  const stem = headword.length > 3 ? headword.substring(0, headword.length - 1) : headword;
  const escapedStem = stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const stemPattern = new RegExp(escapedStem + "[а-яђјљњћџ\\-]*", "gi");

  // Find the last occurrence of ~ or headword stem in the first 70% of phrase
  let lastMatchEnd = -1;
  const searchLimit = Math.floor(phrase.length * 0.7);

  // Check for ~ (only directly attached chars like ~се, not trailing text)
  let tildeIdx = -1;
  for (let i = 0; i < searchLimit; i++) {
    if (phrase[i] === "~") tildeIdx = i;
  }
  if (tildeIdx >= 0) {
    // Include only word chars directly attached to ~
    const afterTilde = phrase.substring(tildeIdx).match(/^~[а-яђјљњћџ]*/i);
    lastMatchEnd = tildeIdx + (afterTilde ? afterTilde[0].length : 1);
  }

  // Check for headword stem
  let match;
  while ((match = stemPattern.exec(phrase)) !== null) {
    const end = match.index + match[0].length;
    if (end <= searchLimit && end > lastMatchEnd) {
      lastMatchEnd = end;
    }
  }

  // No headword or ~ found — don't bold anything
  if (lastMatchEnd <= 0) {
    return { expression: "", explanation: phrase };
  }

  // Skip trailing commas and spaces (but not opening a whole new clause)
  let boundary = lastMatchEnd;
  while (boundary < phrase.length && phrase[boundary] === " ") {
    boundary++;
  }
  // Don't include the next word — it's likely the start of the explanation
  boundary = lastMatchEnd;

  // Trim trailing whitespace/punctuation from expression
  let exprEnd = boundary;
  while (exprEnd > 0 && /[\s,;:]/.test(phrase[exprEnd - 1])) {
    exprEnd--;
  }

  const expression = phrase.substring(0, exprEnd).trim();
  const explanation = phrase.substring(exprEnd).trim();

  if (expression && explanation) {
    return { expression, explanation };
  }

  return { expression: phrase, explanation: "" };
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
  cestica: "честица",
  prefiks: "префикс",
  odrednica: "одредница",
  skracenica: "скраћеница",
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

  // Get homonyms if this word has a homonym number
  const homonyms = await findHomonyms(wordData.cyrillic);
  const hasHomonyms = homonyms.length > 1;

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
                {wordData.homonymNumber > 0 && (
                  <sup className="text-lg text-gray-400 ml-1">{wordData.homonymNumber}</sup>
                )}
              </h1>
              <p className="text-lg text-gray-500 dark:text-gray-400">
                {wordData.latin}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm font-medium">
                {partOfSpeechLabels[wordData.partOfSpeech] || wordData.partOfSpeech}
                {wordData.gender && `, ${wordData.gender} род`}
                {wordData.aspect && `, ${wordData.aspect}`}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                Матица српска, 2011
              </span>
            </div>
          </div>

          {/* Homonym Navigation */}
          {hasHomonyms && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-500 dark:text-gray-400">Хомоними:</span>
              {homonyms.map((h) => {
                const isActive = h.id === wordData.id;
                const suffix = h.homonymNumber > 0 ? `-${h.homonymNumber}` : "";
                return (
                  <Link
                    key={h.id}
                    href={`/rec/${encodeURIComponent(h.latin)}${suffix}`}
                    className={`text-sm px-2 py-0.5 rounded ${
                      isActive
                        ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {h.cyrillic}
                    {h.homonymNumber > 0 && <sup>{h.homonymNumber}</sup>}
                    {" "}
                    <span className="italic text-xs">
                      ({partOfSpeechLabels[h.partOfSpeech] || h.partOfSpeech})
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Pronunciation — only show when data exists */}
          {pronunciation && (pronunciation.audioUrl || pronunciation.ipa || pronunciation.syllables) && (
            <div className="mt-4">
              <AudioPlayer
                audioUrl={pronunciation.audioUrl}
                ipa={pronunciation.ipa}
                syllables={pronunciation.syllables}
              />
            </div>
          )}
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
                subLetter: def.subLetter,
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

        {/* Idioms */}
        {wordData.idioms.length > 0 && (() => {
          // Split each idiom blob into individual phrases
          const allPhrases = wordData.idioms.flatMap((idiom) =>
            splitIdiomPhrases(idiom.phrase)
          );
          if (allPhrases.length === 0) return null;

          return (
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
                    d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
                  />
                </svg>
                Изрази и фразе
              </h2>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <ul className="space-y-2">
                  {allPhrases.map((phrase, idx) => {
                    const { expression, explanation } = splitExpressionAndExplanation(phrase, wordData.cyrillic);
                    return (
                      <li
                        key={idx}
                        className="text-gray-800 dark:text-gray-200 pl-4 border-l-2 border-amber-300 dark:border-amber-600 py-1"
                      >
                        <span className="font-semibold">{expression}</span>
                        {explanation && (
                          <span className="text-gray-600 dark:text-gray-400">
                            {" "}{explanation}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          );
        })()}

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

        {/* Raw Text (Collapsible) */}
        {wordData.rawText && (
          <details className="mb-8">
            <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
              Изворни текст из речника
            </summary>
            <div className="mt-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-700 dark:text-gray-300 font-mono whitespace-pre-wrap">
                <RawTextWithLinks text={wordData.rawText} />
              </p>
            </div>
          </details>
        )}
      </article>
    </div>
  );
}
