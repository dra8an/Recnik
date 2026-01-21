// Type definitions for the Serbian Dictionary

export type PartOfSpeech =
  | "imenica"      // noun
  | "glagol"       // verb
  | "pridev"       // adjective
  | "prilog"       // adverb
  | "zamenica"     // pronoun
  | "predlog"      // preposition
  | "veznik"       // conjunction
  | "uzvik"        // interjection
  | "broj"         // numeral
  | "čestica";     // particle

export type Gender = "muški" | "ženski" | "srednji";

export type GrammaticalCase =
  | "nominativ"
  | "genitiv"
  | "dativ"
  | "akuzativ"
  | "vokativ"
  | "instrumental"
  | "lokativ";

export type Number = "jednina" | "množina";

export type Person = "prvo" | "drugo" | "treće";

export type Tense =
  | "prezent"
  | "aorist"
  | "imperfekat"
  | "perfekat"
  | "pluskvamperfekat"
  | "futur"
  | "futur_II";

export type Mood = "indikativ" | "imperativ" | "kondicional";

export type VerbAspect = "svršeni" | "nesvršeni";

export type RelationType =
  | "synonym"
  | "antonym"
  | "hypernym"
  | "hyponym"
  | "derived"
  | "compound";

export interface WordSummary {
  id: string;
  word: string;
  cyrillic: string;
  latin: string;
  partOfSpeech: string;
  definition?: string;
}

export interface WordDetail {
  id: string;
  word: string;
  cyrillic: string;
  latin: string;
  partOfSpeech: string;
  gender?: string | null;
  aspect?: string | null;
  frequencyRank?: number | null;
  isCommon: boolean;
  definitions: DefinitionWithExamples[];
  pronunciations: PronunciationData[];
  etymologies: EtymologyData[];
  synonyms: WordSummary[];
  antonyms: WordSummary[];
  relatedWords: WordSummary[];
}

export interface DefinitionWithExamples {
  id: string;
  definitionText: string;
  definitionNumber: number;
  register?: string | null;
  domain?: string | null;
  examples: ExampleData[];
}

export interface ExampleData {
  id: string;
  exampleText: string;
  source?: string | null;
  translation?: string | null;
}

export interface PronunciationData {
  id: string;
  ipa?: string | null;
  audioUrl?: string | null;
  syllables?: string | null;
  stressPosition?: number | null;
}

export interface EtymologyData {
  id: string;
  originLanguage?: string | null;
  etymologyText: string;
  cognates?: string | null;
}

export interface InflectionData {
  id: string;
  form: string;
  formCyrillic: string;
  formLatin: string;
  grammaticalInfo?: string | null;
  case?: string | null;
  number?: string | null;
  gender?: string | null;
  person?: string | null;
  tense?: string | null;
  mood?: string | null;
  voice?: string | null;
  definiteness?: string | null;
  degree?: string | null;
}

export interface SearchResult {
  words: WordSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface WordOfDayData {
  word: WordDetail;
  date: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Inflection table types for display
export interface NounInflectionTable {
  jednina: Record<GrammaticalCase, string>;
  množina: Record<GrammaticalCase, string>;
}

export interface VerbConjugationTable {
  prezent: Record<Person, { jednina: string; množina: string }>;
  perfekat?: Record<Person, { jednina: string; množina: string }>;
  futur?: Record<Person, { jednina: string; množina: string }>;
  imperativ?: { jednina: string; množina: string };
  infinitiv: string;
  glagolskiPridevRadni?: { muški: string; ženski: string; srednji: string };
  glagolskiPridevTrpni?: string;
  glagolskiPrilogSadašnji?: string;
  glagolskiPrilogProšli?: string;
}

export interface AdjectiveInflectionTable {
  pozitiv: {
    određeni: Record<Gender, Record<GrammaticalCase, { jednina: string; množina: string }>>;
    neodređeni: Record<Gender, Record<GrammaticalCase, { jednina: string; množina: string }>>;
  };
  komparativ?: string;
  superlativ?: string;
}
