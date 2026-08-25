import { describe, expect, it, vi } from "vitest";
import {
  ApiError,
  AuthenticationError,
  GennetClient,
  RateLimitError,
  TransportError,
} from "~/lib/gennet-client.server";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("GennetClient.send", () => {
  it("sends the documented payload shape and X-API-TOKEN header", async () => {
    const fetchImpl = vi.fn(async (url: string | URL, init?: RequestInit) => {
      expect(String(url)).toBe("https://isms.gennet.com.bd/api/v3/sms-send");
      expect(init?.method).toBe("POST");
      const headers = init?.headers as Record<string, string>;
      expect(headers["X-API-TOKEN"]).toBe("secret-token");
      expect(JSON.parse(String(init?.body))).toEqual({
        sid: "GENNET",
        msisdn: "8801712345678",
        sms: "Hello",
        csms_id: "ABC123",
      });
      return jsonResponse(200, { status: "SUCCESS" });
    });

    const client = new GennetClient({
      apiBaseUrl: "https://isms.gennet.com.bd",
      apiToken: "secret-token",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const result = await client.send({
      sid: "GENNET",
      msisdn: "8801712345678",
      sms: "Hello",
      csms_id: "ABC123",
    });

    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("treats HTTP 200 with status FAILED in the body as a failure", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, {
        status: "FAILED",
        status_code: 4001,
        status_meaning: "Invalid sender ID",
        description: "Sender ID not registered",
      }),
    );

    const client = new GennetClient({
      apiBaseUrl: "https://isms.gennet.com.bd",
      apiToken: "token",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(
      client.send({ sid: "X", msisdn: "8801712345678", sms: "hi", csms_id: "A" }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("maps HTTP 401/403 to AuthenticationError", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 401 }));
    const client = new GennetClient({
      apiBaseUrl: "https://isms.gennet.com.bd",
      apiToken: "bad-token",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(
      client.send({ sid: "X", msisdn: "8801712345678", sms: "hi", csms_id: "A" }),
    ).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("maps HTTP 429 to RateLimitError", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 429 }));
    const client = new GennetClient({
      apiBaseUrl: "https://isms.gennet.com.bd",
      apiToken: "token",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(
      client.send({ sid: "X", msisdn: "8801712345678", sms: "hi", csms_id: "A" }),
    ).rejects.toBeInstanceOf(RateLimitError);
  });

  it("maps a FAILED body with a rate-limit status_code to RateLimitError", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, { status: "FAILED", status_code: 4029, status_meaning: "Rate limited" }),
    );
    const client = new GennetClient({
      apiBaseUrl: "https://isms.gennet.com.bd",
      apiToken: "token",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(
      client.send({ sid: "X", msisdn: "8801712345678", sms: "hi", csms_id: "A" }),
    ).rejects.toBeInstanceOf(RateLimitError);
  });

  it("classifies a network failure as TransportError and never retries", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("ECONNRESET");
    });
    const client = new GennetClient({
      apiBaseUrl: "https://isms.gennet.com.bd",
      apiToken: "token",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(
      client.send({ sid: "X", msisdn: "8801712345678", sms: "hi", csms_id: "A" }),
    ).rejects.toBeInstanceOf(TransportError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("classifies a non-JSON 200 response as TransportError", async () => {
    const fetchImpl = vi.fn(
      async () => new Response("<html>not json</html>", { status: 200 }),
    );
    const client = new GennetClient({
      apiBaseUrl: "https://isms.gennet.com.bd",
      apiToken: "token",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(
      client.send({ sid: "X", msisdn: "8801712345678", sms: "hi", csms_id: "A" }),
    ).rejects.toBeInstanceOf(TransportError);
  });
});
