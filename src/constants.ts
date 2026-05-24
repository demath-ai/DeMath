// Shared CLI constants. Single source of truth.

export const CLI_VERSION = "0.1.0";

// Honest UA string — backend's Cloudflare bot management whitelists this prefix.
// Match the Python CLI convention (demath-cli/<v>) but suffix with `-npm` so
// server-side logs can tell the two clients apart.
export const USER_AGENT = `demath-cli-npm/${CLI_VERSION} (+https://github.com/demath-ai/proj-dmv0/tree/main/tools/demath-cli-npm)`;

export const DEFAULT_API_URL =
  process.env.DEMATH_API_URL?.trim() || "https://api.demath.org";

// Approved DeMath model slugs. The backend has the canonical list; this is a
// hint for --help and validation. Backend will still reject anything not in
// its PRICING table regardless of what's here.
export const APPROVED_MODELS = [
  "anthropic/claude-opus-4-7",
  "openai/gpt-5.5",
  "google/gemini-3-deep-think",
] as const;

export type ApprovedModel = (typeof APPROVED_MODELS)[number];

// Poll cadence for streaming mine output. Backend writes an attempt record
// after each iteration; finer than ~1s is wasted requests. 3s matches the
// brief and is friendlier on the public API.
export const POLL_INTERVAL_MS = 3_000;

// Terminal statuses — once we see one of these, stop polling.
// Must include EVERY status the backend writes as a final state,
// otherwise the mine command's poll loop never breaks. The progress-
// tier statuses (substantial / partial / no_progress) are terminal
// when the agent hits a max_iterations / max_usd cap.
export const TERMINAL_STATUSES = new Set([
  "proof_complete",
  "counterexample",
  "breakthrough",
  "substantial_progress",
  "partial_progress",
  "no_progress",
  "stopped",
  "error",
]);

// Strict success: the attempt closed out the problem (or hit the
// terminal-for-graded-problems BREAKTHROUGH tag). Used as the exit
// code signal for `demath status --json`.
export const SUCCESS_STATUSES = new Set([
  "proof_complete",
  "counterexample",
  "breakthrough",
]);
