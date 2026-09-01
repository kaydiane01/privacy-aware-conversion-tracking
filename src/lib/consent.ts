import { useSyncExternalStore } from "react";

/**
 * A visitor's tracking consent choice. "undecided" is the default until they
 * respond to a consent prompt — it is NOT treated as permission to track.
 */
export type ConsentStatus = "granted" | "denied" | "undecided";

const STORAGE_KEY = "consent_status";

/**
 * Fired on `window` whenever `setConsentStatus` runs. `localStorage`'s own
 * "storage" event only fires in *other* tabs/windows, never the one that
 * made the change, so same-tab listeners (like `useConsentStatus`) need
 * this instead.
 */
export const CONSENT_CHANGE_EVENT = "consent-status-change";

const VALID_STATUSES: readonly ConsentStatus[] = [
  "granted",
  "denied",
  "undecided",
];

function isConsentStatus(value: string | null): value is ConsentStatus {
  return VALID_STATUSES.includes(value as ConsentStatus);
}

/** The visitor's current consent choice. Defaults to "undecided" if unset, unrecognized, or outside the browser (e.g. SSR). */
export function getConsentStatus(): ConsentStatus {
  if (typeof window === "undefined") return "undecided";
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return isConsentStatus(raw) ? raw : "undecided";
}

/** Persists the visitor's consent choice and notifies any listeners in this tab. */
export function setConsentStatus(status: ConsentStatus): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, status);
  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
}

/** Call this before firing any tracking event. Only "granted" allows tracking. */
export function hasTrackingConsent(): boolean {
  return getConsentStatus() === "granted";
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CONSENT_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CONSENT_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getServerSnapshot(): ConsentStatus {
  return "undecided";
}

/**
 * Reactive consent status for Client Components — re-renders when the
 * status changes, including from another tab. Mirrors `useState`'s
 * `[value, setValue]` shape.
 */
export function useConsentStatus(): [
  ConsentStatus,
  (status: ConsentStatus) => void,
] {
  const status = useSyncExternalStore(
    subscribe,
    getConsentStatus,
    getServerSnapshot,
  );
  return [status, setConsentStatus];
}
