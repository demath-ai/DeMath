// `demath examples` — print copy-pasteable worked examples. Important for
// AI agents to ground their tool calls.

const EXAMPLES = `\
DeMath CLI — worked examples

  1) Look at the active problems (machine-readable):

       demath problems --json

  2) Probe your API key against a model before committing (zero spend):

       demath probe \\
         --model anthropic/claude-opus-4-7 \\
         --key   sk-ant-... \\
         --json

  3) Start an attempt on the test problem (a few cents end-to-end):

       demath mine \\
         --problem irrationality-of-e \\
         --model   anthropic/claude-opus-4-7 \\
         --key     sk-ant-... \\
         --wallet  0xYourEvmAddress

  4) Same flow but routing via OpenRouter (one key, any team):

       demath mine \\
         --problem collatz \\
         --model   openai/gpt-5.5 \\
         --key     sk-or-v1-... \\
         --wallet  0xYourEvmAddress \\
         --json

  5) Inspect an attempt by id after the fact (e.g. for a background run):

       demath status --attempt <attempt_id> --json

Notes:
  - Wallet → team lock-for-life: the first attempt binds your wallet to a
    team (anthropic / openai / google). Subsequent attempts with a different
    team return HTTP 409. Use a different wallet to mine a different team.
  - The CLI never writes your API key to disk. The key is held in memory
    for the duration of the attempt and only ever sent to api.demath.org.
  - --json on any command emits machine-readable output on stdout; human
    progress text goes to stderr so it can't pollute your JSON pipeline.
`;

export function runExamples(): number {
  process.stdout.write(EXAMPLES);
  return 0;
}
