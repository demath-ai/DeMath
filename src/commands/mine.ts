import { DemathClient } from "../api.js";
import {
  APPROVED_MODELS,
  POLL_INTERVAL_MS,
  SUCCESS_STATUSES,
  TERMINAL_STATUSES,
} from "../constants.js";
import { CliError } from "../errors.js";
import { logErr, padRight, printJson, truncate } from "../output.js";
import type { AttemptIteration, AttemptRecord } from "../types.js";

export interface MineArgs {
  apiUrl: string;
  problem: string;
  model: string;
  apiKey: string;
  wallet: string;
  maxIterations?: number;
  maxUsd?: number;
  json: boolean;
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const t = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(signal.reason);
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export async function runMine(args: MineArgs): Promise<number> {
  if (!(APPROVED_MODELS as readonly string[]).includes(args.model)) {
    throw new CliError(
      `model must be one of: ${APPROVED_MODELS.join(", ")}`,
      2,
    );
  }

  const ctrl = new AbortController();
  let interrupted = false;
  const onSig = () => {
    interrupted = true;
    ctrl.abort(new Error("SIGINT"));
  };
  process.on("SIGINT", onSig);
  process.on("SIGTERM", onSig);

  const client = new DemathClient({ apiUrl: args.apiUrl, signal: ctrl.signal });

  if (!args.json) {
    logErr(
      `  starting attempt: problem=${args.problem}  model=${args.model}  wallet=${args.wallet}`,
    );
    if (args.maxUsd !== undefined) {
      logErr(`  budget: $${args.maxUsd.toFixed(2)}`);
    }
  }

  const start = await client.startAttempt({
    problemId: args.problem,
    model: args.model,
    apiKey: args.apiKey,
    walletAddress: args.wallet,
    maxIterations: args.maxIterations,
    maxUsd: args.maxUsd,
  });
  const attemptId = start.attempt_id;
  if (!attemptId) {
    throw new CliError("backend did not return attempt_id", 2);
  }

  if (args.json) {
    // Stream one NDJSON event per iteration + a final attempt record.
    process.stdout.write(JSON.stringify({ event: "start", attempt_id: attemptId }) + "\n");
  } else {
    logErr(`  attempt_id: ${attemptId}`);
    logErr("  watching live progress (Ctrl+C to stop the attempt)…");
    logErr();
  }

  let lastIterCount = 0;
  let lastRecord: AttemptRecord | undefined;

  try {
    while (true) {
      try {
        await sleep(POLL_INTERVAL_MS, ctrl.signal);
      } catch {
        // Interrupted — fall through to the stop branch below.
        break;
      }

      const record = await client.getAttempt(attemptId);
      lastRecord = record;
      const iters = record.iterations ?? [];
      const status = record.status ?? "?";
      const totalCost = record.total_cost ?? 0;

      for (let i = lastIterCount; i < iters.length; i++) {
        const it = iters[i]!;
        if (args.json) {
          process.stdout.write(
            JSON.stringify({ event: "iteration", attempt_id: attemptId, ...it }) + "\n",
          );
        } else {
          printIterLine(it, totalCost);
        }
      }
      lastIterCount = iters.length;

      if (TERMINAL_STATUSES.has(status)) {
        if (args.json) {
          process.stdout.write(
            JSON.stringify({ event: "final", attempt_id: attemptId, ...record }) + "\n",
          );
        } else {
          logErr();
          printFinal(record);
        }
        process.off("SIGINT", onSig);
        process.off("SIGTERM", onSig);
        return SUCCESS_STATUSES.has(status) ? 0 : 1;
      }
    }
  } catch (err) {
    process.off("SIGINT", onSig);
    process.off("SIGTERM", onSig);
    if (!interrupted) throw err;
  }

  // Interrupted by user — attempt a clean stop.
  process.off("SIGINT", onSig);
  process.off("SIGTERM", onSig);
  if (!args.json) {
    logErr();
    logErr("  Ctrl+C — stopping the attempt…");
  }
  try {
    await new DemathClient({ apiUrl: args.apiUrl }).stopAttempt(attemptId);
    if (args.json) {
      process.stdout.write(JSON.stringify({ event: "stopped", attempt_id: attemptId }) + "\n");
    } else {
      logErr("  stopped");
      if (lastRecord) printFinal(lastRecord);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (args.json) {
      process.stdout.write(
        JSON.stringify({ event: "stop_failed", attempt_id: attemptId, error: msg }) + "\n",
      );
    } else {
      logErr(`  warning: stop request failed: ${msg}`);
    }
  }
  return 130;
}

function printIterLine(it: AttemptIteration, totalCost: number): void {
  const n = (it.iteration ?? 0).toString().padStart(3, " ");
  const status = padRight(it.status ?? "?", 22);
  const inT = (it.input_tokens ?? 0).toString().padStart(6, " ");
  const outT = (it.output_tokens ?? 0).toString().padStart(6, " ");
  const itCost = (it.usd_cost ?? 0).toFixed(4);
  const total = totalCost.toFixed(4);
  const summary = (it.summary ?? it.body ?? "").toString().replace(/\s+/g, " ");
  const tail = summary ? `  ${truncate(summary, 200)}` : "";
  logErr(
    `  iter ${n}  status=${status}  tokens in=${inT} out=${outT}  +$${itCost}  (total $${total})${tail}`,
  );
}

function printFinal(record: AttemptRecord): void {
  const status = (record.status ?? "?").toUpperCase();
  const cost = record.total_cost ?? 0;
  const inT = record.total_input_tokens ?? 0;
  const outT = record.total_output_tokens ?? 0;
  const iters = (record.iterations ?? []).length;
  const cid = record.ipfs_cid;

  logErr(`  ╔═ ${status} ═════════════════════════════════════`);
  logErr(`  ║  iterations:    ${iters}`);
  logErr(`  ║  tokens in:     ${inT}`);
  logErr(`  ║  tokens out:    ${outT}`);
  logErr(`  ║  total cost:    $${cost.toFixed(4)}`);
  if (cid) logErr(`  ║  IPFS bundle:   https://ipfs.io/ipfs/${cid}`);
  if (record.error) logErr(`  ║  error:         ${truncate(record.error, 200)}`);
  logErr(`  ╚════════════════════════════════════════════════`);
  logErr();
  if (SUCCESS_STATUSES.has((record.status ?? "").toLowerCase())) {
    logErr(
      "  Claim on the web: https://demath.org/claim (after the next epoch settles, 24h cadence on mainnet)",
    );
  }
}
