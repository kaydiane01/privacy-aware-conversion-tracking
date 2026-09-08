import { describe, expect, it, vi } from "vitest";
import { sendToGoogleEnhancedConversions } from "@/lib/adapters/google-enhanced-conversions";
import { createConversionEvent } from "@/lib/events";

describe("sendToGoogleEnhancedConversions", () => {
  it("skips page_view without simulating a send or retrying", async () => {
    const simulateOutcome = vi.fn();
    const event = createConversionEvent("page_view", { path: "/" }, {});

    const result = await sendToGoogleEnhancedConversions(event, {
      simulateOutcome,
    });

    expect(result).toEqual({
      platform: "google",
      success: true,
      event_id: event.event_id,
    });
    expect(simulateOutcome).not.toHaveBeenCalled();
  });

  it("retries a simulated failure for a mapped conversion action", async () => {
    const simulateOutcome = vi
      .fn()
      .mockReturnValueOnce({ success: false, error: "ECONNRESET" })
      .mockReturnValueOnce({ success: true });
    const event = createConversionEvent("signup_started", {}, {});

    const result = await sendToGoogleEnhancedConversions(event, {
      simulateOutcome,
      retryConfig: { maxAttempts: 3, delayMs: 0 },
    });

    expect(result.success).toBe(true);
    expect(simulateOutcome).toHaveBeenCalledTimes(2);
  });

  it("reports failure after exhausting retries for a mapped conversion action", async () => {
    const simulateOutcome = vi
      .fn()
      .mockReturnValue({ success: false, error: "504 Gateway Timeout" });
    const event = createConversionEvent(
      "signup_completed",
      { user_id: "user_1" },
      {},
    );

    const result = await sendToGoogleEnhancedConversions(event, {
      simulateOutcome,
      retryConfig: { maxAttempts: 2, delayMs: 0 },
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("504 Gateway Timeout");
    expect(simulateOutcome).toHaveBeenCalledTimes(2);
  });
});
