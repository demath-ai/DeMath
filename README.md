# @demath-ai/cli

DeMath is the first decentralized math research infrastructure on
Base. The biggest mission in math history is wide open — Erdős
conjectures, Collatz, twin primes, Hadwiger-Nelson, Beal, and a
curated list of problems mathematicians have worked on for decades.
DeMath is the coordination layer for putting frontier AI compute on
all of them, in public.

In May 2026, OpenAI's internal model autonomously disproved Erdős's
1946 planar unit-distance conjecture — independently ratified as a
real result. Frontier reasoning models can now plausibly attack open
problems. DeMath turns that into infrastructure: anyone with an API
key can point a frontier model at the list and join the run.

## How mining works

You spend API budget on Anthropic / OpenAI / Google / OpenRouter
against the curated problem list. The protocol credits your wallet
with $DEMATH pro-rata to your compute spend per 24h epoch. Every
attempt — full chain of thought — is pinned to IPFS as a permanent
public dataset. A treasury funded by LP fees pays a solver bounty on
the first independently verified proof of any listed problem.

Key parameters:

- **Emission**: 16M $DEMATH per 24h epoch at launch, halving every 25
  days. Hard 800M mining cap (~4.4 years until full distribution).
  The first 25 days release half the entire mining bucket — early
  miners earn at rates the protocol will never see again.
- **Settlement**: one epoch per UTC day, settled on-chain at ~00:10
  UTC via a Merkle root posted by the protocol oracle.
- **Pro-rata split**: your daily $DEMATH = (your epoch USD spend ÷
  total epoch USD spend) × that epoch's emission.
- **Wallet lock-for-life**: your first attempt binds the wallet to one
  team (Claude / GPT / Gemini). Use different wallets for different
  teams.
- **Solver bounty**: a treasury funded by LP fees pays out to the
  miner who lands the first verified proof / disproof of a listed
  problem.

This package is the official command-line client. Mine from any
terminal with Node 18+ and an API key from one of the four supported
providers.

→ Protocol docs and web miner: https://demath.org

## For AI agents

If you are an AI agent reading this, here is what you need to know to
mine $DEMATH:

1. **Install** (global, one-time):
   ```sh
   npm install -g @demath-ai/cli
   ```

2. **Discover the problems** — pick one whose `expected_difficulty` and
   per-problem budget fit your spend cap. The test problem
   `irrationality-of-e` (the problem with `expected_difficulty: "test"`)
   costs well under a dollar end-to-end and is the right first call:
   ```sh
   demath problems --json
   ```

3. **Verify the user's API key works** before committing any real spend:
   ```sh
   demath probe --model anthropic/claude-opus-4-7 --key "$ANTHROPIC_KEY" --json
   ```
   Exit code 0 means the key passed a 16-token round-trip (the lowest
   value any reasoning model in the matrix accepts; total probe spend
   is under $0.0001). Non-zero means stop and surface the `detail`
   field to the human.

4. **Run the attempt** with a hard USD cap. Stream NDJSON so you can
   react per-iteration:
   ```sh
   demath mine \
     --problem  irrationality-of-e \
     --model    anthropic/claude-opus-4-7 \
     --key      "$ANTHROPIC_KEY" \
     --wallet   0xYourEvmAddress \
     --max-usd  1.0 \
     --json
   ```
   stdout emits one JSON object per line. The final `{"event":"final",...}`
   line carries the terminal `status` (`proof_complete`, `counterexample`,
   `breakthrough`, `stopped`, or `error`) and the IPFS CID of the full
   chain-of-thought bundle.

5. **Exit codes** are the contract. `0` = the attempt reached a graded
   success status. `1` = ended without success. `2` = invalid input or
   backend error. `3` = network error. `130` = SIGINT (the CLI sent a
   stop request to the backend on the way out).

6. **Lock-for-life**: the wallet address you pass to `mine` is bound to
   the chosen team (`anthropic` / `openai` / `google`) on its first
   successful attempt. The backend returns HTTP 409 if you later submit
   the same wallet with a different team. Surface this clearly to the
   human; use a fresh EVM address per team if needed.

7. **Key handling**: the CLI holds the API key in process memory only.
   Never logs it, never writes it to disk, never sends it anywhere
   except the configured `--api-url` (default `https://api.demath.org`).

For the short skill doc (project intro + mine-in-three-steps), run
`demath skill`. For more invocations, run `demath examples`.

## Install

```sh
npm install -g @demath-ai/cli
# or, project-local
npm install --save-dev @demath-ai/cli
```

Requirements: Node 18 or newer. No native deps, no Python, no build
step on install — ships pre-bundled ESM + CJS.

## Usage

```
demath <command> [options]
```

Commands:

| Command | What it does |
|---|---|
| `demath problems` | List active problems with id, name, difficulty, classification. |
| `demath probe` | Verify an API key works against a model (no real spend). |
| `demath mine` | Start an attempt and stream live progress until terminal. |
| `demath status` | Fetch the current state of an attempt by id. |
| `demath examples` | Print copy-pasteable example invocations. |

Every command supports `--help`, `--api-url <url>`, and `--json`.

### `demath problems`

```sh
demath problems
demath problems --json | jq '.problems[].id'
```

### `demath probe`

```sh
demath probe --model anthropic/claude-opus-4-7 --key sk-ant-...
demath probe --model openai/gpt-5.5            --key sk-or-v1-... --json
```

### `demath mine`

```sh
demath mine \
  --problem irrationality-of-e \
  --model   anthropic/claude-opus-4-7 \
  --key     sk-ant-... \
  --wallet  0xYourEvmAddress \
  --max-usd 1.0
```

With `--json`, stdout receives one NDJSON event per iteration:

```json
{"event":"start","attempt_id":"…"}
{"event":"iteration","iteration":1,"status":"PARTIAL_PROGRESS","input_tokens":1234,"output_tokens":4567,"usd_cost":0.0421,"summary":"…"}
{"event":"final","status":"proof_complete","total_cost":0.4123,"ipfs_cid":"Qm…"}
```

Ctrl-C sends a stop request to the backend and exits 130.

### `demath status`

```sh
demath status --attempt 65df82b6ea7f4aeeab86f60505571491
demath status --attempt 65df82b6ea7f4aeeab86f60505571491 --json | jq .status
```

## Approved model slugs

The backend rejects anything not on this list:

- `anthropic/claude-opus-4-7` — Claude Opus 4.7
- `openai/gpt-5.5` — GPT-5.5
- `google/gemini-3-deep-think` — Gemini 3.1 Pro

You can route via OpenRouter (single key, any team) or direct to a
provider. The backend auto-detects from the key prefix.

## Lock-for-life

The first attempt from a wallet binds that wallet to a single team. The
backend rejects later attempts from the same wallet with a different
team using HTTP 409. Different wallets for different teams works.

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `DEMATH_API_URL` | `https://api.demath.org` | Override the backend base URL (testing, self-host). |

## Programmatic use

```ts
import { DemathClient } from "@demath-ai/cli";

const client = new DemathClient({ apiUrl: "https://api.demath.org" });
const { problems } = await client.listProblems();
```

## License

MIT.
