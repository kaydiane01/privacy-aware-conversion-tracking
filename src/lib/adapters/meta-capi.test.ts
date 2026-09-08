import { describe, expect, it, vi } from "vitest";
import { sendToMetaCapi } from "@/lib/adapters/meta-capi";
import { createConversionEvent } from "@/lib/events";

describe("sendToMetaCapi", () => {
  it("retries a simulated failure and reports the eventual success", async () => {
    const simulateOutcome = vi
      .fn()
      .mockReturnValueOnce({ success: false, error: "429 Too Many Requests" })
      .mockReturnValueOnce({ success: true });
    const event = createConversionEvent(
      "signup_completed",
      { user_id: "user_1" },
      {},
    );

    const result = await sendToMetaCapi(event, {
      simulateOutcome,
      retryConfig: { maxAttempts: 3, delayMs: 0 },
    });

    expect(result).toEqual({
      platform: "meta",
      success: true,
      event_id: event.event_id,
    });
    expect(simulateOutcome).toHaveBeenCalledTimes(2);
  });

  it("reports failure after exhausting retries", async () => {
    const simulateOutcome = vi
      .fn()
      .mockReturnValue({ success: false, error: "503 Service Unavailable" });
    const event = createConversionEvent("page_view", { path: "/" }, {});

    const result = await sendToMetaCapi(event, {
      simulateOutcome,
      retryConfig: { maxAttempts: 2, delayMs: 0 },
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("503 Service Unavailable");
    expect(simulateOutcome).toHaveBeenCalledTimes(2);
  });
});
