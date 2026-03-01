/**
 * asciidoc-to-djot — Convert NIP-54 wiki articles from Asciidoc to Djot.
 *
 * @example
 * ```ts
 * import { convert } from "asciidoc-to-djot";
 *
 * const djot = convert("== Hello\n\nA [[wiki link]] with *bold*.");
 * ```
 */

import Asciidoctor from "@asciidoctor/core";
import { parse as parseDjot } from "@djot/djot";

import { DjotConverter } from "./converter.js";
import { preprocess } from "./preprocess.js";
import { postprocess } from "./postprocess.js";

export interface ConvertOptions {
  /** Validate the output as parseable Djot (default: true). */
  validate?: boolean;
  /** Collect warnings instead of printing to stderr. */
  warnings?: string[];
}

export interface ConvertResult {
  /** The converted Djot content. */
  djot: string;
  /** Validation warnings, if any. */
  warnings: string[];
}

/**
 * Convert an Asciidoc string (NIP-54 wiki article content) to Djot.
 *
 * The pipeline is:
 *   1. Pre-process  — replace `[[wikilinks]]` and `nostr:` URIs with placeholders
 *   2. Parse        — Asciidoctor builds an AST
 *   3. Convert      — Custom converter walks the AST → Djot
 *   4. Post-process — restore placeholders as Djot links, normalize blank lines
 *   5. Validate     — optionally parse the result with `@djot/djot`
 */
export function convert(
  asciidoc: string,
  options: ConvertOptions = {},
): ConvertResult {
  const { validate = true, warnings = [] } = options;

  // 1. Pre-process
  const { text, placeholders } = preprocess(asciidoc);

  // 2. Parse + 3. Convert
  const asciidoctor = Asciidoctor();
  const converter = new DjotConverter();
  asciidoctor.ConverterFactory.register(converter, ["djot"]);

  const doc = asciidoctor.load(text, {
    backend: "djot",
    safe: "safe",
  });

  const hasHeader: boolean = doc.hasHeader?.() ?? false;
  const title = hasHeader
    ? (doc.getDocumentTitle({ partition: false }) as string | undefined)
    : undefined;
  let djotRaw: string = doc.convert() as string;

  if (title) {
    djotRaw = `# ${title}\n\n${djotRaw}`;
  }

  // 4. Post-process
  const djot = postprocess(djotRaw, placeholders);

  // 5. Validate
  if (validate) {
    try {
      parseDjot(djot, {
        warn: (msg) => warnings.push(msg.render()),
      });
    } catch (err) {
      warnings.push(`Djot validation error: ${err}`);
    }
  }

  return { djot, warnings };
}

export { DjotConverter } from "./converter.js";
export { preprocess } from "./preprocess.js";
export {
  postprocess,
  restorePlaceholders,
  decodeHtmlEntities,
} from "./postprocess.js";
