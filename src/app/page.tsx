import Link from "next/link";
import SearchBar from "@/components/SearchBar";

export default function HomePage() {
  const cyrillicAlphabet = [
    "А", "Б", "В", "Г", "Д", "Ђ", "Е", "Ж", "З", "И", "Ј",
    "К", "Л", "Љ", "М", "Н", "Њ", "О", "П", "Р", "С", "Т",
    "Ћ", "У", "Ф", "Х", "Ц", "Ч", "Џ", "Ш",
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="text-center py-16 md:py-24">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Речник српског језика
        </h1>
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
          Свеобухватни онлајн речник са преко 70.000 речи, дефиницијама,
          етимологијом, синонимима и граматичким информацијама.
        </p>

        <div className="max-w-2xl mx-auto">
          <SearchBar size="large" autoFocus />
        </div>

        <p className="mt-4 text-sm text-gray-500 dark:text-gray-500">
          Притисните{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 font-mono text-xs">
            /
          </kbd>{" "}
          за брзу претрагу
        </p>
      </section>

      {/* Browse by Letter */}
      <section className="py-12 border-t border-gray-200 dark:border-gray-800">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6 text-center">
          Претражи по слову
        </h2>
        <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
          {cyrillicAlphabet.map((letter) => (
            <Link
              key={letter}
              href={`/abeceda/${letter.toLowerCase()}`}
              className="w-10 h-10 flex items-center justify-center text-lg font-medium rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 hover:shadow-md transition-all"
            >
              {letter}
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-12 border-t border-gray-200 dark:border-gray-800">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-8 text-center">
          Могућности
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6 text-blue-600 dark:text-blue-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Дефиниције
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Детаљне дефиниције са примерима коришћења из српског језика.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6 text-green-600 dark:text-green-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Етимологија
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Порекло речи и језици из којих су преузете.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6 text-purple-600 dark:text-purple-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Синоними
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Синоними, антоними и повезане речи за богатији вокабулар.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6 text-amber-600 dark:text-amber-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Изрази и фразе
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Идиоматски изрази, фразе и устаљене конструкције српског језика.
            </p>
          </div>
        </div>
      </section>

      {/* Scripts Section */}
      <section className="py-12 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Ћирилица и латиница
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Речник подржава претрагу и приказ речи на оба српска писма.
            Унесите реч на ћирилици или латиници - речник ће аутоматски
            пронаћи одговарајуће резултате.
          </p>
          <div className="mt-6 flex justify-center gap-8 text-2xl font-medium">
            <span className="text-gray-900 dark:text-gray-100">Реч</span>
            <span className="text-gray-400">=</span>
            <span className="text-gray-900 dark:text-gray-100">Reč</span>
          </div>
        </div>
      </section>
    </div>
  );
}
