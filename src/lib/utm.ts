/**
 * Capture and persist UTM campaign parameters from a landing page URL so they
 * survive later page views, where the query string is usually gone.
 */

export const UTM_PARAM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

export type UtmParamKey = (typeof UTM_PARAM_KEYS)[number];

export type UtmParams = Partial<Record<UtmParamKey, string>>;

const STORAGE_KEY = "utm_params";

/** Reads the UTM keys out of a query string, ignoring any params that aren't set. */
export function extractUtmParams(search: string | URLSearchParams): UtmParams {
  const params =
    typeof search === "string" ? new URLSearchParams(search) : search;

  const result: UtmParams = {};
  for (const key of UTM_PARAM_KEYS) {
    const value = params.get(key);
    if (value) {
      result[key] = value;
    }
  }
  return result;
}

/** Overwrites the persisted UTM params. No-ops outside the browser (e.g. during SSR). */
export function persistUtmParams(params: UtmParams): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
}

/** Reads back whatever UTM params were last persisted, or `{}` if none/unavailable. */
export function getPersistedUtmParams(): UtmParams {
  if (typeof window === "undefined") return {};

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};

  try {
    return JSON.parse(raw) as UtmParams;
  } catch {
    return {};
  }
}

/**
 * Extracts UTM params from `search` and persists them if any are present
 * (last-touch: a fresh campaign visit overwrites the previous one). If the
 * current URL has no UTM params, falls back to whatever was already persisted
 * from an earlier visit in this browser.
 */
export function captureUtmParams(
  search: string | URLSearchParams = typeof window !== "undefined"
    ? window.location.search
    : "",
): UtmParams {
  const params = extractUtmParams(search);
  if (Object.keys(params).length > 0) {
    persistUtmParams(params);
    return params;
  }
  return getPersistedUtmParams();
}
