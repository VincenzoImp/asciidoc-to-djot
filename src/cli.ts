/**
 * CLI entry point for asciidoc-to-djot.
 *
 * Usage:
 *   asciidoc-to-djot [options] [file]
 *
 * Reads from <file> or stdin, writes Djot to stdout or -o <file>.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { convert } from "./index.js";

interface CliArgs {
  inputFile?: string;
  outputFile?: string;
  validate: boolean;
  quiet: boolean;
  help: boolean;
  version: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    validate: true,
    quiet: false,
    help: false,
    version: false,
  };

  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "-h":
      case "--help":
        args.help = true;
        break;
      case "-v":
      case "--version":
        args.version = true;
        break;
      case "-o":
      case "--output":
        args.outputFile = argv[++i];
        break;
      case "--validate":
        args.validate = true;
        break;
      case "--no-validate":
        args.validate = false;
        break;
      case "-q":
      case "--quiet":
        args.quiet = true;
        break;
      default:
        if (arg.startsWith("-")) {
          process.stderr.write(`Unknown option: ${arg}\n`);
          process.exit(1);
        }
        positional.push(arg);
    }
  }

  args.inputFile = positional[0];
  return args;
}

function printHelp(): void {
  const help = `
asciidoc-to-djot — Convert NIP-54 wiki articles from Asciidoc to Djot

USAGE
  asciidoc-to-djot [options] [file]

ARGUMENTS
  file                Input file (reads stdin if omitted)

OPTIONS
  -o, --output <file> Write output to file (stdout if omitted)
  --validate          Validate output as Djot (default)
  --no-validate       Skip Djot validation
  -q, --quiet         Suppress warnings
  -h, --help          Show this help
  -v, --version       Show version

EXAMPLES
  asciidoc-to-djot article.adoc
  echo '== Title' | asciidoc-to-djot
  asciidoc-to-djot -o article.djot article.adoc
`.trimStart();

  process.stdout.write(help);
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    process.stdin.on("error", reject);
  });
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  if (args.version) {
    process.stdout.write("0.1.0\n");
    return;
  }

  // Read input
  let input: string = "";
  if (args.inputFile) {
    try {
      input = readFileSync(args.inputFile, "utf-8");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(`Error reading ${args.inputFile}: ${msg}\n`);
      process.exit(1);
    }
  } else {
    if (process.stdin.isTTY) {
      process.stderr.write("Reading from stdin (Ctrl+D to end)...\n");
    }
    input = await readStdin();
  }

  // Convert
  const { djot, warnings } = convert(input, { validate: args.validate });

  // Print warnings
  if (!args.quiet && warnings.length > 0) {
    for (const w of warnings) {
      process.stderr.write(`warning: ${w}\n`);
    }
  }

  // Write output
  if (args.outputFile) {
    writeFileSync(args.outputFile, djot, "utf-8");
  } else {
    process.stdout.write(djot);
  }
}

main().catch((err) => {
  process.stderr.write(`${err}\n`);
  process.exit(1);
});
