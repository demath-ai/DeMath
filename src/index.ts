// Public programmatic entry point. Keeps the SDK surface tight: most users
// of this package will use the `demath` bin, but a library mode is useful
// for embedding in other Node tools.

export { DemathClient } from "./api.js";
export type { ApiClientConfig, MineRequest } from "./api.js";
export type {
  AttemptIteration,
  AttemptRecord,
  AttemptStartResponse,
  ProbeResponse,
  Problem,
  ProblemsResponse,
} from "./types.js";
export { CliError } from "./errors.js";
export {
  APPROVED_MODELS,
  CLI_VERSION,
  DEFAULT_API_URL,
  POLL_INTERVAL_MS,
  USER_AGENT,
} from "./constants.js";
export type { ApprovedModel } from "./constants.js";
export { main as runCli } from "./cli.js";
