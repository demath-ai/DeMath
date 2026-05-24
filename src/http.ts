import { USER_AGENT } from "./constants.js";
import { CliError } from "./errors.js";

export type JsonBody = Record<string, unknown> | undefined;

interface RequestOptions {
  method: "GET" | "POST";
  url: string;
  body?: JsonBody;
  timeoutMs?: number;
  signal?: AbortSignal;
}

// Make a JSON request via the runtime's global fetch (Node >= 18).
// Throws CliError with the backend's `detail` on non-2xx, or a network-style
// message if the request never lands.
export async function request<T = unknown>(opts: RequestOptions): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? 30_000;

  // Compose an AbortSignal that fires on either our timeout or the caller's
  // signal (Ctrl-C). We don't use AbortSignal.any() because Node 18 lacks it.
  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(new Error("request timed out")), timeoutMs);
  const onParentAbort = () => ctrl.abort(opts.signal!.reason);
  if (opts.signal) {
    if (opts.signal.aborted) ctrl.abort(opts.signal.reason);
    else opts.signal.addEventListener("abort", onParentAbort, { once: true });
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": USER_AGENT,
  };
  let bodyInit: string | undefined;
  if (opts.body !== undefined) {
    bodyInit = JSON.stringify(opts.body);
    headers["Content-Type"] = "application/json";
  }

  let resp: Response;
  try {
    resp = await fetch(opts.url, {
      method: opts.method,
      headers,
      body: bodyInit,
      signal: ctrl.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (opts.signal) opts.signal.removeEventListener("abort", onParentAbort);
    const msg = err instanceof Error ? err.message : String(err);
    throw new CliError(`network error reaching ${opts.url}: ${msg}`, 3);
  } finally {
    clearTimeout(timeoutId);
    if (opts.signal) opts.signal.removeEventListener("abort", onParentAbort);
  }

  const rawText = await resp.text();

  if (!resp.ok) {
    let detail: string = `HTTP ${resp.status}`;
    if (rawText) {
      try {
        const parsed = JSON.parse(rawText) as Record<string, unknown>;
        const d = parsed.detail ?? parsed.error;
        if (typeof d === "string") detail = d;
        else if (d !== undefined) detail = JSON.stringify(d);
      } catch {
        detail = rawText.slice(0, 400);
      }
    }
    throw new CliError(`backend error: ${detail}`, 2);
  }

  if (!rawText) return {} as T;
  try {
    return JSON.parse(rawText) as T;
  } catch {
    throw new CliError(`backend returned non-JSON body: ${rawText.slice(0, 200)}`, 2);
  }
}
