// Serbian Cyrillic to Latin transliteration and vice versa

const cyrillicToLatinMap: Record<string, string> = {
  "А": "A", "Б": "B", "В": "V", "Г": "G", "Д": "D",
  "Ђ": "Đ", "Е": "E", "Ж": "Ž", "З": "Z", "И": "I",
  "Ј": "J", "К": "K", "Л": "L", "Љ": "Lj", "М": "M",
  "Н": "N", "Њ": "Nj", "О": "O", "П": "P", "Р": "R",
  "С": "S", "Т": "T", "Ћ": "Ć", "У": "U", "Ф": "F",
  "Х": "H", "Ц": "C", "Ч": "Č", "Џ": "Dž", "Ш": "Š",
  "а": "a", "б": "b", "в": "v", "г": "g", "д": "d",
  "ђ": "đ", "е": "e", "ж": "ž", "з": "z", "и": "i",
  "ј": "j", "к": "k", "л": "l", "љ": "lj", "м": "m",
  "н": "n", "њ": "nj", "о": "o", "п": "p", "р": "r",
  "с": "s", "т": "t", "ћ": "ć", "у": "u", "ф": "f",
  "х": "h", "ц": "c", "ч": "č", "џ": "dž", "ш": "š",
};

const latinToCyrillicMap: Record<string, string> = {
  "A": "А", "B": "Б", "V": "В", "G": "Г", "D": "Д",
  "Đ": "Ђ", "E": "Е", "Ž": "Ж", "Z": "З", "I": "И",
  "J": "Ј", "K": "К", "L": "Л", "M": "М",
  "N": "Н", "O": "О", "P": "П", "R": "Р",
  "S": "С", "T": "Т", "Ć": "Ћ", "U": "У", "F": "Ф",
  "H": "Х", "C": "Ц", "Č": "Ч", "Š": "Ш",
  "a": "а", "b": "б", "v": "в", "g": "г", "d": "д",
  "đ": "ђ", "e": "е", "ž": "ж", "z": "з", "i": "и",
  "j": "ј", "k": "к", "l": "л", "m": "м",
  "n": "н", "o": "о", "p": "п", "r": "р",
  "s": "с", "t": "т", "ć": "ћ", "u": "у", "f": "ф",
  "h": "х", "c": "ц", "č": "ч", "š": "ш",
};

// Digraphs that need special handling (Latin to Cyrillic)
const latinDigraphs: Record<string, string> = {
  "Lj": "Љ", "LJ": "Љ", "lj": "љ",
  "Nj": "Њ", "NJ": "Њ", "nj": "њ",
  "Dž": "Џ", "DŽ": "Џ", "dž": "џ", "DZ": "Џ", "Dz": "Џ", "dz": "џ",
};

/**
 * Convert Serbian Cyrillic text to Latin script
 */
export function cyrillicToLatin(text: string): string {
  let result = "";
  for (const char of text) {
    result += cyrillicToLatinMap[char] ?? char;
  }
  return result;
}

/**
 * Convert Serbian Latin text to Cyrillic script
 */
export function latinToCyrillic(text: string): string {
  let result = "";
  let i = 0;

  while (i < text.length) {
    // Check for digraphs first (2 characters)
    if (i < text.length - 1) {
      const digraph = text.substring(i, i + 2);
      if (latinDigraphs[digraph]) {
        result += latinDigraphs[digraph];
        i += 2;
        continue;
      }
    }

    // Single character conversion
    const char = text[i];
    result += latinToCyrillicMap[char] ?? char;
    i++;
  }

  return result;
}

/**
 * Detect if text is primarily Cyrillic
 */
export function isCyrillic(text: string): boolean {
  const cyrillicPattern = /[\u0400-\u04FF]/;
  const latinPattern = /[a-zA-ZčćžšđČĆŽŠĐ]/;

  let cyrillicCount = 0;
  let latinCount = 0;

  for (const char of text) {
    if (cyrillicPattern.test(char)) cyrillicCount++;
    if (latinPattern.test(char)) latinCount++;
  }

  return cyrillicCount > latinCount;
}

/**
 * Normalize text to both scripts for search
 */
export function normalizeForSearch(text: string): { cyrillic: string; latin: string } {
  const trimmed = text.trim().toLowerCase();

  if (isCyrillic(trimmed)) {
    return {
      cyrillic: trimmed,
      latin: cyrillicToLatin(trimmed),
    };
  }

  return {
    cyrillic: latinToCyrillic(trimmed),
    latin: trimmed,
  };
}

/**
 * Get both script versions of a word
 */
export function toBothScripts(text: string): { cyrillic: string; latin: string } {
  if (isCyrillic(text)) {
    return {
      cyrillic: text,
      latin: cyrillicToLatin(text),
    };
  }

  return {
    cyrillic: latinToCyrillic(text),
    latin: text,
  };
}
