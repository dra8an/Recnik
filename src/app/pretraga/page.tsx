import { Metadata } from "next";
import { Suspense } from "react";
import SearchBar from "@/components/SearchBar";
import WordCard from "@/components/WordCard";
import { searchWords } from "@/lib/search";

interface SearchPageProps {
  searchParams: Promise<{ q?: string; page?: string; pos?: string }>;
}

export const metadata: Metadata = {
  title: "Претрага",
  description: "Претражите српски речник по речима, дефиницијама или фразама.",
};

async function SearchResults({
  query,
  page,
  partOfSpeech,
}: {
  query: string;
  page: number;
  partOfSpeech?: string;
}) {
  if (!query) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          Унесите реч у поље за претрагу изнад.
        </p>
      </div>
    );
  }

  const results = await searchWords({
    query,
    page,
    pageSize: 20,
    partOfSpeech,
  });

  if (results.words.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Нема резултата за &quot;{query}&quot;
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Покушајте са другим појмом или проверите правопис.
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(results.total / results.pageSize);

  return (
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Пронађено {results.total} резултата за &quot;{query}&quot;
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {results.words.map((word) => (
          <WordCard key={word.id} word={word} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {page > 1 && (
            <a
              href={`/pretraga?q=${encodeURIComponent(query)}&page=${page - 1}${partOfSpeech ? `&pos=${partOfSpeech}` : ""}`}
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
              href={`/pretraga?q=${encodeURIComponent(query)}&page=${page + 1}${partOfSpeech ? `&pos=${partOfSpeech}` : ""}`}
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

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q: query = "", page: pageStr = "1", pos } = await searchParams;
  const page = parseInt(pageStr, 10) || 1;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Претрага
      </h1>

      <div className="max-w-2xl mb-8">
        <SearchBar initialQuery={query} autoFocus={!query} />
      </div>

      {/* Part of Speech Filter */}
      {query && (
        <div className="mb-6 flex flex-wrap gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400 mr-2 self-center">
            Филтер:
          </span>
          <a
            href={`/pretraga?q=${encodeURIComponent(query)}`}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              !pos
                ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            Све
          </a>
          {[
            { value: "imenica", label: "Именице" },
            { value: "glagol", label: "Глаголи" },
            { value: "pridev", label: "Придеви" },
            { value: "prilog", label: "Прилози" },
          ].map(({ value, label }) => (
            <a
              key={value}
              href={`/pretraga?q=${encodeURIComponent(query)}&pos=${value}`}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                pos === value
                  ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {label}
            </a>
          ))}
        </div>
      )}

      <Suspense
        fallback={
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Учитавање...</p>
          </div>
        }
      >
        <SearchResults query={query} page={page} partOfSpeech={pos} />
      </Suspense>
    </div>
  );
}
