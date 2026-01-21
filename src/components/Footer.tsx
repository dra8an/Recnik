import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const cyrillicAlphabet = [
    "А", "Б", "В", "Г", "Д", "Ђ", "Е", "Ж", "З", "И", "Ј",
    "К", "Л", "Љ", "М", "Н", "Њ", "О", "П", "Р", "С", "Т",
    "Ћ", "У", "Ф", "Х", "Ц", "Ч", "Џ", "Ш",
  ];

  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
              О Речнику
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Свеобухватни онлајн речник српског језика са дефиницијама, изговором,
              синонимима и граматичким информацијама.
            </p>
          </div>

          {/* Alphabet */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Абецеда
            </h3>
            <div className="flex flex-wrap gap-1">
              {cyrillicAlphabet.map((letter) => (
                <Link
                  key={letter}
                  href={`/abeceda/${letter.toLowerCase()}`}
                  className="w-7 h-7 flex items-center justify-center text-sm rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors"
                >
                  {letter}
                </Link>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Везе
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/pretraga"
                  className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Претрага
                </Link>
              </li>
              <li>
                <Link
                  href="/abeceda/а"
                  className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Претражи по слову
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800 text-center text-sm text-gray-500 dark:text-gray-500">
          <p>&copy; {currentYear} Речник српског језика. Сва права задржана.</p>
          <p className="mt-1">
            Подаци: srLex, Serbian Wiktionary, Serbian WordNet
          </p>
        </div>
      </div>
    </footer>
  );
}
