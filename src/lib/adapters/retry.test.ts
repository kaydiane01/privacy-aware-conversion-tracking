import { describe, expect, it, vi } from "vitest";
import { withRetry } from "@/lib/adapters/retry";
import type { AdapterResult } from "@/lib/adapters/types";

const FAST_RETRY = { maxAttempts: 3, delayMs: 0 };

function ok(): AdapterResult {
  return { platform: "meta", success: true, event_id: "evt_1" };
}

function fail(error = "simulated failure"): AdapterResult {
  return { platform: "meta", success: false, event_id: "evt_1", error };
}

describe("withRetry", () => {
  it("returns immediately on a first-attempt success without retrying", async () => {
    const attempt = vi.fn().mockResolvedValue(ok());

    const result = await withRetry("meta", "evt_1", attempt, FAST_RETRY);

    expect(result.success).toBe(true);
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it("retries after a failure and stops once an attempt succeeds", async () => {
    const attempt = vi
      .fn()
      .mockResolvedValueOnce(fail("504 Gateway Timeout"))
      .mockResolvedValueOnce(ok());

    const result = await withRetry("meta", "evt_1", attempt, FAST_RETRY);

    expect(result.success).toBe(true);
    expect(attempt).toHaveBeenCalledTimes(2);
  });

  it("gives up and returns the last failure after exhausting maxAttempts", async () => {
    const attempt = vi.fn().mockResolvedValue(fail("503 Service Unavailable"));

    const result = await withRetry("meta", "evt_1", attempt, FAST_RETRY);

    expect(result.success).toBe(false);
    expect(result.error).toBe("503 Service Unavailable");
    expect(attempt).toHaveBeenCalledTimes(FAST_RETRY.maxAttempts);
  });

  it("treats a thrown error the same as a returned failure", async () => {
    const attempt = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(ok());

    const result = await withRetry("meta", "evt_1", attempt, FAST_RETRY);

    expect(result.success).toBe(true);
    expect(attempt).toHaveBeenCalledTimes(2);
  });
});
