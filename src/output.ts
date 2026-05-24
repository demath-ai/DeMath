// Small output helpers. The CLI writes progress / status to stderr so that
// `--json` consumers can read clean machine-readable JSON from stdout.

export function logErr(line = ""): void {
  process.stderr.write(line + "\n");
}

export function printJson(value: unknown): void {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
}

export function padRight(s: string, n: number): string {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

export function truncate(s: string, n: number): string {
  if (!s) return "";
  return s.length <= n ? s : s.slice(0, Math.max(0, n - 1)) + "…";
}
