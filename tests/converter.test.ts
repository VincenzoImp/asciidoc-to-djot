import { describe, it, expect } from "vitest";
import { convert } from "../src/index.js";

/** Helper: convert and return trimmed Djot string. */
function c(asciidoc: string): string {
  return convert(asciidoc, { validate: false }).djot.trim();
}

// ---------------------------------------------------------------------------
// Headings
// ---------------------------------------------------------------------------
describe("headings", () => {
  it("converts level-1 heading", () => {
    expect(c("== Section")).toBe("## Section");
  });

  it("converts level-2 heading", () => {
    expect(c("=== Subsection")).toBe("### Subsection");
  });

  it("converts level-3 heading", () => {
    expect(c("==== Sub-subsection")).toBe("#### Sub-subsection");
  });

  it("handles heading with inline formatting", () => {
    expect(c("== *Bold* heading")).toBe("## *Bold* heading");
  });
});

// ---------------------------------------------------------------------------
// Paragraphs & inline formatting
// ---------------------------------------------------------------------------
describe("inline formatting", () => {
  it("converts bold text", () => {
    expect(c("This is *bold* text.")).toBe("This is *bold* text.");
  });

  it("converts italic text", () => {
    expect(c("This is _italic_ text.")).toBe("This is _italic_ text.");
  });

  it("converts monospace text", () => {
    expect(c("This is `code` text.")).toBe("This is `code` text.");
  });

  it("converts superscript", () => {
    expect(c("E = mc^2^")).toBe("E = mc^2^");
  });

  it("converts subscript", () => {
    expect(c("H~2~O")).toBe("H~2~O");
  });

  it("handles combined formatting", () => {
    expect(c("*_bold italic_*")).toBe("*_bold italic_*");
  });
});

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------
describe("links", () => {
  it("converts link with text", () => {
    expect(c("Visit https://example.com[here].")).toBe(
      "Visit [here](https://example.com).",
    );
  });

  it("converts bare URL", () => {
    expect(c("Visit https://example.com today.")).toBe(
      "Visit <https://example.com> today.",
    );
  });
});

// ---------------------------------------------------------------------------
// Wikilinks (NIP-54)
// ---------------------------------------------------------------------------
describe("wikilinks", () => {
  it("converts simple wikilink", () => {
    expect(c("See [[Bitcoin]].")).toBe("See [Bitcoin][].");
  });

  it("converts wikilink with display text", () => {
    expect(c("See [[proof of work|PoW]].")).toBe(
      "See [PoW][proof of work].",
    );
  });

  it("converts wikilink with non-Latin characters", () => {
    expect(c("See [[ビットコイン]].")).toBe("See [ビットコイン][].");
  });

  it("converts wikilink with mixed scripts", () => {
    expect(c("See [[日本語 Article|Japanese Article]].")).toBe(
      "See [Japanese Article][日本語 Article].",
    );
  });

  it("handles multiple wikilinks in one paragraph", () => {
    expect(c("A [[Bitcoin]] and a [[Ethereum]].")).toBe(
      "A [Bitcoin][] and a [Ethereum][].",
    );
  });
});

// ---------------------------------------------------------------------------
// nostr: URIs (NIP-54)
// ---------------------------------------------------------------------------
describe("nostr URIs", () => {
  it("converts npub URI", () => {
    expect(c("By nostr:npub1abc123.")).toBe(
      "By [nostr:npub1abc123](nostr:npub1abc123).",
    );
  });

  it("converts nevent URI", () => {
    expect(c("See nostr:nevent1xyz789.")).toBe(
      "See [nostr:nevent1xyz789](nostr:nevent1xyz789).",
    );
  });

  it("converts nprofile URI", () => {
    expect(c("Profile nostr:nprofile1abc.")).toBe(
      "Profile [nostr:nprofile1abc](nostr:nprofile1abc).",
    );
  });

  it("converts naddr URI", () => {
    expect(c("Article nostr:naddr1def.")).toBe(
      "Article [nostr:naddr1def](nostr:naddr1def).",
    );
  });

  it("handles multiple nostr URIs", () => {
    const result = c(
      "By nostr:npub1aaa and nostr:npub1bbb.",
    );
    expect(result).toBe(
      "By [nostr:npub1aaa](nostr:npub1aaa) and [nostr:npub1bbb](nostr:npub1bbb).",
    );
  });
});

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------
describe("lists", () => {
  it("converts unordered list", () => {
    expect(c("* item one\n* item two\n* item three")).toBe(
      "- item one\n- item two\n- item three",
    );
  });

  it("converts ordered list", () => {
    expect(c(". first\n. second\n. third")).toBe(
      "1. first\n2. second\n3. third",
    );
  });

  it("converts nested unordered list", () => {
    const result = c("* parent\n** child\n** child2");
    expect(result).toContain("- parent");
    expect(result).toContain("  - child");
  });

  it("converts description list", () => {
    const result = c("Term:: Definition here");
    expect(result).toContain(": Term");
    expect(result).toContain("  Definition here");
  });
});

// ---------------------------------------------------------------------------
// Code blocks
// ---------------------------------------------------------------------------
describe("code blocks", () => {
  it("converts source block with language", () => {
    const input = "[source,javascript]\n----\nconst x = 1;\n----";
    expect(c(input)).toBe("```javascript\nconst x = 1;\n```");
  });

  it("converts source block without language", () => {
    const input = "----\nplain code\n----";
    expect(c(input)).toBe("```\nplain code\n```");
  });

  it("preserves code content exactly", () => {
    const input = `[source,json]\n----\n{\n  "key": "value"\n}\n----`;
    const result = c(input);
    expect(result).toContain('"key": "value"');
  });
});

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------
describe("tables", () => {
  it("converts simple table", () => {
    const input = "|===\n|Header 1 |Header 2\n\n|Cell 1 |Cell 2\n|===";
    const result = c(input);
    expect(result).toContain("| Header 1 |");
    expect(result).toContain("| --- |");
    expect(result).toContain("| Cell 1 |");
  });
});

// ---------------------------------------------------------------------------
// Block images
// ---------------------------------------------------------------------------
describe("images", () => {
  it("converts block image", () => {
    expect(c("image::photo.png[Alt text]")).toBe("![Alt text](photo.png)");
  });
});

// ---------------------------------------------------------------------------
// Quotes
// ---------------------------------------------------------------------------
describe("quotes", () => {
  it("converts quote block", () => {
    const input = "[quote]\n____\nTo be or not to be.\n____";
    const result = c(input);
    expect(result).toContain("> To be or not to be.");
  });
});
