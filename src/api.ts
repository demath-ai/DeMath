import { request } from "./http.js";
import type {
  AttemptRecord,
  AttemptStartResponse,
  ProbeResponse,
  ProblemsResponse,
} from "./types.js";

export interface ApiClientConfig {
  apiUrl: string;
  signal?: AbortSignal;
}

export interface MineRequest {
  problemId: string;
  model: string;
  apiKey: string;
  walletAddress: string;
  maxIterations?: number;
  maxUsd?: number;
}

// Thin wrapper around the public DeMath HTTP API. One method per endpoint
// the CLI uses; nothing more.
export class DemathClient {
  constructor(private readonly cfg: ApiClientConfig) {}

  listProblems(): Promise<ProblemsResponse> {
    return request<ProblemsResponse>({
      method: "GET",
      url: `${this.cfg.apiUrl}/problems`,
      signal: this.cfg.signal,
    });
  }

  probe(model: string, apiKey: string): Promise<ProbeResponse> {
    return request<ProbeResponse>({
      method: "POST",
      url: `${this.cfg.apiUrl}/providers/probe`,
      body: { model, api_key: apiKey },
      signal: this.cfg.signal,
    });
  }

  startAttempt(r: MineRequest): Promise<AttemptStartResponse> {
    const body: Record<string, unknown> = {
      problem_id: r.problemId,
      model: r.model,
      api_key: r.apiKey,
      miner_address: r.walletAddress,
    };
    if (r.maxIterations !== undefined) body.max_iterations = r.maxIterations;
    if (r.maxUsd !== undefined) body.max_usd = r.maxUsd;
    return request<AttemptStartResponse>({
      method: "POST",
      url: `${this.cfg.apiUrl}/attempts`,
      body,
      signal: this.cfg.signal,
    });
  }

  getAttempt(attemptId: string): Promise<AttemptRecord> {
    return request<AttemptRecord>({
      method: "GET",
      url: `${this.cfg.apiUrl}/attempts/${encodeURIComponent(attemptId)}`,
      signal: this.cfg.signal,
    });
  }

  stopAttempt(attemptId: string): Promise<unknown> {
    return request({
      method: "POST",
      url: `${this.cfg.apiUrl}/attempts/${encodeURIComponent(attemptId)}/stop`,
      body: {},
      // Stops shouldn't get cancelled by the same Ctrl-C that initiated them.
      signal: undefined,
    });
  }
}
