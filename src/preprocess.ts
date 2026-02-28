/**
 * Pre-processes NIP-54 Asciidoc content before parsing.
 *
 * NIP-54 extends standard Asciidoc with two custom syntaxes:
 *   1. Wikilinks: `[[Target]]` and `[[target|display]]`
 *   2. nostr: URIs: `nostr:npub1...`, `nostr:nevent1...`, etc.
 *
 * Both conflict with Asciidoctor's parser (`[[id]]` = block anchor,
 * not a wikilink; `nostr:` is not a recognized URI scheme).  We
 * replace them with inert placeholders before parsing, then the
 * post-processor restores them as proper Djot constructs.
 */

const NOSTR_URI_RE =
  /nostr:(?:npub1|note1|nevent1|nprofile1|naddr1|nrelay1)[a-z0-9]+/g;

/**
 * Match wikilinks: `[[Target Page]]` or `[[target|display text]]`.
 * Careful not to match block anchors that appear on their own line
 * (those are `[[id]]` on a line by itself, which is standard Asciidoc).
 * We match wikilinks that appear inline (inside text).
 */
const WIKILINK_RE = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;

export interface Placeholder {
  type: "nostr" | "wikilink";
  /** Original matched text */
  original: string;
  /** For wikilinks: the target */
  target?: string;
  /** For wikilinks: the display text (if different from target) */
  display?: string;
}

export interface PreprocessResult {
  text: string;
  placeholders: Map<string, Placeholder>;
}

export function preprocess(input: string): PreprocessResult {
  const placeholders = new Map<string, Placeholder>();
  let counter = 0;

  function nextKey(): string {
    return `XPLACEHOLDER${counter++}X`;
  }

  // Replace wikilinks first (before nostr: URIs, in case a wikilink
  // contains a nostr: URI as display text — unlikely but safe).
  let text = input.replace(WIKILINK_RE, (match, target: string, display?: string) => {
    const key = nextKey();
    placeholders.set(key, {
      type: "wikilink",
      original: match,
      target,
      display,
    });
    return key;
  });

  // Replace nostr: URIs
  text = text.replace(NOSTR_URI_RE, (match) => {
    const key = nextKey();
    placeholders.set(key, { type: "nostr", original: match });
    return key;
  });

  return { text, placeholders };
}
