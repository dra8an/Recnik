"use client";

import { useState } from "react";
import type { InflectionData } from "@/types/dictionary";

interface InflectionTableProps {
  inflections: InflectionData[];
  partOfSpeech: string;
  gender?: string | null;
}

const caseLabels: Record<string, string> = {
  nominativ: "Номинатив",
  genitiv: "Генитив",
  dativ: "Датив",
  akuzativ: "Акузатив",
  vokativ: "Вокатив",
  instrumental: "Инструментал",
  lokativ: "Локатив",
};

const caseOrder = [
  "nominativ",
  "genitiv",
  "dativ",
  "akuzativ",
  "vokativ",
  "instrumental",
  "lokativ",
];

const personLabels: Record<string, string> = {
  prvo: "1. лице",
  drugo: "2. лице",
  treće: "3. лице",
};

const tenseLabels: Record<string, string> = {
  prezent: "Презент",
  aorist: "Аорист",
  imperfekat: "Имперфекат",
  perfekat: "Перфекат",
  pluskvamperfekat: "Плусквамперфекат",
  futur: "Футур I",
  futur_II: "Футур II",
};

export default function InflectionTable({
  inflections,
  partOfSpeech,
  gender,
}: InflectionTableProps) {
  const [showLatin, setShowLatin] = useState(false);

  if (inflections.length === 0) {
    return (
      <p className="text-gray-500 dark:text-gray-400 italic">
        Падежи нису доступни.
      </p>
    );
  }

  const getForm = (inf: InflectionData) =>
    showLatin ? inf.formLatin : inf.formCyrillic;

  // Render noun declension table
  if (partOfSpeech === "imenica") {
    const singularForms = inflections.filter((inf) => inf.number === "jednina");
    const pluralForms = inflections.filter((inf) => inf.number === "množina");

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-700 dark:text-gray-300">
            Деклинација именице
            {gender && (
              <span className="ml-2 text-sm text-gray-500">
                ({gender} род)
              </span>
            )}
          </h4>
          <button
            type="button"
            onClick={() => setShowLatin(!showLatin)}
            className="text-sm px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {showLatin ? "Ћирилица" : "Latinica"}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">
                  Падеж
                </th>
                <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">
                  Једнина
                </th>
                <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">
                  Множина
                </th>
              </tr>
            </thead>
            <tbody>
              {caseOrder.map((grammaticalCase) => {
                const singular = singularForms.find(
                  (inf) => inf.case === grammaticalCase
                );
                const plural = pluralForms.find(
                  (inf) => inf.case === grammaticalCase
                );

                if (!singular && !plural) return null;

                return (
                  <tr
                    key={grammaticalCase}
                    className="border-b border-gray-100 dark:border-gray-800"
                  >
                    <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                      {caseLabels[grammaticalCase]}
                    </td>
                    <td className="py-2 px-3 text-gray-900 dark:text-gray-100">
                      {singular ? getForm(singular) : "—"}
                    </td>
                    <td className="py-2 px-3 text-gray-900 dark:text-gray-100">
                      {plural ? getForm(plural) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Render verb conjugation table
  if (partOfSpeech === "glagol") {
    const tenses = [...new Set(inflections.map((inf) => inf.tense))].filter(
      Boolean
    );

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-700 dark:text-gray-300">
            Конјугација глагола
          </h4>
          <button
            type="button"
            onClick={() => setShowLatin(!showLatin)}
            className="text-sm px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {showLatin ? "Ћирилица" : "Latinica"}
          </button>
        </div>

        {tenses.map((tense) => {
          const tenseForms = inflections.filter((inf) => inf.tense === tense);

          return (
            <div key={tense} className="overflow-x-auto">
              <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                {tenseLabels[tense!] || tense}
              </h5>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">
                      Лице
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">
                      Једнина
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">
                      Множина
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {["prvo", "drugo", "treće"].map((person) => {
                    const singular = tenseForms.find(
                      (inf) =>
                        inf.person === person && inf.number === "jednina"
                    );
                    const plural = tenseForms.find(
                      (inf) =>
                        inf.person === person && inf.number === "množina"
                    );

                    if (!singular && !plural) return null;

                    return (
                      <tr
                        key={person}
                        className="border-b border-gray-100 dark:border-gray-800"
                      >
                        <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                          {personLabels[person]}
                        </td>
                        <td className="py-2 px-3 text-gray-900 dark:text-gray-100">
                          {singular ? getForm(singular) : "—"}
                        </td>
                        <td className="py-2 px-3 text-gray-900 dark:text-gray-100">
                          {plural ? getForm(plural) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    );
  }

  // Generic table for other parts of speech
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-700 dark:text-gray-300">
          Облици
        </h4>
        <button
          type="button"
          onClick={() => setShowLatin(!showLatin)}
          className="text-sm px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          {showLatin ? "Ћирилица" : "Latinica"}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">
                Облик
              </th>
              <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">
                Граматичка информација
              </th>
            </tr>
          </thead>
          <tbody>
            {inflections.map((inf) => (
              <tr
                key={inf.id}
                className="border-b border-gray-100 dark:border-gray-800"
              >
                <td className="py-2 px-3 text-gray-900 dark:text-gray-100">
                  {getForm(inf)}
                </td>
                <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                  {inf.grammaticalInfo || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
