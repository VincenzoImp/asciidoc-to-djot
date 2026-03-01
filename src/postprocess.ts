/**
 * Post-processes the Djot output produced by the converter.
 *
 * 1. Restores placeholders (wikilinks → Djot reference-style links,
 *    nostr: URIs → Djot inline links).
 * 2. Normalizes blank lines (Djot requires blank lines around block elements).
 */

import type { Placeholder } from "./preprocess.js";

/** Restore all placeholders to their Djot equivalents. */
export function restorePlaceholders(
  text: string,
  placeholders: Map<string, Placeholder>,
): string {
  let result = text;
  for (const [key, ph] of placeholders) {
    let replacement: string;

    if (ph.type === "wikilink") {
      if (ph.display) {
        // [[target|display]] → [display][target]
        replacement = `[${ph.display}][${ph.target}]`;
      } else {
        // [[Target]] → [Target][]
        replacement = `[${ph.target}][]`;
      }
    } else {
      // nostr: URI → [nostr:...](nostr:...)
      replacement = `[${ph.original}](${ph.original})`;
    }

    result = result.replaceAll(key, replacement);
  }
  return result;
}

/**
 * Ensure blank lines separate block elements and collapse runs of 3+
 * blank lines down to 2.  Trim trailing whitespace from every line.
 */
export function normalizeBlankLines(text: string): string {
  return (
    text
      // Trim trailing whitespace per line
      .replace(/[^\S\n]+$/gm, "")
      // Collapse 3+ consecutive blank lines to 2
      .replace(/\n{3,}/g, "\n\n")
      // Ensure single trailing newline
      .replace(/\n*$/, "\n")
  );
}

/**
 * Decode HTML entities that Asciidoctor emits (it always HTML-encodes
 * inline text, even for non-HTML backends).
 *
 * Order matters: `&amp;` must be decoded last so that source-literal
 * sequences like `&amp;lt;` become `&lt;` rather than `<`.
 */
export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCodePoint(parseInt(code, 10)),
    )
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) =>
      String.fromCodePoint(parseInt(code, 16)),
    )
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

export function postprocess(
  text: string,
  placeholders: Map<string, Placeholder>,
): string {
  let result = text;
  result = decodeHtmlEntities(result);
  result = restorePlaceholders(result, placeholders);
  result = normalizeBlankLines(result);
  return result;
}
