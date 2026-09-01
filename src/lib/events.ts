/**
 * Typed schema for conversion events, from an anonymous page view through a
 * completed signup. This module only shapes and constructs events — it does
 * not send them anywhere. Wherever events get sent, gate that call on
 * `hasTrackingConsent()` from `@/lib/consent`, the same way `UtmCapture`
 * gates capture.
 */

import { getPersistedUtmParams, type UtmParams } from "@/lib/utm";

export const CONVERSION_EVENT_TYPES = [
  "page_view",
  "campaign_landing",
  "signup_started",
  "signup_completed",
] as const;

export type ConversionEventType = (typeof CONVERSION_EVENT_TYPES)[number];

/**
 * Fields every event type needs on top of the shared base:
 *  - `page_view` / `campaign_landing` record which page was viewed.
 *    `campaign_landing` is its own type (rather than a flag on `page_view`)
 *    because "the page a UTM link pointed at" is a distinct, commonly
 *    reported funnel step — keeping it a separate type lets you count it
 *    without filtering `page_view`s by UTM presence.
 *  - `signup_started` needs nothing beyond the base fields; it just marks
 *    that the funnel step happened.
 *  - `signup_completed` records the resulting `user_id` so this anonymous,
 *    UTM-attributed event can later be joined to the account it created.
 */
type ConversionEventPayload = {
  page_view: { path: string };
  campaign_landing: { path: string };
  signup_started: Record<string, never>;
  signup_completed: { user_id: string };
};

/**
 * Fields shared by every event, regardless of type:
 *  - `event_id` is a client-generated UUID. Network retries or double-firing
 *    an effect can send the same logical event twice; a stable per-event id
 *    lets a downstream sink deduplicate ("have I already stored this
 *    event_id?") instead of guessing from timestamp + type.
 *  - `timestamp` is an ISO 8601 string in UTC (`Date.toISOString()`), so
 *    events sort and compare correctly regardless of the visitor's time
 *    zone or clock format.
 *  - `utm` is whatever campaign params are currently attributed to this
 *    visitor (see `@/lib/utm`), captured at event-creation time so each
 *    event carries its own attribution instead of relying on a join later.
 */
interface ConversionEventBase<Type extends ConversionEventType> {
  event_id: string;
  type: Type;
  timestamp: string;
  utm: UtmParams;
}

/**
 * A discriminated union, keyed on `type`: given a `ConversionEvent`,
 * narrowing on `event.type === "signup_completed"` tells TypeScript the
 * `user_id` field exists, with no casting. Built as a mapped type over
 * `ConversionEventPayload` so adding a new event type only means adding one
 * entry to that map and this union (and the payload) update automatically.
 */
export type ConversionEvent<
  Type extends ConversionEventType = ConversionEventType,
> = {
  [T in Type]: ConversionEventBase<T> & ConversionEventPayload[T];
}[Type];

export type PageViewEvent = ConversionEvent<"page_view">;
export type CampaignLandingEvent = ConversionEvent<"campaign_landing">;
export type SignupStartedEvent = ConversionEvent<"signup_started">;
export type SignupCompletedEvent = ConversionEvent<"signup_completed">;

/**
 * Builds a conversion event, filling in the shared `event_id`, `timestamp`,
 * and `utm` fields and merging in the type-specific payload. `utm` defaults
 * to whatever is currently persisted (see `@/lib/utm`) but can be overridden
 * — useful in tests, or any caller that already has the params on hand and
 * wants to avoid a redundant `localStorage` read.
 */
export function createConversionEvent<T extends ConversionEventType>(
  type: T,
  payload: ConversionEventPayload[T],
  utm: UtmParams = getPersistedUtmParams(),
): ConversionEvent<T> {
  return {
    event_id: crypto.randomUUID(),
    type,
    timestamp: new Date().toISOString(),
    utm,
    ...payload,
  } as ConversionEvent<T>;
}
