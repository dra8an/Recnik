import { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import WordCard from "@/components/WordCard";
import { getWordsByLetter } from "@/lib/search";
import { latinToCyrillic, isCyrillic } from "@/lib/transliterate";

interface PageProps {
  params: Promise<{ letter: string }>;
  searchParams: Promise<{ page?: string }>;
}

const cyrillicAlphabet = [
  "А", "Б", "В", "Г", "Д", "Ђ", "Е", "Ж", "З", "И", "Ј",
  "К", "Л", "Љ", "М", "Н", "Њ", "О", "П", "Р", "С", "Т",
  "Ћ", "У", "Ф", "Х", "Ц", "Ч", "Џ", "Ш",
];

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { letter } = await params;
  const decodedLetter = decodeURIComponent(letter);
  const displayLetter = isCyrillic(decodedLetter)
    ? decodedLetter.toUpperCase()
    : latinToCyrillic(decodedLetter).toUpperCase();

  return {
    title: `Речи на слово ${displayLetter}`,
    description: `Претражите све речи српског језика које почињу на слово ${displayLetter}.`,
  };
}

async function LetterResults({
  letter,
  page,
}: {
  letter: string;
  page: number;
}) {
  const results = await getWordsByLetter(letter, page, 50);

  if (results.words.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          Нема речи за ово слово.
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(results.total / results.pageSize);
  const displayLetter = isCyrillic(letter)
    ? letter.toUpperCase()
    : latinToCyrillic(letter).toUpperCase();

  return (
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Пронађено {results.total} речи на слово &quot;{displayLetter}&quot;
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.words.map((word) => (
          <WordCard key={word.id} word={word} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {page > 1 && (
            <a
              href={`/abeceda/${encodeURIComponent(letter)}?page=${page - 1}`}
              className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Претходна
            </a>
          )}

          <span className="px-4 py-2 text-gray-600 dark:text-gray-400">
            Страница {page} од {totalPages}
          </span>

          {page < totalPages && (
            <a
              href={`/abeceda/${encodeURIComponent(letter)}?page=${page + 1}`}
              className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Следећа
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default async function AlphabetPage({ params, searchParams }: PageProps) {
  const { letter } = await params;
  const { page: pageStr = "1" } = await searchParams;
  const page = parseInt(pageStr, 10) || 1;
  const decodedLetter = decodeURIComponent(letter);

  const displayLetter = isCyrillic(decodedLetter)
    ? decodedLetter.toUpperCase()
    : latinToCyrillic(decodedLetter).toUpperCase();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400">
          Почетна
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 dark:text-gray-100">Абецеда</span>
        <span className="mx-2">/</span>
        <span className="text-gray-900 dark:text-gray-100">{displayLetter}</span>
      </nav>

      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Речи на слово {displayLetter}
      </h1>

      {/* Alphabet Navigation */}
      <div className="mb-8 flex flex-wrap gap-1">
        {cyrillicAlphabet.map((l) => {
          const isActive = l.toLowerCase() === displayLetter.toLowerCase();
          return (
            <Link
              key={l}
              href={`/abeceda/${l.toLowerCase()}`}
              className={`w-9 h-9 flex items-center justify-center text-sm font-medium rounded-lg transition-all ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400"
              }`}
            >
              {l}
            </Link>
          );
        })}
      </div>

      <Suspense
        fallback={
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Учитавање...</p>
          </div>
        }
      >
        <LetterResults letter={decodedLetter} page={page} />
      </Suspense>
    </div>
  );
}
