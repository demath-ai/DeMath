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
         --problem riemann-hypothesis \\
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

  6) Switch team or rotate the API key — no lock, no stored state. Just run
     mine again with a different --model and/or --key:

       # switch the same wallet from Claude to GPT
       demath mine --problem riemann-hypothesis \\
         --model openai/gpt-5.5 --key sk-proj-... --wallet 0xYourEvmAddress

       # rotate to a new key (same team)
       demath mine --problem riemann-hypothesis \\
         --model openai/gpt-5.5 --key sk-proj-NEWKEY --wallet 0xYourEvmAddress

Notes:
  - Teams and keys: a wallet can mine any of the three approved teams
    (anthropic / openai / google) and switch teams anytime; the key can be
    changed or rotated anytime. Only the three approved models can mine, and
    the key must match the chosen team's provider.
  - The CLI never writes your API key to disk. The key is held in memory
    for the duration of the attempt and only ever sent to api.demath.org.
  - --json on any command emits machine-readable output on stdout; human
    progress text goes to stderr so it can't pollute your JSON pipeline.
`;

export function runExamples(): number {
  process.stdout.write(EXAMPLES);
  return 0;
}
