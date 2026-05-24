#!/usr/bin/env node
// Thin shim — the actual CLI lives in dist/cli.js (built from src/cli.ts).
import { main } from "../dist/cli.js";

main(process.argv.slice(2)).then(
  (code) => process.exit(code ?? 0),
  (err) => {
    // Last-resort error path. CliError is handled inside main(); anything
    // landing here is a programmer bug.
    process.stderr.write(`fatal: ${err?.stack ?? err}\n`);
    process.exit(1);
  },
);
