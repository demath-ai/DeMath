import { DemathClient } from "../api.js";
import { APPROVED_MODELS } from "../constants.js";
import { CliError } from "../errors.js";
import { logErr, printJson } from "../output.js";

export interface ProbeArgs {
  apiUrl: string;
  model: string;
  apiKey: string;
  json: boolean;
}

export async function runProbe(args: ProbeArgs): Promise<number> {
  if (!(APPROVED_MODELS as readonly string[]).includes(args.model)) {
    throw new CliError(
      `model must be one of: ${APPROVED_MODELS.join(", ")}`,
      2,
    );
  }

  const client = new DemathClient({ apiUrl: args.apiUrl });

  if (!args.json) {
    logErr(`  probing ${args.model} via auto-detected provider…`);
  }

  const out = await client.probe(args.model, args.apiKey);

  if (args.json) {
    printJson(out);
    return out.ok ? 0 : 2;
  }

  if (out.ok) {
    logErr(`  ✓ key works — provider: ${out.provider ?? "?"}`);
    return 0;
  }
  // Surface every diagnostic the backend gave us. Older builds only
  // showed `detail`, which is null on most error paths (the real signal
  // lives in `reason` + `provider_status` + `provider_message`).
  const parts: string[] = [];
  if (out.detail) parts.push(out.detail);
  if (out.reason) parts.push(`reason=${out.reason}`);
  if (out.provider_status !== undefined)
    parts.push(`provider_status=${out.provider_status}`);
  if (out.provider_message) parts.push(`provider_message=${out.provider_message}`);
  if (parts.length === 0 && out.error) parts.push(out.error);
  if (parts.length === 0) parts.push("(no detail returned by backend)");
  logErr(`  ✗ probe failed: ${parts.join(" · ")}`);
  return 2;
}
