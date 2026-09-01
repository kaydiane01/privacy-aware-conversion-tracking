import { beforeEach, describe, expect, it } from "vitest";
import {
  captureUtmParams,
  extractUtmParams,
  getPersistedUtmParams,
  persistUtmParams,
} from "@/lib/utm";

beforeEach(() => {
  window.localStorage.clear();
});

describe("extractUtmParams", () => {
  it("reads all five UTM params from a query string", () => {
    const search =
      "?utm_source=newsletter&utm_medium=email&utm_campaign=fall_sale&utm_content=cta_button&utm_term=running+shoes";

    expect(extractUtmParams(search)).toEqual({
      utm_source: "newsletter",
      utm_medium: "email",
      utm_campaign: "fall_sale",
      utm_content: "cta_button",
      utm_term: "running shoes",
    });
  });

  it("omits keys that aren't present and ignores unrelated params", () => {
    const search = "?utm_source=google&ref=homepage";

    expect(extractUtmParams(search)).toEqual({ utm_source: "google" });
  });

  it("returns an empty object when there are no UTM params", () => {
    expect(extractUtmParams("?ref=homepage")).toEqual({});
  });
});

describe("persistUtmParams / getPersistedUtmParams", () => {
  it("round-trips params through localStorage", () => {
    persistUtmParams({ utm_source: "twitter", utm_medium: "social" });

    expect(getPersistedUtmParams()).toEqual({
      utm_source: "twitter",
      utm_medium: "social",
    });
  });

  it("returns an empty object when nothing has been persisted", () => {
    expect(getPersistedUtmParams()).toEqual({});
  });

  it("returns an empty object if the stored value is corrupt JSON", () => {
    window.localStorage.setItem("utm_params", "not json");

    expect(getPersistedUtmParams()).toEqual({});
  });
});

describe("captureUtmParams", () => {
  it("persists and returns UTM params found in the given search string", () => {
    const result = captureUtmParams("?utm_source=google&utm_medium=cpc");

    expect(result).toEqual({ utm_source: "google", utm_medium: "cpc" });
    expect(getPersistedUtmParams()).toEqual(result);
  });

  it("falls back to previously persisted params when the URL has none", () => {
    persistUtmParams({ utm_source: "google", utm_medium: "cpc" });

    expect(captureUtmParams("?ref=homepage")).toEqual({
      utm_source: "google",
      utm_medium: "cpc",
    });
  });

  it("overwrites previously persisted params with a new campaign (last-touch)", () => {
    persistUtmParams({ utm_source: "google", utm_medium: "cpc" });

    const result = captureUtmParams("?utm_source=newsletter&utm_medium=email");

    expect(result).toEqual({ utm_source: "newsletter", utm_medium: "email" });
    expect(getPersistedUtmParams()).toEqual(result);
  });
});
