// Tiny argv parser. No external dep — keeps the install footprint minimal.
// Supports: --flag, --flag value, --flag=value, positional args, -h/--help.

import { APPROVED_MODELS, CLI_VERSION, DEFAULT_API_URL } from "./constants.js";
import { CliError } from "./errors.js";

export interface ParsedFlags {
  positional: string[];
  flags: Map<string, string | true>;
}

export function parseArgs(argv: string[]): ParsedFlags {
  const positional: string[] = [];
  const flags = new Map<string, string | true>();

  let i = 0;
  while (i < argv.length) {
    const a = argv[i]!;
    if (a === "--") {
      positional.push(...argv.slice(i + 1));
      break;
    }
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq !== -1) {
        flags.set(a.slice(2, eq), a.slice(eq + 1));
        i++;
        continue;
      }
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("-")) {
        flags.set(key, next);
        i += 2;
      } else {
        flags.set(key, true);
        i++;
      }
      continue;
    }
    if (a.startsWith("-") && a.length > 1) {
      // short flags: only -h / -v are recognized
      flags.set(a.slice(1), true);
      i++;
      continue;
    }
    positional.push(a);
    i++;
  }
  return { positional, flags };
}

export function getString(flags: Map<string, string | true>, key: string): string | undefined {
  const v = flags.get(key);
  return typeof v === "string" ? v : undefined;
}

export function requireString(flags: Map<string, string | true>, key: string): string {
  const v = getString(flags, key);
  if (v === undefined) throw new CliError(`missing required flag --${key}`, 2);
  return v;
}

export function getBool(flags: Map<string, string | true>, key: string): boolean {
  return flags.has(key);
}

export function getNumber(flags: Map<string, string | true>, key: string): number | undefined {
  const v = getString(flags, key);
  if (v === undefined) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new CliError(`--${key} must be a number, got: ${v}`, 2);
  return n;
}

export const TOP_LEVEL_HELP = `\
demath ${CLI_VERSION} — mine $DEMATH from your terminal.

USAGE
  demath <command> [options]

COMMANDS
  problems      List active problems
  probe         Verify your provider API key works (no spend)
  mine          Start an attempt and stream live progress
  status        Show the current state of an attempt by id
  examples      Print copy-pasteable example invocations
  skill         Print the SKILL.md doc to stdout (for AI agents)
  --help        Show this help
  --version     Print CLI version

GLOBAL OPTIONS
  --api-url <url>  Backend base URL (default: ${DEFAULT_API_URL})
                   Override with DEMATH_API_URL env var.
  --json           Machine-readable output on stdout (for AI agents).
                   Per-command; only some commands stream NDJSON.

APPROVED MODEL SLUGS
${APPROVED_MODELS.map((m) => `  - ${m}`).join("\n")}

PROVIDER API KEY HANDLING
  DeMath never stores, persists, or logs your provider API key. The CLI
  sends it once per attempt to the backend, which forwards it inline to
  the upstream provider (Anthropic / OpenAI / Google / OpenRouter) and
  drops it from memory the moment the attempt finishes. No disk write,
  no log line, no telemetry, no IPFS bundle. Your billing relationship
  with the upstream provider remains entirely yours.

TEAMS AND KEYS
  A wallet can mine any of the three approved teams and switch teams
  anytime; the API key can be changed or rotated anytime too. Only the
  three approved models can mine, and the key must match the chosen
  team's provider. Same rules for web, CLI, and any bot client.

FOR AI AGENTS
  Run \`demath skill\` to print the short, human-readable skill doc
  (project intro + mine-in-three-steps + key constraints). The rest is
  in this --help and the per-command --help; refresh both before every
  invocation.

See \`demath examples\` for worked invocations.
See \`demath <command> --help\` for per-command flags.
`;

export const PROBLEMS_HELP = `\
demath problems — list active problems.

USAGE
  demath problems [--api-url <url>] [--json]

EXAMPLES
  demath problems
  demath problems --json | jq '.problems[].id'

EXIT CODES
  0  success
  2  backend error
  3  network error
`;

export const PROBE_HELP = `\
demath probe — verify an API key works for a model (no token spend
beyond a 1-token chat completion).

USAGE
  demath probe --model <slug> --key <api-key> [--api-url <url>] [--json]

REQUIRED
  --model   one of: ${APPROVED_MODELS.join(", ")}
  --key     provider API key (OpenRouter / Anthropic / OpenAI / Gemini direct)
            backend auto-detects the provider from the key prefix.

EXAMPLES
  demath probe --model anthropic/claude-opus-4-8 --key sk-ant-...
  demath probe --model openai/gpt-5.5 --key sk-or-v1-... --json

EXIT CODES
  0  key works
  2  probe failed / invalid model
  3  network error
`;

export const MINE_HELP = `\
demath mine — start an attempt and stream live progress until terminal.

USAGE
  demath mine --problem <id> --model <slug> --key <api-key>
              --wallet <0x...> [--max-iterations N] [--max-usd N]
              [--api-url <url>] [--json]

REQUIRED
  --problem         problem id (see \`demath problems\`)
  --model           one of: ${APPROVED_MODELS.join(", ")}
  --key             provider API key — held in memory only, never written to disk
  --wallet          EVM address that will receive emission claims

OPTIONAL
  --max-iterations  upper bound on agent loop iterations (default: backend default)
  --max-usd         upper bound on USD spend. Leave unset (default: backend
                    default) unless you specifically need to limit the run.
                    Reasoning models can ramp spend mid-attempt on legitimate
                    progress; a tight cap will stop them before they finish.
  --json            emit one NDJSON event per iteration on stdout

EXAMPLES
  demath mine \\
    --problem riemann-hypothesis \\
    --model   anthropic/claude-opus-4-8 \\
    --key     sk-ant-... \\
    --wallet  0xYourEvmAddress

  demath mine --problem collatz --model openai/gpt-5.5 \\
    --key sk-or-v1-... --wallet 0xAbc... --json | tee run.ndjson

EXIT CODES
  0  attempt reached a success status (proof_complete | counterexample | breakthrough)
  1  attempt ended without success (stopped | error)
  2  backend error / invalid model / missing flag
  3  network error
  130  interrupted by Ctrl-C (backend stop requested)
`;

export const STATUS_HELP = `\
demath status — show the current state of an attempt by id.

USAGE
  demath status --attempt <id> [--api-url <url>] [--json]

REQUIRED
  --attempt   attempt id returned by \`demath mine\` start

EXAMPLES
  demath status --attempt 65df82b6ea7f4aeeab86f60505571491
  demath status --attempt <id> --json | jq .status

EXIT CODES
  0  fetched successfully
  2  backend error
  3  network error
`;

export const EXAMPLES_HELP = `\
demath examples — print 5 copy-pasteable example invocations.

USAGE
  demath examples
`;
