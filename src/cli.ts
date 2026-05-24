import { CLI_VERSION, DEFAULT_API_URL } from "./constants.js";
import { CliError } from "./errors.js";
import { logErr } from "./output.js";
import {
  EXAMPLES_HELP,
  MINE_HELP,
  PROBE_HELP,
  PROBLEMS_HELP,
  STATUS_HELP,
  TOP_LEVEL_HELP,
  getBool,
  getNumber,
  getString,
  parseArgs,
  requireString,
} from "./parser.js";
import { runExamples } from "./commands/examples.js";
import { runMine } from "./commands/mine.js";
import { runProblems } from "./commands/problems.js";
import { runProbe } from "./commands/probe.js";
import { runSkill } from "./commands/skill.js";
import { runStatus } from "./commands/status.js";

/**
 * Resolve a provider API key from --key, $DEMATH_PROVIDER_API_KEY, or
 * stdin (when --key=-). Argv is preferred to env (least surprise) but
 * the env var is the SAFE path on shared hosts — argv is visible to
 * other users via /proc/<pid>/cmdline. We log a stderr warning when
 * the key arrived via argv to nudge operators toward the env var.
 */
async function resolveApiKey(
  flagValue: string | undefined,
  jsonMode: boolean = false,
): Promise<string> {
  if (flagValue === "-") {
    // Stdin path: read everything on stdin, trim. Avoids ps leak.
    const buf: Buffer[] = [];
    for await (const chunk of process.stdin) {
      buf.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    const v = Buffer.concat(buf).toString("utf8").trim();
    if (!v) throw new CliError("--key - was set but stdin was empty", 2);
    return v;
  }
  if (flagValue) {
    // Skip the ps-leak nudge when stderr is non-TTY (piped) or the
    // caller asked for --json — those are programmatic pipelines and
    // a spammy human-readable warning derails grep/jq/agent parsers.
    if (!jsonMode && process.stderr.isTTY) {
      logErr(
        "  note: --key passed on the command line is visible to other local " +
          "users (ps / /proc/<pid>/cmdline). For shared hosts, prefer " +
          "DEMATH_PROVIDER_API_KEY=... or --key=-",
      );
    }
    return flagValue;
  }
  const envValue = process.env.DEMATH_PROVIDER_API_KEY?.trim();
  if (envValue) return envValue;
  throw new CliError(
    "missing API key: pass --key <value>, --key=- (stdin), or set DEMATH_PROVIDER_API_KEY",
    2,
  );
}

// Entry point. Returns the exit code rather than calling process.exit() so
// it can be invoked from tests too.
export async function main(argv: string[]): Promise<number> {
  if (argv.length === 0) {
    process.stdout.write(TOP_LEVEL_HELP);
    return 0;
  }

  // Top-level --help / --version short-circuit.
  if (argv[0] === "--help" || argv[0] === "-h" || argv[0] === "help") {
    process.stdout.write(TOP_LEVEL_HELP);
    return 0;
  }
  if (argv[0] === "--version" || argv[0] === "-v") {
    process.stdout.write(`${CLI_VERSION}\n`);
    return 0;
  }

  const command = argv[0]!;
  const rest = argv.slice(1);
  const parsed = parseArgs(rest);

  // Per-command --help short-circuit.
  if (getBool(parsed.flags, "help") || getBool(parsed.flags, "h")) {
    switch (command) {
      case "problems":
        process.stdout.write(PROBLEMS_HELP);
        return 0;
      case "probe":
        process.stdout.write(PROBE_HELP);
        return 0;
      case "mine":
        process.stdout.write(MINE_HELP);
        return 0;
      case "status":
        process.stdout.write(STATUS_HELP);
        return 0;
      case "examples":
        process.stdout.write(EXAMPLES_HELP);
        return 0;
      default:
        process.stdout.write(TOP_LEVEL_HELP);
        return 0;
    }
  }

  const apiUrl = (getString(parsed.flags, "api-url") ?? DEFAULT_API_URL).replace(/\/+$/, "");
  const json = getBool(parsed.flags, "json");

  try {
    switch (command) {
      case "problems":
        return await runProblems({ apiUrl, json });

      case "probe":
        return await runProbe({
          apiUrl,
          json,
          model: requireString(parsed.flags, "model"),
          apiKey: await resolveApiKey(getString(parsed.flags, "key"), json),
        });

      case "mine":
        return await runMine({
          apiUrl,
          json,
          problem: requireString(parsed.flags, "problem"),
          model: requireString(parsed.flags, "model"),
          apiKey: await resolveApiKey(getString(parsed.flags, "key"), json),
          wallet: requireString(parsed.flags, "wallet"),
          maxIterations: getNumber(parsed.flags, "max-iterations"),
          maxUsd: getNumber(parsed.flags, "max-usd"),
        });

      case "status": {
        const attemptId =
          getString(parsed.flags, "attempt") ??
          getString(parsed.flags, "attempt-id") ??
          parsed.positional[0];
        if (!attemptId) {
          throw new CliError("missing required flag --attempt <id>", 2);
        }
        return await runStatus({ apiUrl, json, attemptId });
      }

      case "examples":
        return runExamples();

      case "skill":
        return runSkill();

      default:
        logErr(`  error: unknown command '${command}'`);
        logErr();
        process.stdout.write(TOP_LEVEL_HELP);
        return 2;
    }
  } catch (err) {
    if (err instanceof CliError) {
      if (json) {
        process.stdout.write(
          JSON.stringify({ error: err.message, exit_code: err.exitCode }) + "\n",
        );
      } else {
        logErr(`  error: ${err.message}`);
      }
      return err.exitCode;
    }
    const msg = err instanceof Error ? err.message : String(err);
    if (json) {
      process.stdout.write(JSON.stringify({ error: msg, exit_code: 1 }) + "\n");
    } else {
      logErr(`  error: ${msg}`);
    }
    return 1;
  }
}
