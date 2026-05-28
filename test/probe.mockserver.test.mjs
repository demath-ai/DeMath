// Happy-path mock-server test for `demath probe`. Spins up an HTTP server
// on a random port, points the CLI at it via --api-url, asserts the
// request body and the CLI exit code.

import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));
const bin = resolve(here, "..", "bin", "demath.mjs");

function startMock() {
  return new Promise((resolveStart) => {
    let received = null;
    const server = createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        received = {
          method: req.method,
          url: req.url,
          ua: req.headers["user-agent"],
          body: body ? JSON.parse(body) : null,
        };
        if (req.url === "/providers/probe" && req.method === "POST") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, provider: "anthropic" }));
          return;
        }
        if (req.url === "/problems" && req.method === "GET") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              problems: [
                {
                  id: "test",
                  name: "Test problem",
                  expected_difficulty: "test",
                  classification: "binary",
                },
              ],
            }),
          );
          return;
        }
        res.writeHead(404);
        res.end();
      });
    });
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolveStart({
        url: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise((r) => {
            server.close(() => r());
          }),
        getReceived: () => received,
      });
    });
  });
}

function runCli(args, env = {}) {
  return new Promise((resolveRun) => {
    const child = spawn(process.execPath, [bin, ...args], {
      env: { ...process.env, ...env },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => (stdout += c));
    child.stderr.on("data", (c) => (stderr += c));
    child.on("close", (code) => resolveRun({ code, stdout, stderr }));
  });
}

test("probe hits /providers/probe and exits 0 on ok=true", async () => {
  const mock = await startMock();
  try {
    const r = await runCli([
      "probe",
      "--api-url",
      mock.url,
      "--model",
      "anthropic/claude-opus-4-8",
      "--key",
      "sk-ant-test",
      "--json",
    ]);
    assert.equal(r.code, 0, `stderr was: ${r.stderr}`);
    const parsed = JSON.parse(r.stdout);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.provider, "anthropic");

    const got = mock.getReceived();
    assert.equal(got.method, "POST");
    assert.equal(got.url, "/providers/probe");
    assert.equal(got.body.model, "anthropic/claude-opus-4-8");
    assert.equal(got.body.api_key, "sk-ant-test");
    assert.match(got.ua, /^demath-cli-npm\//);
  } finally {
    await mock.close();
  }
});

test("problems --json round-trip against mock", async () => {
  const mock = await startMock();
  try {
    const r = await runCli(["problems", "--api-url", mock.url, "--json"]);
    assert.equal(r.code, 0);
    const parsed = JSON.parse(r.stdout);
    assert.equal(parsed.problems.length, 1);
    assert.equal(parsed.problems[0].id, "test");
  } finally {
    await mock.close();
  }
});
