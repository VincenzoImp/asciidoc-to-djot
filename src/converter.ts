/**
 * Custom Asciidoctor converter backend that emits Djot markup.
 *
 * Each AST node type dispatches to a dedicated method that returns
 * the Djot representation as a string.  Inline nodes (quoted text,
 * anchors, images, …) return the Djot fragment that will be
 * substituted into the parent block's content.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type AsciiNode = any;

export class DjotConverter {
  // ----- dispatch -----------------------------------------------------------

  convert(node: AsciiNode, transform?: string): string {
    const name: string = node.getNodeName();

    switch (name) {
      case "document":
        return this.convertDocument(node, transform);
      case "embedded":
        return this.convertEmbedded(node);
      case "section":
        return this.convertSection(node);
      case "paragraph":
        return this.convertParagraph(node);
      case "listing":
        return this.convertListing(node);
      case "literal":
        return this.convertLiteral(node);
      case "ulist":
        return this.convertUnorderedList(node);
      case "olist":
        return this.convertOrderedList(node);
      case "dlist":
        return this.convertDescriptionList(node);
      case "list_item":
        return this.convertListItem(node);
      case "table":
        return this.convertTable(node);
      case "image":
        return this.convertBlockImage(node);
      case "admonition":
        return this.convertAdmonition(node);
      case "quote":
        return this.convertQuote(node);
      case "verse":
        return this.convertVerse(node);
      case "example":
        return this.convertExample(node);
      case "sidebar":
        return this.convertSidebar(node);
      case "open":
        return this.convertOpen(node);
      case "preamble":
        return this.convertPreamble(node);
      case "pass":
        return this.convertPass(node);
      case "thematic_break":
        return "* * *";
      case "page_break":
        return "* * *";

      // inline nodes
      case "inline_quoted":
        return this.convertInlineQuoted(node);
      case "inline_anchor":
        return this.convertInlineAnchor(node);
      case "inline_image":
        return this.convertInlineImage(node);
      case "inline_footnote":
        return this.convertInlineFootnote(node);
      case "inline_break":
        return "\\\n";
      case "inline_callout":
        return node.getText?.() ?? "";
      case "inline_indexterm":
        return "";
      case "inline_kbd":
        return this.convertInlineKbd(node);
      case "inline_button":
        return this.convertInlineButton(node);
      case "inline_menu":
        return this.convertInlineMenu(node);

      default:
        return node.getContent?.() ?? "";
    }
  }

  // ----- block nodes --------------------------------------------------------

  private convertDocument(node: AsciiNode, transform?: string): string {
    const parts: string[] = [];

    if (transform !== "embedded") {
      const title = node.getDocumentTitle?.({ partition: false });
      if (title) {
        parts.push(`# ${title}`);
      }
    }

    parts.push(...this.convertChildBlocks(node));
    return parts.join("\n\n");
  }

  private convertEmbedded(node: AsciiNode): string {
    return this.convertChildBlocks(node).join("\n\n");
  }

  private convertSection(node: AsciiNode): string {
    const level: number = node.getLevel() + 1; // asciidoc level 0 = doc title
    const hashes = "#".repeat(level);
    const title = node.getTitle() ?? "";

    const parts = [`${hashes} ${title}`, ...this.convertChildBlocks(node)];
    return parts.join("\n\n");
  }

  /** Convert all child blocks and return as array of strings. */
  private convertChildBlocks(node: AsciiNode): string[] {
    const blocks: AsciiNode[] = node.getBlocks?.() ?? [];
    return blocks
      .map((block: AsciiNode) => this.convert(block))
      .filter((s: string) => s.length > 0);
  }

  private convertParagraph(node: AsciiNode): string {
    const title = node.getTitle?.();
    const content: string = node.getContent() ?? "";
    if (title) {
      return `*${title}*\n\n${content}`;
    }
    return content;
  }

  private convertListing(node: AsciiNode): string {
    const source: string = node.getSource() ?? "";
    const lang = node.getAttribute("language") ?? "";
    const tick = "```";
    return `${tick}${lang}\n${source}\n${tick}`;
  }

  private convertLiteral(node: AsciiNode): string {
    const source: string = node.getSource() ?? "";
    return "```\n" + source + "\n```";
  }

  // ----- lists --------------------------------------------------------------

  private convertUnorderedList(
    node: AsciiNode,
    indent: number = 0,
  ): string {
    const items: AsciiNode[] = node.getItems?.() ?? node.getBlocks?.() ?? [];
    const prefix = "  ".repeat(indent);
    return items
      .map((item: AsciiNode) => {
        const text = this.renderListItemContent(item, indent);
        return `${prefix}- ${text}`;
      })
      .join("\n");
  }

  private convertOrderedList(
    node: AsciiNode,
    indent: number = 0,
  ): string {
    const items: AsciiNode[] = node.getItems?.() ?? node.getBlocks?.() ?? [];
    const prefix = "  ".repeat(indent);
    return items
      .map((item: AsciiNode, i: number) => {
        const text = this.renderListItemContent(item, indent);
        return `${prefix}${i + 1}. ${text}`;
      })
      .join("\n");
  }

  private renderListItemContent(
    item: AsciiNode,
    indent: number,
  ): string {
    const text: string = item.getText?.() ?? "";
    const blocks: AsciiNode[] = item.getBlocks?.() ?? [];

    const parts = [text];
    for (const child of blocks) {
      const childName = child.getNodeName?.();
      if (childName === "ulist") {
        parts.push(this.convertUnorderedList(child, indent + 1));
      } else if (childName === "olist") {
        parts.push(this.convertOrderedList(child, indent + 1));
      } else {
        parts.push(this.convert(child));
      }
    }
    return parts.join("\n");
  }

  private convertListItem(node: AsciiNode): string {
    return node.getText?.() ?? "";
  }

  private convertDescriptionList(node: AsciiNode): string {
    const items = node.getItems?.() ?? [];
    const lines: string[] = [];
    for (const entry of items) {
      if (!Array.isArray(entry)) continue;
      const terms: AsciiNode[] = entry[0] ?? [];
      const desc: AsciiNode | undefined = entry[1];
      for (const term of Array.isArray(terms) ? terms : [terms]) {
        const termText = term.getText?.() ?? "";
        lines.push(`: ${termText}`);
      }
      if (desc) {
        const descText = (desc.getText?.() ?? "").trim();
        if (descText) {
          lines.push(`  ${descText}`);
        }
        const blocks: AsciiNode[] = desc.getBlocks?.() ?? [];
        for (const block of blocks) {
          const converted = this.convert(block)
            .split("\n")
            .map((l: string) => `  ${l}`)
            .join("\n");
          lines.push(converted);
        }
      }
      lines.push("");
    }
    return lines.join("\n").trimEnd();
  }

  // ----- table --------------------------------------------------------------

  private convertTable(node: AsciiNode): string {
    const lines: string[] = [];
    const headRows: AsciiNode[][] = node.getHeadRows?.() ?? [];
    const bodyRows: AsciiNode[][] = node.getBodyRows?.() ?? [];

    const allRows = [...headRows, ...bodyRows];
    if (allRows.length === 0) return "";

    const colCount =
      allRows[0]?.length ?? node.getAttribute("colcount") ?? 0;

    for (let ri = 0; ri < allRows.length; ri++) {
      const row = allRows[ri];
      const cells = row.map((cell: AsciiNode) => {
        const text: string = (cell.getText?.() ?? "").replace(/\n/g, " ");
        return ` ${text} `;
      });
      lines.push(`|${cells.join("|")}|`);

      // Separator after header
      if (ri === headRows.length - 1 && headRows.length > 0) {
        const sep = Array.from(
          { length: colCount },
          () => " --- ",
        );
        lines.push(`|${sep.join("|")}|`);
      }
    }

    // If no header rows, still add a separator after row 0
    if (headRows.length === 0 && allRows.length > 0) {
      const sep = Array.from({ length: colCount }, () => " --- ");
      lines.splice(1, 0, `|${sep.join("|")}|`);
    }

    return lines.join("\n");
  }

  // ----- block-level structures ---------------------------------------------

  private convertBlockImage(node: AsciiNode): string {
    const target = node.getTarget?.() ?? node.getAttribute("target") ?? "";
    const alt = node.getAttribute("alt") ?? "";
    const title = node.getTitle?.();
    let result = `![${alt}](${target})`;
    if (title) {
      result = `![${alt}](${target} "${title}")`;
    }
    return result;
  }

  private convertAdmonition(node: AsciiNode): string {
    const style: string = (node.getStyle?.() ?? "note").toLowerCase();
    const content = this.convertChildBlocks(node).join("\n\n");
    return `{.${style}}\n:::\n${content}\n:::`;
  }

  private convertQuote(node: AsciiNode): string {
    const content = this.convertChildBlocks(node).join("\n\n");
    const attribution = node.getAttribute("attribution");
    const lines = content
      .split("\n")
      .map((l: string) => `> ${l}`)
      .join("\n");
    if (attribution) {
      return `${lines}\n>\n> — ${attribution}`;
    }
    return lines;
  }

  private convertVerse(node: AsciiNode): string {
    const content = this.convertChildBlocks(node).join("\n\n");
    return content
      .split("\n")
      .map((l: string) => `> ${l}`)
      .join("\n");
  }

  private convertExample(node: AsciiNode): string {
    const content = this.convertChildBlocks(node).join("\n\n");
    const title = node.getTitle?.();
    if (title) {
      return `{.example}\n:::\n*${title}*\n\n${content}\n:::`;
    }
    return `{.example}\n:::\n${content}\n:::`;
  }

  private convertSidebar(node: AsciiNode): string {
    const content = this.convertChildBlocks(node).join("\n\n");
    const title = node.getTitle?.();
    if (title) {
      return `{.sidebar}\n:::\n*${title}*\n\n${content}\n:::`;
    }
    return `{.sidebar}\n:::\n${content}\n:::`;
  }

  private convertOpen(node: AsciiNode): string {
    return this.convertChildBlocks(node).join("\n\n");
  }

  private convertPreamble(node: AsciiNode): string {
    return this.convertChildBlocks(node).join("\n\n");
  }

  private convertPass(node: AsciiNode): string {
    return node.getContent() ?? "";
  }

  // ----- inline nodes -------------------------------------------------------

  private convertInlineQuoted(node: AsciiNode): string {
    const type: string = node.getType?.() ?? "";
    const text: string = node.getText?.() ?? "";

    switch (type) {
      case "strong":
        return `*${text}*`;
      case "emphasis":
        return `_${text}_`;
      case "monospaced":
        return `\`${text}\``;
      case "superscript":
        return `^${text}^`;
      case "subscript":
        return `~${text}~`;
      case "double":
        return `"${text}"`;
      case "single":
        return `'${text}'`;
      case "mark":
        return `{=${text}=}`;
      case "unquoted":
        return text;
      default:
        return text;
    }
  }

  private convertInlineAnchor(node: AsciiNode): string {
    const type: string = node.getType?.() ?? "";
    const text: string = node.getText?.() ?? "";
    const target: string = node.getTarget?.() ?? "";
    const role: string = node.getRole?.() ?? "";

    switch (type) {
      case "link":
        if (role === "bare") {
          return `<${target}>`;
        }
        return `[${text || target}](${target})`;

      case "xref": {
        // Cross-references in NIP-54 are wikilinks
        const reftext = node.getAttribute("reftext") ?? "";
        if (reftext && reftext !== target) {
          return `[${reftext}][${target}]`;
        }
        return `[${text || target}][]`;
      }

      case "ref":
        // Inline anchor (id definition) — no visible output in Djot
        return `{#${target}}`;

      case "bibref":
        return `[${target}]`;

      default:
        if (target) {
          return `[${text || target}](${target})`;
        }
        return text;
    }
  }

  private convertInlineImage(node: AsciiNode): string {
    const target = node.getTarget?.() ?? "";
    const alt = node.getAttribute("alt") ?? "";
    return `![${alt}](${target})`;
  }

  private convertInlineFootnote(node: AsciiNode): string {
    const text: string = node.getText?.() ?? "";
    const id = node.getId?.();
    if (id) {
      return `[^${id}]`;
    }
    // Inline footnote: generate a numeric ref (Djot doesn't support
    // inline footnotes, so we approximate)
    return `[^${text.slice(0, 20).replace(/\s+/g, "-")}]`;
  }

  private convertInlineKbd(node: AsciiNode): string {
    const keys: string[] = node.getAttribute("keys") ?? [];
    return keys.map((k: string) => `\`${k}\``).join("+");
  }

  private convertInlineButton(node: AsciiNode): string {
    return `*${node.getText?.() ?? ""}*`;
  }

  private convertInlineMenu(node: AsciiNode): string {
    const menu = node.getAttribute("menu") ?? "";
    const submenus: string[] = node.getAttribute("submenus") ?? [];
    const menuitem = node.getAttribute("menuitem") ?? "";
    return [menu, ...submenus, menuitem].filter(Boolean).join(" > ");
  }
}
