import type { DefinitionWithExamples } from "@/types/dictionary";

interface DefinitionListProps {
  definitions: DefinitionWithExamples[];
}

const registerLabels: Record<string, string> = {
  formal: "књиж.",
  colloquial: "разг.",
  archaic: "заст.",
  vulgar: "вулг.",
  slang: "жарг.",
  technical: "тех.",
  literary: "књиж.",
};

const domainLabels: Record<string, string> = {
  medicine: "мед.",
  law: "прав.",
  technology: "тех.",
  biology: "биол.",
  chemistry: "хем.",
  physics: "физ.",
  mathematics: "мат.",
  music: "муз.",
  sports: "спорт.",
  military: "вој.",
  religion: "рел.",
  botany: "бот.",
  zoology: "зоол.",
};

export default function DefinitionList({ definitions }: DefinitionListProps) {
  if (definitions.length === 0) {
    return (
      <p className="text-gray-500 dark:text-gray-400 italic">
        Дефиниција није доступна.
      </p>
    );
  }

  return (
    <ol className="space-y-4">
      {definitions.map((def) => (
        <li key={def.id} className="group">
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm font-medium flex items-center justify-center">
              {def.definitionNumber}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 flex-wrap">
                {def.register && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 italic">
                    {registerLabels[def.register] || def.register}
                  </span>
                )}
                {def.domain && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 italic">
                    {domainLabels[def.domain] || def.domain}
                  </span>
                )}
              </div>
              <p className="text-gray-800 dark:text-gray-200 mt-1">
                {def.definitionText}
              </p>

              {def.examples.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {def.examples.map((example) => (
                    <li
                      key={example.id}
                      className="text-sm text-gray-600 dark:text-gray-400 pl-4 border-l-2 border-gray-200 dark:border-gray-600"
                    >
                      <span className="italic">&quot;{example.exampleText}&quot;</span>
                      {example.translation && (
                        <span className="text-gray-500 dark:text-gray-500 ml-2">
                          — {example.translation}
                        </span>
                      )}
                      {example.source && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                          ({example.source})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
