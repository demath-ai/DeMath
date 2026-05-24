// Smoke test: every subcommand's --help must exit 0 and print non-empty stdout.

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));
const bin = resolve(here, "..", "bin", "demath.mjs");

function run(args) {
  return spawnSync(process.execPath, [bin, ...args], { encoding: "utf8" });
}

const cases = [
  ["--help"],
  ["--version"],
  ["problems", "--help"],
  ["probe", "--help"],
  ["mine", "--help"],
  ["status", "--help"],
  ["examples", "--help"],
  ["examples"],
];

for (const argv of cases) {
  test(`demath ${argv.join(" ")} exits 0 with output`, () => {
    const r = run(argv);
    assert.equal(r.status, 0, `stderr was: ${r.stderr}`);
    assert.ok(r.stdout.length > 0, "expected non-empty stdout");
  });
}

test("demath probe without flags exits 2 (missing --model)", () => {
  const r = run(["probe"]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /missing required flag --model/);
});

test("demath probe with invalid model exits 2", () => {
  const r = run(["probe", "--model", "claude-3.5-sonnet", "--key", "sk-fake"]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /model must be one of/);
});
