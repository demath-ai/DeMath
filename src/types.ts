// Backend response shapes. The CLI doesn't need to be exhaustive — these are
// the fields we read. Extra fields are tolerated.

export interface Problem {
  id: string;
  name: string;
  statement?: string;
  classification?: string;
  expected_difficulty?: string;
  solved?: boolean;
  [k: string]: unknown;
}

export interface ProblemsResponse {
  problems: Problem[];
}

export interface ProbeResponse {
  ok?: boolean;
  provider?: string;
  detail?: string;
  error?: string;
  /** Machine-readable failure reason (e.g. "unsupported_prefix", "auth_failed"). */
  reason?: string;
  /** Upstream HTTP status from the provider (401, 403, 429, …). */
  provider_status?: number;
  /** Upstream provider's error message body. */
  provider_message?: string;
  [k: string]: unknown;
}

export interface AttemptStartResponse {
  attempt_id: string;
  [k: string]: unknown;
}

export interface AttemptIteration {
  iteration?: number;
  status?: string;
  input_tokens?: number;
  output_tokens?: number;
  usd_cost?: number;
  summary?: string;
  body?: string;
  [k: string]: unknown;
}

export interface AttemptRecord {
  attempt_id?: string;
  status?: string;
  iterations?: AttemptIteration[];
  total_cost?: number;
  total_input_tokens?: number;
  total_output_tokens?: number;
  ipfs_cid?: string;
  error?: string;
  [k: string]: unknown;
}
