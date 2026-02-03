/**
 * Comprehensive Parser for Matica Srpska Dictionary (Rečnik srpskoga jezika, 2011)
 *
 * Two-pass architecture:
 *   Pass 1: Line normalization (strip page markers, headers, rejoin split entries)
 *   Pass 2: Entry parsing (extract structured data from each entry line)
 *
 * Target: 80,000–90,000 entries from ~72K raw content lines
 */

import * as fs from "fs";
import * as path from "path";

const INPUT_FILE = path.join(
  process.cwd(),
  "data",
  "raw",
  "matica-srpska",
  "recnik-corrected.txt"
);
const OUTPUT_FILE = path.join(
  process.cwd(),
  "data",
  "processed",
  "matica-srpska-parsed.json"
);

// ─── Types ───────────────────────────────────────────────────────────────────

interface ParsedDefinition {
  number: number;
  subLetter?: string;
  text: string;
  domain?: string;
  register?: string;
  examples: string[];
}

interface CrossReference {
  type: "see" | "compare";
  target: string;
}

interface ParsedEntry {
  headword: string;
  headwordClean: string;
  homonymNumber: number;
  alternativeForms: string[];
  partOfSpeech: string;
  gender?: string;
  aspect?: string;
  inflectionInfo?: string;
  etymology?: string;
  definitions: ParsedDefinition[];
  idioms: string[];
  crossReferences: CrossReference[];
  hasReflexive: boolean;
  rawText: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ETYMOLOGY_MAPPINGS: Record<string, string> = {
  "грч.": "grčki",
  "лат.": "latinski",
  "фр.": "francuski",
  "нем.": "nemački",
  "итал.": "italijanski",
  "тур.": "turski",
  "енгл.": "engleski",
  "мађ.": "mađarski",
  "рус.": "ruski",
  "шп.": "španski",
  "перс.": "persijski",
  "араб.": "arapski",
  "јап.": "japanski",
  "порт.": "portugalski",
  "хол.": "holandski",
  "чеш.": "češki",
  "пољ.": "poljski",
  "алб.": "albanski",
  "рум.": "rumunski",
  "хебр.": "hebrejski",
  "санскр.": "sanskrtski",
  "кин.": "kineski",
  "грч.-лат.": "grčko-latinski",
  "лат.-грч.": "latinsko-grčki",
  "грч.-фр.": "grčko-francuski",
  "фр.-лат.": "francusko-latinski",
  "нем.-фр.": "nemačko-francuski",
  "грч.-нем.": "grčko-nemački",
  "итал.-лат.": "italijansko-latinski",
  "фр.-итал.": "francusko-italijanski",
  "грч.-енгл.": "grčko-engleski",
};

const DOMAIN_ABBREVIATIONS: Record<string, string> = {
  "анат.": "anatomija",
  "астр.": "astronomija",
  "биол.": "biologija",
  "бот.": "botanika",
  "вој.": "vojska",
  "геогр.": "geografija",
  "геол.": "geologija",
  "грам.": "gramatika",
  "екон.": "ekonomija",
  "ел.": "elektrotehnika",
  "етн.": "etnologija",
  "зоол.": "zoologija",
  "информ.": "informatika",
  "ист.": "istorija",
  "лингв.": "lingvistika",
  "мат.": "matematika",
  "мед.": "medicina",
  "мет.": "meteorologija",
  "муз.": "muzika",
  "пол.": "politika",
  "правн.": "pravo",
  "псих.": "psihologija",
  "тех.": "tehnika",
  "техн.": "tehnika",
  "физ.": "fizika",
  "фил.": "filozofija",
  "филоз.": "filozofija",
  "фин.": "finansije",
  "фото.": "fotografija",
  "хем.": "hemija",
  "цркв.": "crkva",
  "архит.": "arhitektura",
  "спорт.": "sport",
  "кув.": "kuvarstvo",
  "фарм.": "farmacija",
  "мин.": "mineralogija",
  "пом.": "pomorstvo",
  "шум.": "šumarstvo",
  "лов.": "lovstvo",
  "риб.": "ribarstvo",
  "мит.": "mitologija",
  "рет.": "retorika",
};

const REGISTER_ABBREVIATIONS: Record<string, string> = {
  "разг.": "razgovorni",
  "жарг.": "žargon",
  "фиг.": "figurativno",
  "пеј.": "pejorativno",
  "арх.": "arhaično",
  "заст.": "zastarelo",
  "књиж.": "književno",
  "нар.": "narodno",
  "песн.": "pesničko",
  "експр.": "ekspresivno",
  "шаљ.": "šaljivo",
  "ир.": "ironično",
  "вулг.": "vulgarno",
  "покр.": "pokrajinsko",
  "необ.": "neobično",
  "дем.": "deminutiv",
  "аугм.": "augmentativ",
  "хип.": "hipokoristik",
  "зб.": "zbirno",
};

// POS tokens that explicitly mark entry starts
const EXPLICIT_POS_TOKENS = [
  "м",
  "ж",
  "с",
  "свр.",
  "несвр.",
  "прил.",
  "прил",
  "прид.",
  "узв.",
  "узв",
  "узвик",
  "везн.",
  "везн",
  "предл.",
  "предл",
  "речца",
  "реч.",
  "бр.",
  "зам.",
  "оном.",
  "преф.",
  "префикс",
  "префиксоид",
  "скраћ.",
  "скраћеница",
  "непром.",
];

// Serbian Cyrillic character classes (а-я covers base, but ј/љ/њ/ђ/ћ/џ are outside that range)
const CYR_LOWER = "а-яђјљњћџ";
const CYR_UPPER = "А-ЯЂЈЉЊЋЏ";
const CYR_ALL = `${CYR_LOWER}${CYR_UPPER}`;

// ─── Pass 1: Line Normalization ──────────────────────────────────────────────

function normalizeLines(rawText: string): string[] {
  const rawLines = rawText.split("\n");
  const contentLines: string[] = [];

  // Regex for ALL-CAPS running headers (using full Cyrillic uppercase range)
  const headerRegex = new RegExp(
    `^[${CYR_UPPER}()]{2,}\\s*[–\\-]\\s*[${CYR_UPPER}()]{2,}$`
  );

  for (const line of rawLines) {
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) continue;

    // Skip comment/header lines at start
    if (trimmed.startsWith("#")) continue;

    // Skip page markers: --- PAGE NNN ---
    if (/^--- PAGE \d+ ---$/.test(trimmed)) continue;

    // Skip ALL-CAPS running headers: WORD – WORD or WORD - WORD
    if (headerRegex.test(trimmed)) continue;

    // Skip lone letter section headers (e.g. "Ј" on its own line)
    if (new RegExp(`^[${CYR_UPPER}]$`).test(trimmed)) continue;

    contentLines.push(trimmed);
  }

