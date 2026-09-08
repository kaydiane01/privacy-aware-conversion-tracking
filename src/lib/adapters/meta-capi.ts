import type { ConversionEvent, ConversionEventType } from "@/lib/events";
import type { AdapterResult } from "@/lib/adapters/types";

/**
 * Stand-ins for the config a real integration would pull from env/ad-account
 * settings: which Pixel to attribute events to, and the token that
 * authorizes a server (rather than browser) to send events against it.
 */
const MOCK_PIXEL_ID = "000000000000000";
const MOCK_ACCESS_TOKEN = "mock-system-user-token";
const META_API_VERSION = "v21.0";

/**
 * Meta's Conversions API only accepts event names from a fixed catalog of
 * "standard events" (or an arbitrary custom name, which loses the
 * ad-optimization and reporting features that key off the standard ones).
 * Our own event taxonomy doesn't line up 1:1 with Meta's, so this is the
 * mapping layer that reconciles the two:
 *  - `campaign_landing` is still just a page view from Meta's point of
 *    view — the UTM attribution that makes it distinct in our own schema
 *    lives in `custom_data`, not the event name.
 *  - `signup_started` maps to Meta's closest lead-gen analog rather than a
 *    literal "started" event, since Meta has no such standard event.
 *  - `signup_completed` maps to the standard event Meta's ad platform
 *    actually optimizes signup campaigns against.
 */
const META_EVENT_NAMES: Record<ConversionEventType, string> = {
  page_view: "PageView",
  campaign_landing: "PageView",
  signup_started: "Lead",
  signup_completed: "CompleteRegistration",
};

/**
 * Meta's real request shape, and why it looks the way it does:
 *  - `data` is an array so multiple events can be batched into one call;
 *    we always send a batch of one.
 *  - `event_time` is Unix seconds, not an ISO string — unlike
 *    `ConversionEvent.timestamp`, which is ISO for readability/sortability
 *    in our own storage.
 *  - `action_source: "website"` tells Meta how the event happened (website
 *    vs. app vs. a phone call logged by a CRM, etc.), since a single Pixel
 *    can receive events from more than one source.
 *  - `event_id` is what lets Meta deduplicate this server-side (CAPI) send
 *    against a matching browser-side (Pixel) send of the *same* logical
 *    event — exactly the role `ConversionEvent.event_id` already plays in
 *    this codebase (see `UtmCapture`'s console log vs. its `/api/track`
 *    POST), so it passes straight through unchanged.
 *  - `user_data` is where Meta expects SHA-256-hashed PII (email, phone)
 *    and click identifiers (`fbc`/`fbp` cookies) for matching a conversion
 *    back to the person who saw the ad. `ConversionEvent` deliberately
 *    never collects PII, so this is left empty here — a real integration
 *    would populate it (after hashing, never sent in the clear) if the app
 *    collected an email at signup.
 *  - Anything without a dedicated field goes in `custom_data`; that's
 *    where the UTM params end up.
 */
function buildMetaPayload(event: ConversionEvent) {
  return {
    data: [
      {
        event_name: META_EVENT_NAMES[event.type],
        event_time: Math.floor(new Date(event.timestamp).getTime() / 1000),
        event_id: event.event_id,
        action_source: "website",
        user_data: {
          // Real integration: hashed em/ph/external_id, fbc/fbp click ids.
        },
        custom_data: {
          ...event.utm,
          ...("path" in event ? { path: event.path } : {}),
          ...("user_id" in event ? { user_id: event.user_id } : {}),
        },
      },
    ],
  };
}

/**
 * Simulates `POST /{pixel_id}/events`. Logs the request Meta would
 * actually receive and reports success — there's no real HTTP call here,
 * so nothing can fail yet, but the result shape mirrors what a real call
 * site (retry logic, delivery alerting) would need either way.
 */
export async function sendToMetaCapi(
  event: ConversionEvent,
): Promise<AdapterResult> {
  const payload = buildMetaPayload(event);

  console.log(
    `[meta-capi] POST https://graph.facebook.com/${META_API_VERSION}/${MOCK_PIXEL_ID}/events?access_token=${MOCK_ACCESS_TOKEN}`,
    JSON.stringify(payload, null, 2),
  );

  return { platform: "meta", success: true, event_id: event.event_id };
}
