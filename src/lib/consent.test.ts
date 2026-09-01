import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONSENT_CHANGE_EVENT,
  getConsentStatus,
  hasTrackingConsent,
  setConsentStatus,
} from "@/lib/consent";

beforeEach(() => {
  window.localStorage.clear();
});

describe("getConsentStatus", () => {
  it("defaults to 'undecided' when nothing has been chosen yet", () => {
    expect(getConsentStatus()).toBe("undecided");
  });

  it("returns whatever was persisted", () => {
    setConsentStatus("granted");
    expect(getConsentStatus()).toBe("granted");
  });

  it("falls back to 'undecided' if localStorage holds an unrecognized value", () => {
    window.localStorage.setItem("consent_status", "yolo");
    expect(getConsentStatus()).toBe("undecided");
  });
});

describe("setConsentStatus", () => {
  it("persists the choice across reads", () => {
    setConsentStatus("denied");
    expect(getConsentStatus()).toBe("denied");
  });

  it("overwrites a previous choice", () => {
    setConsentStatus("denied");
    setConsentStatus("granted");
    expect(getConsentStatus()).toBe("granted");
  });

  it("notifies same-tab listeners via CONSENT_CHANGE_EVENT", () => {
    const listener = vi.fn();
    window.addEventListener(CONSENT_CHANGE_EVENT, listener);

    setConsentStatus("granted");

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(CONSENT_CHANGE_EVENT, listener);
  });
});

describe("hasTrackingConsent", () => {
  it("is false when undecided", () => {
    expect(hasTrackingConsent()).toBe(false);
  });

  it("is false when denied", () => {
    setConsentStatus("denied");
    expect(hasTrackingConsent()).toBe(false);
  });

  it("is true only when granted", () => {
    setConsentStatus("granted");
    expect(hasTrackingConsent()).toBe(true);
  });
});