  return contentLines;
}

// ─── Entry Detection ─────────────────────────────────────────────────────────

/**
 * Determine if a line is the start of a new dictionary entry.
 * Must start with a Cyrillic letter (lowercase or uppercase) and match one of:
 *   1. Explicit POS token within first ~100 chars
 *   2. Adjective suffix pattern: , -а, -о or , -Xна, -о etc.
 *   3. Verb conjugation pattern: , -suffix followed by aspect
 *   4. Cross-reference-only: в. <word>
 *   5. Prefix entry: word ending with - and преф. or префиксоид
 */
function isEntryStart(line: string): boolean {
  const cyrLowerRe = `[${CYR_LOWER}]`;
  const cyrAllRe = `[${CYR_ALL}]`;

  // Must start with Cyrillic letter or be a suffix entry (starting with -)
  const startRe = new RegExp(`^(?:${cyrAllRe}|-${cyrLowerRe})`);
  if (!startRe.test(line)) return false;

  // Too short to be an entry
  if (line.length < 3) return false;

  const searchArea = line.substring(0, 120);

  // 1. Explicit POS tokens
  // Check for standalone POS tokens (space-delimited or after punctuation)
  for (const token of EXPLICIT_POS_TOKENS) {
    // Match token preceded by space and followed by space, period, or end
    const escaped = token.replace(/\./g, "\\.");
    const regex = new RegExp(`\\s${escaped}(?:\\s|$|[,()])`, "");
    if (regex.test(searchArea)) return true;
  }

  // Also check for noun gender markers that may appear after parenthetical
  // e.g. "абоносовина и абоносовина ж (мн. о)"
  if (/\s[мжс]\s*\(/.test(searchArea)) return true;

  // 2a. Adjective suffix pattern: , -а, -о or , -Xна, -о (within first portion)
  // Matches: абнормалан, -лна, -о | абецедни, -а, -о | несвакидашњи, -а, -е
  if (new RegExp(`,\\s*-${cyrLowerRe}{1,6},\\s*-[ое]\\s`).test(searchArea)) return true;

  // 2b. Adjective with full feminine form: благ, блага, -о | бесан, бесна, бесно
  // Also: бео јек. бијел, бела, бело
  if (new RegExp(`,\\s+${cyrLowerRe}{2,10},\\s*(?:-[ое]|${cyrLowerRe}{2,10})\\s`).test(searchArea)) {
    // Verify it's not just a regular sentence — must have numbered defs or short length
    if (/\s\d+\.\s/.test(line) || line.length < 200 || /:\s*~/.test(line) ||
        /који\s/.test(searchArea) || /(?:^|\s)в\./.test(searchArea)) {
      return true;
    }
  }

  // 3. Verb conjugation pattern: , -suffix свр./несвр./(свр.)/(несвр.)
  if (new RegExp(`,\\s*-${cyrLowerRe}{1,10}\\s+(свр|несвр|свр\\.|несвр\\.)`).test(searchArea)) return true;
  // Also: , -suffix свр. и несвр.
  if (new RegExp(`,\\s*-${cyrLowerRe}{1,10}\\s+свр\\.\\s+(и|или)\\s+несвр\\.`).test(searchArea)) return true;

  // 4. Cross-reference-only entries: headword + optional grammar + в. target
  // Use lookahead-style: check that "в." appears after space, preceded by headword area
  if (/\sв\.\s/.test(searchArea) && line.length < 200) {
    // Verify it starts with a headword (Cyrillic), not mid-sentence
    if (new RegExp(`^${cyrAllRe}`).test(line)) return true;
  }

  // 5. Prefix/suffix entries: headword ending/starting with -
  // Match "преф.", "префиксоид", "префикс" (full word), and "први део" (compound prefix marker)
  const prefixRe = new RegExp(`^${cyrLowerRe}+-\\s`);
  if (prefixRe.test(searchArea) &&
      (searchArea.includes("преф") || searchArea.includes("префиксоид") ||
       searchArea.includes("префикс") || searchArea.includes("први део"))) {
    return true;
  }
  // Also: compound prefix words like "ауто-мото", "антибеби-"
  const compoundPrefixRe = new RegExp(`^${cyrLowerRe}+-(?:${cyrLowerRe}+-?)?\\s`);
  if (compoundPrefixRe.test(searchArea) &&
      (searchArea.includes("први део") || searchArea.includes("као први"))) {
    return true;
  }
  // Suffix compound entries: -год, -годишњак, -графија etc.
  const suffixEntryRe = new RegExp(`^-${cyrLowerRe}+\\s`);
  if (suffixEntryRe.test(searchArea)) return true;

  // 6. Entries with "и" alternatives + adjective pattern
  // e.g. "абецедарни и абецедарни, -а, -о"
  if (new RegExp(`^${cyrLowerRe}+\\s+и\\s+${cyrLowerRe}+,\\s*-${cyrLowerRe}{1,6},\\s*-[ое]`).test(searchArea)) {
    return true;
  }

  // 7. Adverbs: "прил." pattern
  if (/\sприл\.?\s/.test(searchArea)) return true;

  // 8. Entries with "јек." (Jekavian) marker
  if (/\sјек\.\s/.test(searchArea)) return true;

  // 9. Entries followed by etymology abbreviation and definition
  // e.g. "барутана тур. зграда..." — noun with etymology, no explicit gender
  for (const marker of Object.keys(ETYMOLOGY_MAPPINGS)) {
    const escaped = marker.replace(/\./g, "\\.");
    if (new RegExp(`\\s${escaped}\\s`).test(searchArea)) {
      // Must have definition content after etymology (not just a see-reference)
      if (line.length > 30) return true;
      break;
    }
  }

  // 10. Entries with numbered definitions near the start (strong indicator)
  // e.g. "бесан, бесна, бесно 1. обузет бесом"
  if (new RegExp(`^${cyrLowerRe}+.*\\s1\\.\\s`).test(searchArea)) return true;

  // 11. Entries with "зоол.", "бот." and other domain markers in first 80 chars
  const first80 = line.substring(0, 80);
  for (const marker of Object.keys(DOMAIN_ABBREVIATIONS)) {
    if (first80.includes(marker)) return true;
  }

  // 12. Verbal nouns: "гл. им. од"
  if (/\sгл\.\s*им\.\s/.test(searchArea)) return true;

  // 13. Diminutives/augmentatives used as entry markers: "дем. од", "аугм. од"
  if (/\sдем\.\s+од\s/.test(searchArea)) return true;
  if (/\sаугм\.\s+од\s/.test(searchArea)) return true;

  // 14. Comparative forms: "комп. од"
  if (/\sкомп\.\s+од\s/.test(searchArea)) return true;

  // 15. Numeral entries: "основни број", "збирни број", "редни број", "бројни придев"
  if (/основни\s+број/.test(searchArea)) return true;
  if (/збирни\s+број/.test(searchArea)) return true;
  if (/редни\s+број/.test(searchArea)) return true;
  if (/бројни\s+придев/.test(searchArea)) return true;

  // 16. Entries with "(ж. род)" or "(м. род)" gender markers
  if (/\(ж\.\s*род\)/.test(searchArea)) return true;
  if (/\(м\.\s*род\)/.test(searchArea)) return true;

  // 17. Entries with "мн." (plural only) marker: "у мн.:"
  if (/\sу\s+мн\./.test(searchArea)) return true;

  return false;
}

// ─── Pass 2: Entry Parsing ───────────────────────────────────────────────────

function extractHomonymNumber(headword: string): { clean: string; number: number } {
  const superscriptMap: Record<string, string> = {
    "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5",
    "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁰": "0",
  };

  let num = 0;
  let clean = headword;

  // Check for trailing superscript digits
  const superMatch = headword.match(/[¹²³⁴⁵⁶⁷⁸⁹⁰]+$/);
  if (superMatch) {
    const digits = superMatch[0]
      .split("")
      .map((ch) => superscriptMap[ch] || ch)
      .join("");
    num = parseInt(digits, 10) || 0;
    clean = headword.slice(0, -superMatch[0].length);
  }

  return { clean, number: num };
}

function cleanHeadword(word: string): string {
  let clean = word;

  // Remove superscript numbers
  clean = clean.replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰]+$/, "");

  // Remove trailing comma/punctuation
  clean = clean.replace(/[,.:;]+$/, "");

  // Remove stress/accent marks (combining diacritical marks)
  // but preserve Cyrillic characters
  clean = clean
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .normalize("NFC");

  // Remove parenthetical variants for clean form: абак(ус) -> абакус
  // But keep both forms noted as alternatives
  clean = clean.replace(/\(([^)]+)\)/g, "$1");

  return clean.trim();
}

