import { DemathClient } from "../api.js";
import { SUCCESS_STATUSES } from "../constants.js";
import { logErr, printJson, truncate } from "../output.js";
import type { AttemptRecord } from "../types.js";

export interface StatusArgs {
  apiUrl: string;
  attemptId: string;
  json: boolean;
}

export async function runStatus(args: StatusArgs): Promise<number> {
  const client = new DemathClient({ apiUrl: args.apiUrl });
  const record = await client.getAttempt(args.attemptId);

  const status = (record.status ?? "").toLowerCase();

  if (args.json) {
    printJson(record);
    // Exit-code contract for automation: 0 if the attempt closed
    // successfully (proof_complete / counterexample / breakthrough),
    // 1 if it terminated unsuccessfully (error / stopped / progress
    // tiers when capped), 2 if it's still running (no terminal state).
    if (SUCCESS_STATUSES.has(status)) return 0;
    if (status === "running" || status === "") return 2;
    return 1;
  }

  printFinal(record);
  if (SUCCESS_STATUSES.has(status)) return 0;
  if (status === "running" || status === "") return 2;
  return 1;
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
}
