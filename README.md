# asciidoc-to-djot

Convert [NIP-54](https://github.com/nostr-protocol/nips/blob/master/54.md) wiki articles from Asciidoc to [Djot](https://djot.net/) format.

## Install

```bash
npm install asciidoc-to-djot
```

## CLI usage

```bash
# From file
asciidoc-to-djot article.adoc

# From stdin
echo '== Title' | asciidoc-to-djot

# Write to file
asciidoc-to-djot article.adoc -o article.djot

# Skip validation
asciidoc-to-djot --no-validate article.adoc
```

## Programmatic usage

```typescript
import { convert } from "asciidoc-to-djot";

const asciidoc = `== Bitcoin

Bitcoin is a [[cryptocurrency]] invented by nostr:npub1satoshi123abc.

A https://bitcoin.org/bitcoin.pdf[whitepaper] was published in 2008.
`;

const { djot, warnings } = convert(asciidoc);
console.log(djot);
```

Output:

```djot
## Bitcoin

Bitcoin is a [cryptocurrency][] invented by [nostr:npub1satoshi123abc](nostr:npub1satoshi123abc).

A [whitepaper](https://bitcoin.org/bitcoin.pdf) was published in 2008.
```

## What it converts

| Asciidoc | Djot |
|---|---|
| `== Heading` | `## Heading` |
| `*bold*` | `*bold*` |
| `_italic_` | `_italic_` |
| `` `code` `` | `` `code` `` |
| `^super^` | `^super^` |
| `~sub~` | `~sub~` |
| `[[Target]]` | `[Target][]` |
| `[[target\|display]]` | `[display][target]` |
| `https://url[text]` | `[text](https://url)` |
| `nostr:npub1...` | `[nostr:npub1...](nostr:npub1...)` |
| `image::file.png[alt]` | `![alt](file.png)` |
| Ordered/unordered/definition lists | Djot equivalents |
| Source blocks | Fenced code blocks |
| Tables | Pipe tables |
| Admonitions, quotes, sidebars | Djot divs with classes |

## Architecture

The tool uses an AST-based pipeline:

1. **Pre-process** — replace `[[wikilinks]]` and `nostr:` URIs with placeholders (these are NIP-54 extensions that Asciidoctor doesn't handle natively)
2. **Parse** — `@asciidoctor/core` builds an AST from the Asciidoc source
3. **Convert** — a custom `DjotConverter` walks the AST and emits Djot for each node type
4. **Post-process** — restore placeholders as Djot reference-style and inline links, normalize blank lines
5. **Validate** — `@djot/djot` parses the output to verify it's valid Djot

## Development

```bash
npm install
npm run build
npm test
```