function extractAlternativeForms(headwordPart: string): string[] {
  const alts: string[] = [];

  // Pattern: "word и word" or "word (word)" at the start
  const andRegex = new RegExp(
    `^([${CYR_ALL}\\-()]+)\\s+и\\s+([${CYR_ALL}\\-()]+)`
  );
  const andMatch = headwordPart.match(andRegex);
  if (andMatch) {
    alts.push(cleanHeadword(andMatch[2]));
  }

  // Parenthetical form: абак(ус) means both абак and абакус
  const parenRegex = new RegExp(
    `^([${CYR_ALL}]+)\\(([${CYR_ALL}]+)\\)`
  );
  const parenMatch = headwordPart.match(parenRegex);
  if (parenMatch) {
    alts.push(parenMatch[1]); // short form without parens content
  }

  return alts;
}

function detectPartOfSpeech(
  text: string
): {
  pos: string;
  gender?: string;
  aspect?: string;
  inflectionInfo?: string;
  etymology?: string;
  defStartPos: number;
} | null {
  // We need to scan through the first part of the entry to find POS markers
  const words = text.split(/\s+/);

  let pos = "";
  let gender: string | undefined;
  let aspect: string | undefined;
  let inflectionInfo: string | undefined;
  let etymology: string | undefined;
  let defStartIdx = 1; // index into words array

  // First, extract inflection info from after headword
  // e.g. ", -ура" or ", -лна, -о" or ", -ицирам"
  const inflRegex = new RegExp(
    `^[${CYR_ALL}\\s\\-()¹²³⁴⁵⁶⁷⁸⁹⁰и]+?(,\\s*-[${CYR_LOWER}]{1,10}(?:,\\s*-[${CYR_LOWER}]{1,10})*)`
  );
  const inflMatch = text.match(inflRegex);
  if (inflMatch) {
    inflectionInfo = inflMatch[1].trim();
  }

  const searchLimit = Math.min(words.length, 25);

  for (let i = 1; i < searchLimit; i++) {
    const w = words[i];

    // Skip inflection suffixes
    if (w.startsWith("-") || w === "и" || w === "(и)") continue;
    // Skip parenthetical content
    if (/^\(/.test(w) && !/^\([а-яА-Я]+\.\)/.test(w)) continue;

    // Noun gender markers
    if (/^м[.,\s]?$/.test(w) || w === "м") {
      pos = "imenica";
      gender = "muški";
      defStartIdx = i + 1;
    } else if (/^ж[.,\s]?$/.test(w) || w === "ж") {
      pos = "imenica";
      gender = "ženski";
      defStartIdx = i + 1;
    } else if (
      /^с[.,\s]?$/.test(w) &&
      // Avoid matching "с" as preposition in definitions
      i < 8
    ) {
      pos = "imenica";
      gender = "srednji";
      defStartIdx = i + 1;
    }
    // Handle "ж и м" or "м и ж" (both genders)
    else if (
      (w === "м" || w === "ж") &&
      i + 2 < words.length &&
      words[i + 1] === "и" &&
      (words[i + 2] === "м" || words[i + 2] === "ж")
    ) {
      pos = "imenica";
      gender = "muški i ženski";
      defStartIdx = i + 3;
    }
    // Verb aspect markers
    else if (/^свр\./.test(w)) {
      pos = "glagol";
      // Check for "свр. и несвр." or "свр. (несвр.)"
      if (
        i + 2 < words.length &&
        (words[i + 1] === "и" || words[i + 1] === "(и)") &&
        /^несвр\./.test(words[i + 2])
      ) {
        aspect = "dvovidski";
        defStartIdx = i + 3;
      } else if (
        i + 1 < words.length &&
        /^\(несвр\.\)/.test(words[i + 1])
      ) {
        aspect = "dvovidski";
        defStartIdx = i + 2;
      } else {
        aspect = "svršeni";
        defStartIdx = i + 1;
      }
    } else if (/^несвр\./.test(w)) {
      pos = "glagol";
      aspect = "nesvršeni";
      defStartIdx = i + 1;
    }
    // Combined aspect: "свр. и несвр." written as single-ish token
    else if (w === "свр" || w === "свр.") {
      pos = "glagol";
      aspect = "svršeni";
      defStartIdx = i + 1;
    } else if (w === "несвр" || w === "несвр.") {
      pos = "glagol";
      aspect = "nesvršeni";
      defStartIdx = i + 1;
    }
    // Adverb
    else if (w === "прил." || w === "прил") {
      pos = "prilog";
      defStartIdx = i + 1;
    }
    // Interjection
    else if (w === "узв." || w === "узв" || w === "узвик") {
      pos = "uzvik";
      defStartIdx = i + 1;
    }
    // Conjunction
    else if (w === "везн." || w === "везн") {
      pos = "veznik";
      defStartIdx = i + 1;
    }
    // Preposition
    else if (w === "предл." || w === "предл") {
      pos = "predlog";
      defStartIdx = i + 1;
    }
    // Particle
    else if (w === "речца" || w === "реч.") {
      pos = "cestica";
      defStartIdx = i + 1;
    }
    // Numeral
    else if (w === "бр." || w === "бр") {
      pos = "broj";
      defStartIdx = i + 1;
    }
    // Pronoun
    else if (w === "зам." || w === "зам") {
      pos = "zamenica";
      defStartIdx = i + 1;
    }
    // Onomatopoeia - classify as uzvik
    else if (w === "оном." || w === "оном") {
      pos = "uzvik";
      defStartIdx = i + 1;
    }
    // Prefix
    else if (w === "преф." || w === "преф" || w === "префиксоид") {
      pos = "prefiks";
      defStartIdx = i + 1;
    }
    // Abbreviated adjective marker
    else if (w === "прид." || w === "прид") {
      pos = "pridev";
      defStartIdx = i + 1;
    }
    // Verbal noun marker: гл. им.
    else if (w === "гл." && i + 1 < words.length && words[i + 1] === "им.") {
      pos = "imenica";
      gender = "srednji";
      defStartIdx = i + 2;
    }
    // Abbreviation entries
    else if (w === "скраћ." || w === "скраћ" || w === "скраћеница") {
      pos = "skracenica";
      defStartIdx = i + 1;
    }
    // Undeclinable marker
    else if (w === "непром." || w === "непром") {
      // This modifies but doesn't set POS on its own
      defStartIdx = i + 1;
    }
    // Gender in parenthetical: (ж. род), (м. род)
    else if (w === "(ж." && i + 1 < words.length && words[i + 1] === "род)") {
      if (!pos) pos = "pridev";
      gender = "ženski";
      defStartIdx = i + 2;
    } else if (w === "(м." && i + 1 < words.length && words[i + 1] === "род)") {
      if (!pos) pos = "pridev";
      gender = "muški";
      defStartIdx = i + 2;
    }

    // Check for etymology
    for (const [marker, lang] of Object.entries(ETYMOLOGY_MAPPINGS)) {
      if (w === marker || w === marker.replace(/\.$/, "")) {
        etymology = lang;
        defStartIdx = Math.max(defStartIdx, i + 1);
        break;
      }
    }

    // If we found POS, also check remaining words for etymology then stop
    if (pos) {
      for (let j = i + 1; j < Math.min(words.length, i + 5); j++) {
        for (const [marker, lang] of Object.entries(ETYMOLOGY_MAPPINGS)) {
          if (words[j] === marker || words[j] === marker.replace(/\.$/, "")) {
            etymology = lang;
            defStartIdx = Math.max(defStartIdx, j + 1);
          }
        }
      }
      break;
    }
  }

  // If no explicit POS found, try adjective patterns
  if (!pos) {
    const adjSuffixRegex = new RegExp(`,\\s*-[${CYR_LOWER}]{1,6},\\s*-[ое]\\s`);
    // Pattern A: suffix form: , -а, -о or , -Xна, -о
    if (adjSuffixRegex.test(text.substring(0, 120))) {
      pos = "pridev";
      const adjMatch = text.match(adjSuffixRegex);
      if (adjMatch) {
        const adjEnd = text.indexOf(adjMatch[0]) + adjMatch[0].length;
        const beforeAdj = text.substring(0, adjEnd);
        defStartIdx = beforeAdj.split(/\s+/).length;
        const afterAdj = text.substring(adjEnd).trim();
        for (const [marker, lang] of Object.entries(ETYMOLOGY_MAPPINGS)) {
          if (afterAdj.startsWith(marker) || afterAdj.startsWith(marker.replace(/\.$/, ""))) {
            etymology = lang;
            defStartIdx++;
            break;
          }
        }
      }
    }

    // Pattern B: full feminine form: благ, блага, -о | бео јек. бијел, бела, бело
    if (!pos) {
      const adjFullRegex = new RegExp(
        `,\\s+[${CYR_LOWER}]{2,10},\\s*(?:-[ое]|[${CYR_LOWER}]{2,10})\\s`
      );
      if (adjFullRegex.test(text.substring(0, 120))) {
        pos = "pridev";
        const adjMatch = text.match(adjFullRegex);
        if (adjMatch) {
          const adjEnd = text.indexOf(adjMatch[0]) + adjMatch[0].length;
          const beforeAdj = text.substring(0, adjEnd);
          defStartIdx = beforeAdj.split(/\s+/).length;
          // Skip optional (комп. ...) parenthetical
          const afterAdj = text.substring(adjEnd).trim();
          if (afterAdj.startsWith("(комп.")) {
            const closeParen = afterAdj.indexOf(")");
            if (closeParen >= 0) {
              defStartIdx += afterAdj.substring(0, closeParen + 1).split(/\s+/).length;
            }
          }
          for (const [marker, lang] of Object.entries(ETYMOLOGY_MAPPINGS)) {
            const afterAll = text.substring(0, 200);
            if (afterAll.includes(marker)) {
              etymology = lang;
              break;
            }
          }
        }
      }
    }
  }

  // If still no POS, check for cross-reference-only entries
  if (!pos) {
    const crossRefTest = new RegExp(`(?:^|\\s)в\\.\\s+[${CYR_LOWER}]`);
    if (crossRefTest.test(text) && text.length < 200) {
      if (/\sм[.,\s]/.test(text.substring(0, 60))) {
        pos = "imenica";
        gender = "muški";
      } else if (/\sж[.,\s]/.test(text.substring(0, 60))) {
        pos = "imenica";
        gender = "ženski";
      } else if (new RegExp(`,\\s*-[${CYR_LOWER}]{1,6},\\s*-[ое]`).test(text.substring(0, 80))) {
        pos = "pridev";
      } else {
        pos = "odrednica";
      }
      defStartIdx = 1;
    }
  }

  // If still no POS, try to infer from entry content
  if (!pos) {
    // Entries with etymology + definition but no explicit POS
    // Try to guess from headword ending: -а/-ица/-ост = ж, -ак/-ар = м, -ње/-ло = с
    const headwordMatch = text.match(new RegExp(`^([${CYR_ALL}\\-()]+)`));
    const hw = headwordMatch ? headwordMatch[1].replace(/[()¹²³⁴⁵⁶⁷⁸⁹⁰]/g, "") : "";

    // Check if it has definitions (numbered or descriptive)
    if (/\s\d+\.\s/.test(text) || text.length > 50) {
      // Check for "јек." marker — these are variant entries
      if (/\sјек\.\s/.test(text)) {
        pos = "odrednica";
        defStartIdx = 1;
      }
      // Check for "први део" or "префикс" markers
      else if (/\sпрефикс\s/.test(text) || /\sпрви\s+део\s/.test(text) || /\sкао\s+први\s/.test(text)) {
        pos = "prefiks";
        // Find defStartIdx after the marker
        const prefixMarkerIdx = text.search(/(?:префикс|први\s+део|као\s+први)/);
        if (prefixMarkerIdx >= 0) {
          const beforeMarker = text.substring(0, prefixMarkerIdx);
          defStartIdx = beforeMarker.split(/\s+/).length;
        }
      }
      // Domain markers suggest a noun
      else if (Object.keys(DOMAIN_ABBREVIATIONS).some(m => text.substring(0, 80).includes(m))) {
        pos = "imenica";
        // Try gender from word ending
        if (/а$/.test(hw) || /ост$/.test(hw) || /ица$/.test(hw)) gender = "ženski";
        else if (/о$/.test(hw) || /е$/.test(hw) || /ње$/.test(hw)) gender = "srednji";
        else gender = "muški";
      }
      // Etymology markers with definition content
      else if (etymology && text.length > 40) {
        pos = "imenica";
        if (/а$/.test(hw) || /ост$/.test(hw) || /ица$/.test(hw)) gender = "ženski";
        else if (/о$/.test(hw) || /е$/.test(hw) || /ње$/.test(hw)) gender = "srednji";
        else gender = "muški";
      }
      // Numeral entries: "основни број", "збирни број", "редни број"
      else if (/основни\s+број/.test(text) || /збирни\s+број/.test(text) || /редни\s+број/.test(text)) {
        pos = "broj";
        defStartIdx = 1;
      }
      // Numeral adjective: "бројни придев"
      else if (/бројни\s+придев/.test(text)) {
        pos = "pridev";
        defStartIdx = 1;
      }
      // Comparative forms: "комп. од"
      else if (/комп\.\s+од\s/.test(text)) {
        pos = "prilog";
        defStartIdx = 1;
      }
      // Diminutive/augmentative: "дем. од", "аугм. од"
      else if (/дем\.\s+од\s/.test(text) || /аугм\.\s+од\s/.test(text)) {
        pos = "imenica";
        if (/а$/.test(hw) || /ица$/.test(hw)) gender = "ženski";
        else if (/о$/.test(hw) || /е$/.test(hw) || /це$/.test(hw)) gender = "srednji";
        else gender = "muški";
        defStartIdx = 1;
      }
      // Verbal noun: "гл. им. од"
      else if (/гл\.\s*им\.\s+од\s/.test(text)) {
        pos = "imenica";
        gender = "srednji";
        defStartIdx = 1;
      }
      // Has numbered definitions — likely a content word
      else if (/\s1\.\s/.test(text)) {
        pos = "imenica";
        if (/а$/.test(hw) || /ост$/.test(hw) || /ица$/.test(hw)) gender = "ženski";
        else if (/о$/.test(hw) || /е$/.test(hw) || /ње$/.test(hw)) gender = "srednji";
        else gender = "muški";
      }
    }
  }

  if (!pos) return null;

  // Calculate character position for definition start
  let charPos = 0;
  for (let i = 0; i < defStartIdx && i < words.length; i++) {
    charPos = text.indexOf(words[i], charPos) + words[i].length;
  }

  return {
    pos,
    gender,
    aspect,
    inflectionInfo,
    etymology,
    defStartPos: charPos,
  };
}

function extractDomainAndRegister(
  text: string
): { domain?: string; register?: string; cleanText: string } {
  let domain: string | undefined;
  let register: string | undefined;
  let cleanText = text;

  // Check for domain at the start of definition text
  for (const [abbr, full] of Object.entries(DOMAIN_ABBREVIATIONS)) {
    if (cleanText.startsWith(abbr + " ") || cleanText.startsWith(abbr)) {
      domain = full;
      cleanText = cleanText.substring(abbr.length).trim();
      break;
    }
  }

  // Check for register at the start
  for (const [abbr, full] of Object.entries(REGISTER_ABBREVIATIONS)) {
    if (cleanText.startsWith(abbr + " ") || cleanText.startsWith(abbr)) {
      register = full;
      cleanText = cleanText.substring(abbr.length).trim();
      break;
    }
  }

  return { domain, register, cleanText };
}

function parseDefinitions(defText: string): ParsedDefinition[] {
  const definitions: ParsedDefinition[] = [];

  if (!defText || defText.trim().length < 2) return definitions;

  // Remove idiom section (after •)
  const idiomIdx = defText.indexOf("•");
  const mainText = idiomIdx >= 0 ? defText.substring(0, idiomIdx).trim() : defText;

  if (!mainText || mainText.trim().length < 2) return definitions;

  // Remove reflexive section "и ~ се" for separate handling
  // but keep definition text before it
  const reflexiveIdx = mainText.indexOf(" и ~ се ");
  const textForDefs =
    reflexiveIdx >= 0 ? mainText.substring(0, reflexiveIdx).trim() : mainText;

  // Try splitting by numbered definitions: 1. ... 2. ... 3. ...
  // Only split on numbers that form a valid sequential definition sequence starting from 1.
  // This avoids splitting on in-text numbers like "у 6. веку" (in the 6th century).
  const defMarkerRegex = /(?:^|\s)(\d+)\.\s/g;
  const candidates: { num: number; index: number; fullMatch: string }[] = [];
  let defMatch;
  while ((defMatch = defMarkerRegex.exec(textForDefs)) !== null) {
    candidates.push({
      num: parseInt(defMatch[1], 10),
      index: defMatch.index,
      fullMatch: defMatch[0],
    });
  }

  // Filter to only keep numbers that form a valid sequence starting from 1
  // A valid sequence: must contain 1, and each subsequent number must be prev+1
  const validMarkers: typeof candidates = [];
  let expectedNext = 1;
  for (const c of candidates) {
    if (c.num === expectedNext) {
      validMarkers.push(c);
      expectedNext++;
    }
  }

  // Build split result compatible with previous code (mimics split with capture group)
  let numberedParts: string[] = [""];
  if (validMarkers.length >= 2) {
    // Preamble: text before first marker
    numberedParts = [textForDefs.substring(0, validMarkers[0].index).trim()];
    for (let i = 0; i < validMarkers.length; i++) {
      const marker = validMarkers[i];
      const contentStart = marker.index + marker.fullMatch.length;
      const contentEnd = i + 1 < validMarkers.length ? validMarkers[i + 1].index : textForDefs.length;
      numberedParts.push(String(marker.num));
      numberedParts.push(textForDefs.substring(contentStart, contentEnd).trim());
    }
  }

  if (numberedParts.length >= 3) {
    // We have numbered definitions
    // numberedParts: [preamble, "1", def1text, "2", def2text, ...]
    const preamble = numberedParts[0].trim();

    for (let i = 1; i < numberedParts.length; i += 2) {
      const defNum = parseInt(numberedParts[i], 10);
      const defContent = numberedParts[i + 1]?.trim();
      if (!defContent) continue;

      // Check for sub-lettered definitions: а. ... б. ... в. ...
      const subParts = defContent.split(/(?:^|\s)([а-дежзик])\.\s/);

      if (subParts.length >= 3) {
        // Has sub-definitions
        const subPreamble = subParts[0].trim();
        if (subPreamble && subPreamble.length > 2) {
          const { domain, register, cleanText } =
            extractDomainAndRegister(subPreamble);
          const examples = extractExamples(cleanText);
          definitions.push({
            number: defNum,
            text: removeExamples(cleanText),
            domain,
            register,
            examples,
          });
        }

        for (let j = 1; j < subParts.length; j += 2) {
          const subLetter = subParts[j];
          const subContent = subParts[j + 1]?.trim();
          if (!subContent || subContent.length < 2) continue;

          const { domain, register, cleanText } =
            extractDomainAndRegister(subContent);
          const examples = extractExamples(cleanText);
          definitions.push({
            number: defNum,
            subLetter,
            text: removeExamples(cleanText),
            domain,
            register,
            examples,
          });
        }
      } else {
        // Single definition for this number
        const { domain, register, cleanText } =
          extractDomainAndRegister(defContent);
        const examples = extractExamples(cleanText);
        definitions.push({
          number: defNum,
          text: removeExamples(cleanText),
          domain,
          register,
          examples,
        });
      }
    }
  } else {
    // No numbered definitions - check for sub-letters only (а. б. в.)
    const subParts = textForDefs.split(/(?:^|\s)([а-дежзик])\.\s/);

    if (subParts.length >= 3) {
      const preamble = subParts[0].trim();
      if (preamble && preamble.length > 2) {
        const { domain, register, cleanText } =
          extractDomainAndRegister(preamble);
        const examples = extractExamples(cleanText);
        definitions.push({
          number: 1,
          text: removeExamples(cleanText),
          domain,
          register,
          examples,
        });
      }

      for (let j = 1; j < subParts.length; j += 2) {
        const subLetter = subParts[j];
        const subContent = subParts[j + 1]?.trim();
        if (!subContent || subContent.length < 2) continue;

        const { domain, register, cleanText } =
          extractDomainAndRegister(subContent);
        const examples = extractExamples(cleanText);
        definitions.push({
          number: 1,
          subLetter,
          text: removeExamples(cleanText),
          domain,
          register,
          examples,
        });
      }
    } else {
      // Single definition, no numbers
      const { domain, register, cleanText } =
        extractDomainAndRegister(textForDefs);
      const examples = extractExamples(cleanText);
      definitions.push({
        number: 1,
        text: removeExamples(cleanText),
        domain,
        register,
        examples,
      });
    }
  }

  // Clean up definitions
  return definitions
    .map((d) => ({
      ...d,
      text: d.text
        .replace(/;\s*$/, "")
        .replace(/\.\s*$/, ".")
        .trim(),
    }))
    .filter((d) => d.text.length > 1);
}

function extractExamples(text: string): string[] {
  const examples: string[] = [];

  // Examples follow em-dash – or are preceded by colon and ~
  // e.g. "– Ја му говорим једно, а он ради друго."
  // e.g. ": ~ списак, ~ ред."

  // Split on em-dash
  const dashParts = text.split(/\s–\s/);
  for (let i = 1; i < dashParts.length; i++) {
    const ex = dashParts[i].trim();
    if (ex.length > 3) {
      // Take until next definition marker or end
      const cleaned = ex.split(/\s\d+\.\s/)[0].trim();
      if (cleaned.length > 3) {
        examples.push(cleaned);
      }
    }
  }

  // Also extract colon-prefixed examples with ~
  const colonMatch = text.match(/:\s*(~[^.]+\.?(?:\s*~[^.]+\.?)*)/g);
  if (colonMatch) {
    for (const m of colonMatch) {
      const ex = m.replace(/^:\s*/, "").trim();
      if (ex.length > 2) examples.push(ex);
    }
  }

  return examples;
}

function removeExamples(text: string): string {
  // Remove example text (after em-dash) for cleaner definitions
  let clean = text.split(/\s–\s/)[0].trim();

  // Remove trailing colon-examples
  clean = clean.replace(/:\s*~[^.]+\.?(\s*~[^.]+\.?)*\s*$/, "").trim();

  // Remove trailing colon with just examples
  clean = clean.replace(/:\s*$/, "").trim();

  return clean;
}

function extractIdioms(text: string): string[] {
  const idioms: string[] = [];
  const idiomIdx = text.indexOf("•");
  if (idiomIdx < 0) return idioms;

  const idiomText = text.substring(idiomIdx + 1).trim();
  if (!idiomText) return idioms;

  // Idioms may be separated by periods or semicolons
  // Each idiom typically has the form: phrase meaning
  // Just store the whole idiom section as one or split by major punctuation
  idioms.push(idiomText);

  return idioms;
}

function extractCrossReferences(text: string): CrossReference[] {
  const refs: CrossReference[] = [];

  // Only search text BEFORE idiom section (•) — cross-refs inside idioms
  // are intra-idiom references, not word-level synonyms
  const idiomIdx = text.indexOf("•");
  const searchText = idiomIdx >= 0 ? text.substring(0, idiomIdx) : text;

  // "в." (see/videti) references — use (?:^|\s) instead of \b for Cyrillic
  // CRITICAL: "в." is also the 3rd sub-definition letter (а., б., в.) which is
  // extremely common in the dictionary. To avoid false matches:
  // - Only extract "в." cross-refs when "а." and "б." do NOT appear in the text
  //   (their presence means а./б./в. sub-definition structure)
  // - Also only for shorter entries (< 200 chars) as additional safety
  // Handle "в. под X" pattern: "под" means "under", the actual target is X
  const hasSubDefs = /\sа\.\s/.test(searchText) || /\sб\.\s/.test(searchText);
  const hasNumberedDefs = /\s[12]\.\s/.test(searchText);
  if (!hasSubDefs && !hasNumberedDefs && text.length < 200) {
    // Detect multi-redirect entries: "word1 в. target1, word2 в. target2, ..."
    // These pack multiple redirects on one line. Only the FIRST "в." belongs
    // to this entry's headword; the rest belong to other words on the same line.
    const seeRegex = new RegExp(
      `(?:^|\\s)в\\.\\s+(?:(?:под|код)\\s+)?([${CYR_ALL}\\-]+(?:\\s*\\([^)]*\\))?)`,
      "g"
    );
    const allSeeMatches = [...searchText.matchAll(seeRegex)];
    const multiRedirectRegex = new RegExp(`,\\s*[${CYR_ALL}]`);
    const isMultiRedirect = allSeeMatches.length >= 2 &&
      multiRedirectRegex.test(searchText);

    const seeMatches = isMultiRedirect ? allSeeMatches.slice(0, 1) : allSeeMatches;
    for (const m of seeMatches) {
      // Skip "в." after Roman numerals (XVII в. = 17th century)
      const matchPos = m.index!;
      const before = searchText.substring(Math.max(0, matchPos - 10), matchPos);
      if (/[IVXLC]\s*$/.test(before)) continue;

      refs.push({ type: "see", target: m[1].trim() });
    }
  }

  // "уп." (compare) references — unambiguous, safe to extract from all entries
  const compRegex = new RegExp(
    `(?:^|\\s)уп\\.\\s+([${CYR_ALL}\\-]+(?:\\s+и\\s+[${CYR_ALL}\\-]+)?)`,
    "g"
  );
  const compMatches = searchText.matchAll(compRegex);
  for (const m of compMatches) {
    refs.push({ type: "compare", target: m[1].trim() });
  }

  return refs;
}

function parseEntry(text: string): ParsedEntry | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 3) return null;

  // Extract headword (first word, possibly with superscript)
  const firstSpaceOrComma = trimmed.search(/[\s,]/);
  if (firstSpaceOrComma < 1) return null;

  let rawHeadword = trimmed.substring(0, firstSpaceOrComma);

  // Handle "word и word" pattern - the first word is the headword
  // For headword extraction, just take the raw first word
  const { clean: headwordClean, number: homonymNumber } =
    extractHomonymNumber(rawHeadword);
  const headword = cleanHeadword(headwordClean);

  if (!headword || headword.length < 1) return null;

  // Extract alternative forms from the headword area
  const headwordArea = trimmed.substring(0, Math.min(trimmed.length, 80));
  const alternativeForms = extractAlternativeForms(headwordArea);

  // Detect POS and grammar
  const posResult = detectPartOfSpeech(trimmed);
  if (!posResult) return null;

  // Get definition text
  const defText = trimmed.substring(posResult.defStartPos).trim();

  // Parse definitions
  const definitions = parseDefinitions(defText);

  // Extract idioms
  const idioms = extractIdioms(trimmed);

  // Extract cross-references
  const crossReferences = extractCrossReferences(trimmed);

  // Detect reflexive
  const hasReflexive = /\s+и\s+~\s+се\s/.test(trimmed) || /\.\s+~\s+се\s/.test(trimmed);

  return {
    headword,
    headwordClean: headword,
    homonymNumber,
    alternativeForms,
    partOfSpeech: posResult.pos,
    gender: posResult.gender,
    aspect: posResult.aspect,
    inflectionInfo: posResult.inflectionInfo,
    etymology: posResult.etymology,
    definitions,
    idioms,
    crossReferences,
    hasReflexive,
    rawText: trimmed,
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("Matica Srpska Comprehensive Parser");
  console.log("===================================\n");

  // Read file
  console.log(`Reading ${INPUT_FILE}...`);
  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(`Input file not found: ${INPUT_FILE}`);
  }
  const rawText = fs.readFileSync(INPUT_FILE, "utf-8");
  console.log(`  Raw file: ${rawText.split("\n").length} lines`);

  // Pass 1: Normalize
  console.log("\nPass 1: Normalizing lines...");
  const contentLines = normalizeLines(rawText);
  console.log(`  Content lines after normalization: ${contentLines.length}`);

  // Pass 2: Detect entry boundaries and parse
  console.log("\nPass 2: Parsing entries...");
  const entries: ParsedEntry[] = [];
  const seenKeys = new Set<string>();
  let currentEntryLines: string[] = [];
  let entriesDetected = 0;
  let duplicatesSkipped = 0;

  function flushEntry(): void {
    if (currentEntryLines.length === 0) return;
    const entryText = currentEntryLines.join(" ");
    entriesDetected++;

    const parsed = parseEntry(entryText);
    if (parsed) {
      const key = `${parsed.headword}:${parsed.partOfSpeech}:${parsed.homonymNumber}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        entries.push(parsed);
      } else {
        duplicatesSkipped++;
      }
    }

    if (entriesDetected % 10000 === 0) {
      console.log(
        `  Processed ${entriesDetected} raw entries, ${entries.length} parsed...`
      );
    }
  }

  for (const line of contentLines) {
    if (isEntryStart(line)) {
      flushEntry();
      currentEntryLines = [line];
    } else {
      // Continuation of current entry (multi-line entry, rare in corrected file)
      currentEntryLines.push(line);
    }
  }
  // Flush last entry
  flushEntry();

  console.log(`\n  Total entries detected: ${entriesDetected}`);
  console.log(`  Duplicates skipped: ${duplicatesSkipped}`);
  console.log(`  Successfully parsed: ${entries.length}`);

  // ─── Statistics ──────────────────────────────────────────────────────────

  console.log("\n===== STATISTICS =====\n");

  // POS distribution
  const posCounts: Record<string, number> = {};
  for (const e of entries) {
    posCounts[e.partOfSpeech] = (posCounts[e.partOfSpeech] || 0) + 1;
  }
  console.log("Part of Speech distribution:");
  for (const [pos, count] of Object.entries(posCounts).sort(
    (a, b) => b[1] - a[1]
  )) {
    const pct = ((count / entries.length) * 100).toFixed(1);
    console.log(`  ${pos.padEnd(15)} ${String(count).padStart(6)}  (${pct}%)`);
  }

  // Etymology
  const etymCounts: Record<string, number> = {};
  let withEtymology = 0;
  for (const e of entries) {
    if (e.etymology) {
      withEtymology++;
      etymCounts[e.etymology] = (etymCounts[e.etymology] || 0) + 1;
    }
  }
  console.log(`\nWith etymology: ${withEtymology} (${((withEtymology / entries.length) * 100).toFixed(1)}%)`);
  console.log("Top etymologies:");
  for (const [etym, count] of Object.entries(etymCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)) {
    console.log(`  ${etym.padEnd(25)} ${count}`);
  }

  // Definitions
  const totalDefs = entries.reduce((s, e) => s + e.definitions.length, 0);
  const withDefs = entries.filter((e) => e.definitions.length > 0).length;
  const withDefsPct = ((withDefs / entries.length) * 100).toFixed(1);
  console.log(`\nDefinitions: ${totalDefs} total across ${withDefs} entries (${withDefsPct}% have at least one)`);

  // Examples
  const totalExamples = entries.reduce(
    (s, e) => s + e.definitions.reduce((s2, d) => s2 + d.examples.length, 0),
    0
  );
  console.log(`Examples: ${totalExamples}`);

  // Idioms
  const withIdioms = entries.filter((e) => e.idioms.length > 0).length;
  console.log(`Entries with idioms: ${withIdioms}`);

  // Cross-references
  const withCrossRefs = entries.filter(
    (e) => e.crossReferences.length > 0
  ).length;
  console.log(`Entries with cross-references: ${withCrossRefs}`);

  // Reflexive
  const withReflexive = entries.filter((e) => e.hasReflexive).length;
  console.log(`Entries with reflexive forms: ${withReflexive}`);

  // Homonyms
  const withHomonym = entries.filter((e) => e.homonymNumber > 0).length;
  console.log(`Entries with homonym numbers: ${withHomonym}`);

  // ─── Spot checks ────────────────────────────────────────────────────────

  console.log("\n===== SPOT CHECKS =====\n");

  console.log("First 5 entries:");
  for (const e of entries.slice(0, 5)) {
    console.log(
      `  ${e.headword}${e.homonymNumber ? "^" + e.homonymNumber : ""} [${e.partOfSpeech}${e.gender ? "/" + e.gender : ""}] - ${e.definitions.length} defs, ${e.definitions[0]?.text.substring(0, 60) || "(no def)"}...`
    );
  }

  console.log("\nLast 5 entries:");
  for (const e of entries.slice(-5)) {
    console.log(
      `  ${e.headword}${e.homonymNumber ? "^" + e.homonymNumber : ""} [${e.partOfSpeech}${e.gender ? "/" + e.gender : ""}] - ${e.definitions.length} defs, ${e.definitions[0]?.text.substring(0, 60) || "(no def)"}...`
    );
  }

  // Random middle samples
  console.log("\nRandom middle samples:");
  const midPoints = [
    Math.floor(entries.length * 0.25),
    Math.floor(entries.length * 0.5),
    Math.floor(entries.length * 0.75),
  ];
  for (const idx of midPoints) {
    const e = entries[idx];
    console.log(
      `  [${idx}] ${e.headword}${e.homonymNumber ? "^" + e.homonymNumber : ""} [${e.partOfSpeech}] - ${e.definitions.length} defs`
    );
  }

  // ─── Write output ────────────────────────────────────────────────────────

  console.log(`\nWriting output to ${OUTPUT_FILE}...`);

  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const output = {
    metadata: {
      source: "Rečnik srpskoga jezika, Matica srpska, 2011",
      parsedAt: new Date().toISOString(),
      totalEntries: entries.length,
      statistics: {
        byPOS: posCounts,
        withEtymology,
        withDefinitions: withDefs,
        totalDefinitions: totalDefs,
        totalExamples,
        withIdioms,
        withCrossReferences: withCrossRefs,
        withReflexive,
        withHomonyms: withHomonym,
      },
    },
    entries,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");

  const fileSizeMB = (fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(1);
  console.log(`  Output size: ${fileSizeMB} MB`);
  console.log("\nDone!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
