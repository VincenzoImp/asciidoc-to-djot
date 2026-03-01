import { describe, it, expect } from "vitest";
import { convert } from "../src/index.js";
import { parse as parseDjot } from "@djot/djot";

describe("integration: full NIP-54 article", () => {
  const asciidocArticle = `= Bitcoin

Bitcoin is a [[cryptocurrency]] invented by nostr:npub1satoshi123abc.

== History

Bitcoin was announced in 2008 through a https://bitcoin.org/bitcoin.pdf[whitepaper] published to a cryptography mailing list.

=== Early development

The first block (the [[genesis block]]) was mined on January 3, 2009.

== Technical details

Bitcoin uses a [[proof of work|PoW]] consensus mechanism.

.Key properties
* Decentralized
* Limited supply of 21 million coins
* Pseudonymous

.Transaction types
. Standard transactions
. Multi-signature transactions
. Time-locked transactions

[source,json]
----
{
  "txid": "abc123",
  "amount": 0.5
}
----

Term:: A technical term
Block:: A group of transactions

|===
|Feature |Description

|Decentralized |No central authority
|Open source |Anyone can contribute
|===
`;

  it("converts a full article without errors", () => {
    const { djot, warnings } = convert(asciidocArticle);
    expect(djot).toBeTruthy();
    expect(warnings).toEqual([]);
  });

  it("produces valid Djot", () => {
    const { djot } = convert(asciidocArticle, { validate: false });
    // Parse with @djot/djot — should not throw
    expect(() => parseDjot(djot)).not.toThrow();
  });

  it("contains expected wikilinks", () => {
    const { djot } = convert(asciidocArticle, { validate: false });
    expect(djot).toContain("[cryptocurrency][]");
    expect(djot).toContain("[genesis block][]");
    expect(djot).toContain("[PoW][proof of work]");
  });

  it("contains expected nostr links", () => {
    const { djot } = convert(asciidocArticle, { validate: false });
    expect(djot).toContain(
      "[nostr:npub1satoshi123abc](nostr:npub1satoshi123abc)",
    );
  });

  it("contains document title", () => {
    const { djot } = convert(asciidocArticle, { validate: false });
    expect(djot).toContain("# Bitcoin");
  });

  it("contains expected headings", () => {
    const { djot } = convert(asciidocArticle, { validate: false });
    expect(djot).toContain("## History");
    expect(djot).toContain("### Early development");
    expect(djot).toContain("## Technical details");
  });

  it("contains expected external link", () => {
    const { djot } = convert(asciidocArticle, { validate: false });
    expect(djot).toContain(
      "[whitepaper](https://bitcoin.org/bitcoin.pdf)",
    );
  });

  it("contains expected code block", () => {
    const { djot } = convert(asciidocArticle, { validate: false });
    expect(djot).toContain("```json");
    expect(djot).toContain('"txid": "abc123"');
    expect(djot).toContain("```");
  });

  it("contains expected list items", () => {
    const { djot } = convert(asciidocArticle, { validate: false });
    expect(djot).toContain("- Decentralized");
    expect(djot).toContain("1. Standard transactions");
  });

  it("contains expected table", () => {
    const { djot } = convert(asciidocArticle, { validate: false });
    expect(djot).toContain("| Feature |");
    expect(djot).toContain("| --- |");
  });

  it("contains expected definition list", () => {
    const { djot } = convert(asciidocArticle, { validate: false });
    expect(djot).toContain(": Term");
    expect(djot).toContain("  A technical term");
  });
});

describe("integration: empty and minimal inputs", () => {
  it("handles empty input", () => {
    const { djot } = convert("", { validate: false });
    expect(djot.trim()).toBe("");
  });

  it("handles single paragraph", () => {
    const { djot } = convert("Hello world.", { validate: false });
    expect(djot.trim()).toBe("Hello world.");
  });

  it("handles content with only wikilinks", () => {
    const { djot } = convert("[[Bitcoin]] and [[Ethereum]].", { validate: false });
    expect(djot.trim()).toBe("[Bitcoin][] and [Ethereum][].");
  });
});
