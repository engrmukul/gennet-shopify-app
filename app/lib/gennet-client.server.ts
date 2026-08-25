// Gennet SMS API client.
//
// Single-send only for v1.0.0: POST {baseUrl}/api/v3/sms-send
// Auth header: X-API-TOKEN
//
// IMPORTANT: Gennet may return HTTP 200 with a JSON body indicating
// business failure (status: "FAILED"). HTTP 200 is NOT sufficient to
// conclude success — the body must be inspected.
//
// No automatic retries are ever performed here. A timeout, network error,
// or unknown response is recorded as a failure and left for explicit,
// merchant-initiated retry, because the Gennet server may already have
// accepted and be processing the message.

export type GennetErrorCategory =
  | "TRANSPORT"
  | "AUTHENTICATION"
  | "VALIDATION"
  | "RATE_LIMIT"
  | "API";

export class GennetError extends Error {
  category: GennetErrorCategory;
  statusCode?: number;
  apiStatusCode?: number;
  apiMeaning?: string;

  constructor(
    category: GennetErrorCategory,
    message: string,
    opts: { statusCode?: number; apiStatusCode?: number; apiMeaning?: string } = {},
  ) {
    super(message);
    this.name = "GennetError";
    this.category = category;
    this.statusCode = opts.statusCode;
    this.apiStatusCode = opts.apiStatusCode;
    this.apiMeaning = opts.apiMeaning;
  }
}

export class TransportError extends GennetError {
  constructor(message: string) {
    super("TRANSPORT", message);
    this.name = "TransportError";
  }
}

export class AuthenticationError extends GennetError {
  constructor(message: string, statusCode?: number) {
    super("AUTHENTICATION", message, { statusCode });
    this.name = "AuthenticationError";
  }
}

export class ValidationError extends GennetError {
  constructor(message: string, statusCode?: number) {
    super("VALIDATION", message, { statusCode });
    this.name = "ValidationError";
  }
}

export class RateLimitError extends GennetError {
  constructor(message: string, statusCode?: number) {
    super("RATE_LIMIT", message, { statusCode });
    this.name = "RateLimitError";
  }
}

export class ApiError extends GennetError {
  constructor(
    message: string,
    opts: { statusCode?: number; apiStatusCode?: number; apiMeaning?: string } = {},
  ) {
    super("API", message, opts);
    this.name = "ApiError";
  }
}

export interface GennetSendPayload {
  sid: string;
  msisdn: string;
  sms: string;
  csms_id: string;
}

export interface GennetSendResult {
  ok: true;
  raw: unknown;
}

export interface GennetClientOptions {
  apiBaseUrl: string;
  apiToken: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

const SMS_SEND_PATH = "/api/v3/sms-send";
const DEFAULT_TIMEOUT_MS = 10000;

interface GennetResponseBody {
  status?: string;
  status_code?: number;
  status_meaning?: string;
  description?: string;
  [key: string]: unknown;
}

export class GennetClient {
  private readonly apiBaseUrl: string;
  private readonly apiToken: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: GennetClientOptions) {
    this.apiBaseUrl = options.apiBaseUrl.replace(/\/+$/, "");
    this.apiToken = options.apiToken;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async send(payload: GennetSendPayload): Promise<GennetSendResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.apiBaseUrl}${SMS_SEND_PATH}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-API-TOKEN": this.apiToken,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new TransportError(
          `Gennet request timed out after ${this.timeoutMs}ms`,
        );
      }
      throw new TransportError(
        `Gennet request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 401 || response.status === 403) {
      throw new AuthenticationError(
        "Gennet rejected the API token.",
        response.status,
      );
    }

    if (response.status === 429) {
      throw new RateLimitError("Gennet rate limit exceeded.", response.status);
    }

    if (response.status >= 500) {
      throw new TransportError(
        `Gennet server error (HTTP ${response.status}).`,
      );
    }

    let body: GennetResponseBody;
    try {
      body = (await response.json()) as GennetResponseBody;
    } catch {
      throw new TransportError("Gennet returned a non-JSON response body.");
    }

    if (response.status >= 400) {
      throw new ValidationError(
        body.description ?? `Gennet rejected the request (HTTP ${response.status}).`,
        response.status,
      );
    }

    // HTTP 200 does not guarantee success — inspect the business status.
    if (body.status === "FAILED") {
      const apiStatusCode = body.status_code;
      if (apiStatusCode === 4029 || apiStatusCode === 429) {
        throw new RateLimitError(
          body.description ?? body.status_meaning ?? "Gennet rate limited this request.",
        );
      }
      throw new ApiError(
        body.description ?? body.status_meaning ?? "Gennet reported failure.",
        {
          statusCode: response.status,
          apiStatusCode,
          apiMeaning: body.status_meaning,
        },
      );
    }

    return { ok: true, raw: body };
  }
}
