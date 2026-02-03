import Link from "next/link";
import { cyrillicToLatin } from "@/lib/transliterate";

/**
 * Render text with "уп." and "в." cross-references as clickable links.
 *
 * "уп. X" (compare X) — always linkified, unambiguous
 * "в. X" (see X) — only linkified in short text without sub-definition markers
 */

const CYR_WORD = "[а-яђјљњћџА-ЯЂЈЉЊЋЏ][а-яђјљњћџА-ЯЂЈЉЊЋЏ\\-]*";

function wordToHref(word: string): string {
  // Strip superscript digits and trailing punctuation
  const clean = word
    .replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰]+$/, "")
    .replace(/[.,;:!?)]+$/, "")
    .trim();
  if (!clean) return "";
  return `/rec/${encodeURIComponent(cyrillicToLatin(clean.toLowerCase()))}`;
}

function WordLink({ word, className }: { word: string; className?: string }) {
  const clean = word
    .replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰]+$/, "")
    .replace(/[.,;:!?)]+$/, "")
    .trim();
  const href = wordToHref(word);
  if (!href || clean.length < 2) return <>{word}</>;

  // Keep any trailing punctuation that was stripped
  const trailing = word.substring(word.indexOf(clean) + clean.length);

  return (
    <>
      <Link
        href={href}
        className={className || "text-blue-600 dark:text-blue-400 hover:underline"}
      >
        {clean}
      </Link>
      {trailing}
    </>
  );
}

export function CrossRefText({ text }: { text: string }) {
  // Match "уп." followed by one or two Cyrillic words (with optional "и" connector)
  // Also match "в." in cross-reference context (no preceding sub-def markers)
  const pattern = new RegExp(
    `(уп\\.)\\s+(${CYR_WORD})(?:\\s+(и)\\s+(${CYR_WORD}))?`,
    "g"
  );

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of text.matchAll(pattern)) {
    const matchStart = match.index!;

    // Add text before match
    if (matchStart > lastIndex) {
      parts.push(text.substring(lastIndex, matchStart));
    }

    const prefix = match[1]; // "уп."
    const word1 = match[2];
    const connector = match[3]; // "и" or undefined
    const word2 = match[4];

    parts.push(
      <span key={key++}>
        {prefix}{" "}
        <WordLink word={word1} />
        {connector && (
          <>
            {" "}{connector}{" "}
            <WordLink word={word2} />
          </>
        )}
      </span>
    );

    lastIndex = matchStart + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  if (parts.length === 0) return <>{text}</>;
  return <>{parts}</>;
}

/**
 * Render raw dictionary text with cross-reference links.
 * Handles both "уп." and "в." patterns, with "в." only linked
 * when it's clearly a cross-reference (not a sub-definition marker).
 */
export function RawTextWithLinks({ text }: { text: string }) {
  const hasSubDefs = /\sа\.\s/.test(text) || /\sб\.\s/.test(text);
  const hasNumberedDefs = /\s[12]\.\s/.test(text);

  // Build combined pattern
  // Always match "уп. X" (unambiguous)
  // Match "в. X" only if no sub-definition markers present
  const canLinkV = !hasSubDefs && !hasNumberedDefs && text.length < 300;

  const patternStr = canLinkV
    ? `(уп\\.|в\\.)\\s+(?:(?:под|код)\\s+)?(${CYR_WORD})(?:\\s+(и)\\s+(${CYR_WORD}))?`
    : `(уп\\.)\\s+(${CYR_WORD})(?:\\s+(и)\\s+(${CYR_WORD}))?`;

  const pattern = new RegExp(patternStr, "g");

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of text.matchAll(pattern)) {
    const matchStart = match.index!;

    // For "в." matches, skip if preceded by Roman numerals (century abbreviation)
    if (canLinkV && match[1] === "в.") {
      const before = text.substring(Math.max(0, matchStart - 10), matchStart);
      if (/[IVXLC]\s*$/.test(before)) {
        continue; // Skip — this is "XVII в." (century)
      }
    }

    // Add text before match
    if (matchStart > lastIndex) {
      parts.push(text.substring(lastIndex, matchStart));
    }

    // Reconstruct the prefix including any skipped preposition
    const fullMatch = match[0];
    const word1 = match[2];
    const connector = match[3];
    const word2 = match[4];

    // Find where word1 starts in the full match to get the prefix
    const word1Pos = fullMatch.indexOf(word1);
    const prefix = fullMatch.substring(0, word1Pos);

    parts.push(
      <span key={key++}>
        {prefix}
        <WordLink word={word1} />
        {connector && (
          <>
            {" "}{connector}{" "}
            <WordLink word={word2} />
          </>
        )}
      </span>
    );

    lastIndex = matchStart + fullMatch.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  if (parts.length === 0) return <>{text}</>;
  return <>{parts}</>;
}
