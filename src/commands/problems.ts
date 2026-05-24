import { DemathClient } from "../api.js";
import { logErr, padRight, printJson } from "../output.js";

export interface ProblemsArgs {
  apiUrl: string;
  json: boolean;
}

export async function runProblems(args: ProblemsArgs): Promise<number> {
  const client = new DemathClient({ apiUrl: args.apiUrl });
  const payload = await client.listProblems();
  const problems = payload.problems ?? [];

  if (args.json) {
    printJson({ problems });
    return 0;
  }

  // Dynamic column widths so long classification labels (e.g.
  // `value-determination` at 19 chars) don't overflow a hardcoded
  // 18-char box and break the alignment.
  const idWidth = Math.max(20, ...problems.map((p) => p.id.length));
  const diffWidth = Math.max(
    7,
    ...problems.map((p) => (p.expected_difficulty ?? "?").length),
  );
  const clsWidth = Math.max(
    10,
    ...problems.map((p) => (p.classification ?? "?").length),
  );

  for (const p of problems) {
    const diff = (p.expected_difficulty ?? "?") as string;
    const cls = (p.classification ?? "?") as string;
    process.stdout.write(
      `  ${padRight(p.id, idWidth)} [${padRight(diff, diffWidth)}] [${padRight(cls, clsWidth)}] ${p.name}\n`,
    );
  }
  logErr();
  logErr(`  ${problems.length} problems active`);
  return 0;
}
