import { beforeEach, describe, expect, it } from "vitest";
import { createConversionEvent } from "@/lib/events";
import { persistUtmParams } from "@/lib/utm";

beforeEach(() => {
  window.localStorage.clear();
});

describe("createConversionEvent", () => {
  it("fills in event_id, timestamp, and the type-specific payload", () => {
    const event = createConversionEvent(
      "page_view",
      { path: "/pricing" },
      {},
    );

    expect(event.type).toBe("page_view");
    expect(event.path).toBe("/pricing");
    expect(event.event_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(new Date(event.timestamp).toISOString()).toBe(event.timestamp);
  });

  it("generates a distinct event_id per call", () => {
    const first = createConversionEvent("signup_started", {}, {});
    const second = createConversionEvent("signup_started", {}, {});

    expect(first.event_id).not.toBe(second.event_id);
  });

  it("defaults utm to whatever is currently persisted", () => {
    persistUtmParams({ utm_source: "newsletter", utm_medium: "email" });

    const event = createConversionEvent("campaign_landing", {
      path: "/landing",
    });

    expect(event.utm).toEqual({
      utm_source: "newsletter",
      utm_medium: "email",
    });
  });

  it("uses the explicitly passed utm instead of the persisted one", () => {
    persistUtmParams({ utm_source: "newsletter" });

    const event = createConversionEvent(
      "signup_completed",
      { user_id: "user_123" },
      { utm_source: "google" },
    );

    expect(event.utm).toEqual({ utm_source: "google" });
    expect(event.user_id).toBe("user_123");
  });
});
