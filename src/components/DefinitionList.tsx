import type { DefinitionWithExamples } from "@/types/dictionary";
import { CrossRefText } from "@/components/CrossRefText";

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
  // Matica Srpska register abbreviations
  "razgovorni": "разг.",
  "žargon": "жарг.",
  "figurativno": "фиг.",
  "pejorativno": "пеј.",
  "arhaično": "арх.",
  "knjižovno": "књиж.",
  "narodno": "нар.",
  "pesničko": "песн.",
  "ekspresivno": "експр.",
  "šaljivo": "шаљ.",
  "ironično": "ир.",
  "vulgarno": "вулг.",
  "augmentativno": "аугм.",
  "deminutivno": "дем.",
  "hipokoristik": "хип.",
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
  // Matica Srpska domain abbreviations
  "anatomija": "анат.",
  "astronomija": "астр.",
  "geologija": "геол.",
  "geografija": "геогр.",
  "istorija": "ист.",
  "filozofija": "фил.",
  "arhitektura": "архит.",
  "etnologija": "етн.",
  "informatika": "информ.",
  "crkveno": "цркв.",
  "lingvistika": "лингв.",
  "medicina": "мед.",
  "pravo": "правн.",
  "tehnika": "тех.",
  "biologija": "биол.",
  "hemija": "хем.",
  "fizika": "физ.",
  "matematika": "мат.",
  "muzika": "муз.",
  "sport": "спорт.",
  "vojska": "вој.",
  "religija": "рел.",
  "botanika": "бот.",
  "zoologija": "зоол.",
  "ekonomija": "екон.",
  "politika": "пол.",
  "psihologija": "псих.",
  "farmacija": "фарм.",
  "agronomija": "агр.",
  "pomorstvo": "пом.",
  "gramatika": "грам.",
};

function ExampleList({ examples }: { examples: DefinitionWithExamples["examples"] }) {
  if (examples.length === 0) return null;

  return (
    <ul className="mt-2 space-y-1.5">
      {examples.map((example) => (
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
          {example.source && example.source !== "matica-srpska-2011" && (
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
              ({example.source})
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function DefinitionContent({ def }: { def: DefinitionWithExamples }) {
  return (
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
        <CrossRefText text={def.definitionText} />
      </p>
      <ExampleList examples={def.examples} />
    </div>
  );
}

export default function DefinitionList({ definitions }: DefinitionListProps) {
  if (definitions.length === 0) {
    return (
      <p className="text-gray-500 dark:text-gray-400 italic">
        Дефиниција није доступна.
      </p>
    );
  }

  // Group definitions by definitionNumber
  const groups = new Map<number, DefinitionWithExamples[]>();
  for (const def of definitions) {
    const num = def.definitionNumber;
    if (!groups.has(num)) {
      groups.set(num, []);
    }
    groups.get(num)!.push(def);
  }

  const sortedGroups = [...groups.entries()].sort(([a], [b]) => a - b);

  return (
    <ol className="space-y-4">
      {sortedGroups.map(([num, defs]) => {
        const hasSubLetters = defs.some(d => d.subLetter);

        if (hasSubLetters) {
          // Render grouped sub-definitions
          return (
            <li key={num} className="group">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm font-medium flex items-center justify-center">
                  {num}
                </span>
                <div className="flex-1 min-w-0 space-y-3">
                  {defs.map((def) => (
                    <div key={def.id} className="flex items-start gap-2">
                      {def.subLetter && (
                        <span className="flex-shrink-0 text-sm font-medium text-gray-500 dark:text-gray-400 w-4">
                          {def.subLetter}
                        </span>
                      )}
                      <DefinitionContent def={def} />
                    </div>
                  ))}
                </div>
              </div>
            </li>
          );
        }

        // Single definition (no sub-letters)
        const def = defs[0];
        return (
          <li key={def.id} className="group">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm font-medium flex items-center justify-center">
                {num}
              </span>
              <DefinitionContent def={def} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
