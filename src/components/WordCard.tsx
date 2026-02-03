import Link from "next/link";
import type { WordSummary } from "@/types/dictionary";

interface WordCardProps {
  word: WordSummary;
  showDefinition?: boolean;
}

const partOfSpeechLabels: Record<string, string> = {
  imenica: "им.",
  glagol: "гл.",
  pridev: "прид.",
  prilog: "прил.",
  zamenica: "зам.",
  predlog: "предл.",
  veznik: "везн.",
  uzvik: "узв.",
  broj: "број",
  čestica: "чест.",
  cestica: "чест.",
  prefiks: "преф.",
  odrednica: "одр.",
  skracenica: "скр.",
};

export default function WordCard({ word, showDefinition = true }: WordCardProps) {
  const posLabel = partOfSpeechLabels[word.partOfSpeech] || word.partOfSpeech;

  const homonymSuffix = word.homonymNumber && word.homonymNumber > 0 ? `-${word.homonymNumber}` : "";
  const href = `/rec/${encodeURIComponent(word.latin)}${homonymSuffix}`;

  return (
    <Link
      href={href}
      className="block p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all bg-white dark:bg-gray-800"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {word.cyrillic}
            {(word.homonymNumber ?? 0) > 0 && (
              <sup className="text-xs text-gray-400 ml-0.5">{word.homonymNumber}</sup>
            )}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {word.latin}
          </p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 italic">
          {posLabel}
        </span>
      </div>
      {showDefinition && word.definition && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
          {word.definition}
        </p>
      )}
    </Link>
  );
}
