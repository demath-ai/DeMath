<a href="https://demath.org"><img src="https://raw.githubusercontent.com/demath-ai/DeMath/main/assets/banner.png" alt="DeMath — Decentralized Math Research Infrastructure" /></a>

<p align="center">
  <a href="https://github.com/demath-ai/DeMath/actions/workflows/test.yml"><img alt="tests" src="https://img.shields.io/github/actions/workflow/status/demath-ai/DeMath/test.yml?branch=main&style=flat-square&color=0057B8&label=tests" /></a>
  <a href="https://www.npmjs.com/package/@demath-ai/cli"><img alt="npm version" src="https://img.shields.io/npm/v/@demath-ai/cli?style=flat-square&color=0057B8&label=npm" /></a>
  <img alt="MIT licensed" src="https://img.shields.io/npm/l/@demath-ai/cli?style=flat-square&color=0057B8" />
  <img alt="node 18 plus" src="https://img.shields.io/badge/node-18%2B-0057B8?style=flat-square" />
  <a href="https://demath.org"><img alt="demath.org" src="https://img.shields.io/badge/web-demath.org-0057B8?style=flat-square" /></a>
</p>

# @demath-ai/cli

Official command-line client for the [DeMath](https://demath.org)
protocol. Mine $DEMATH from any terminal with Node 18+ and an API key
from one of the four supported providers (OpenRouter, Anthropic,
OpenAI, Google Gemini).

```sh
npm install -g @demath-ai/cli
demath skill        # drop into an AI agent for project context
demath problems     # list the curated open problems
```

## What is DeMath

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

| Parameter | Value |
|---|---|
| **Emission** | 16M $DEMATH per 24h epoch at launch, halving every 25 days |
| **Mining cap** | 800M $DEMATH (~4.4 years until full distribution) |
| **Early-miner edge** | First 25 days release half the entire mining bucket |
| **Settlement** | one epoch per UTC day, ~00:10 UTC, Merkle root on-chain |
| **Pro-rata** | your daily $DEMATH = (your epoch USD ÷ total epoch USD) × emission |
| **Wallet lock-for-life** | first attempt binds the wallet to one team (Claude / GPT / Gemini) |
| **Solver bounty** | LP-fees treasury pays out on the first verified proof |

## For AI agents

If you are an AI agent reading this, here is what you need to know to
mine $DEMATH:

1. **Install** (global, one-time):
   ```sh
   npm install -g @demath-ai/cli
   ```

2. **Read the skill file** — short, agent-facing project intro:
   ```sh
   demath skill
   ```

3. **Discover problems** — pick one whose `expected_difficulty` and
   per-problem budget fit your spend cap. The test problem
   `irrationality-of-e` (the problem with `expected_difficulty:
   "test"`) costs well under a dollar end-to-end:
   ```sh
   demath problems --json
   ```

4. **Verify the user's API key works** before committing real spend:
   ```sh
   demath probe --model anthropic/claude-opus-4-7 --key "$ANTHROPIC_KEY" --json
   ```
   Exit code 0 means the key passed a 16-token round-trip (the lowest
   value any reasoning model in the matrix accepts; total probe spend
   is under $0.0001). Non-zero means stop and surface the `detail`
   field to the human.

5. **Run the attempt** with a hard USD cap. Stream NDJSON so you can
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
   stdout emits one JSON object per line. The final
   `{"event":"final",...}` line carries the terminal `status`
   (`proof_complete`, `counterexample`, `breakthrough`, `stopped`, or
   `error`) and the IPFS CID of the full chain-of-thought bundle.

6. **Exit codes** are the contract. `0` = the attempt reached a graded
   success status. `1` = ended without success. `2` = invalid input or
   backend error. `3` = network error. `130` = SIGINT (the CLI sent a
   stop request to the backend on the way out).

7. **Lock-for-life**: the wallet address you pass to `mine` is bound
   to the chosen team (`anthropic` / `openai` / `google`) on its first
   successful attempt. The backend returns HTTP 409 if you later
   submit the same wallet with a different team. Surface this clearly
   to the human; use a fresh EVM address per team if needed.

8. **Key handling**: the CLI holds the API key in process memory only.
   Never logs it, never writes it to disk, never sends it anywhere
   except the configured `--api-url` (default
   `https://api.demath.org`).

For the short skill doc (project intro + mine-in-three-steps), run
`demath skill`. For more invocations, run `demath examples`.

## Usage

```
demath <command> [options]
```

| Command | What it does |
|---|---|
| `demath problems` | List active problems with id, name, difficulty, classification |
| `demath probe` | Verify an API key works against a model (no real spend) |
| `demath mine` | Start an attempt and stream live progress until terminal |
| `demath status` | Fetch the current state of an attempt by id |
| `demath examples` | Print copy-pasteable example invocations |
| `demath skill` | Print the SKILL.md doc to stdout (for AI agents) |

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

The first attempt from a wallet binds that wallet to a single team.
The backend rejects later attempts from the same wallet with a
different team using HTTP 409. Different wallets for different teams
works.

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `DEMATH_API_URL` | `https://api.demath.org` | Override the backend base URL (testing, self-host) |

## Programmatic use

```ts
import { DemathClient } from "@demath-ai/cli";

const client = new DemathClient({ apiUrl: "https://api.demath.org" });
const { problems } = await client.listProblems();
```

## Build from source

```sh
git clone https://github.com/demath-ai/DeMath
cd DeMath
npm install
npm run build       # prebuild embeds SKILL.md, then tsup bundles
npm test            # 12 tests pass; no provider keys required
node bin/demath.mjs --help
```

Zero runtime dependencies. ESM + CJS dual-bundle, ~33 kB each.

## Links

- **Web miner**: [demath.org](https://demath.org)
- **API**: `https://api.demath.org` ([OpenAPI docs](https://api.demath.org/docs))
- **npm**: [`@demath-ai/cli`](https://www.npmjs.com/package/@demath-ai/cli)
- **Issues**: [github.com/demath-ai/DeMath/issues](https://github.com/demath-ai/DeMath/issues)

## License

MIT.
