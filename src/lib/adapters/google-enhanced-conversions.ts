import type { ConversionEvent, ConversionEventType } from "@/lib/events";
import type { AdapterResult } from "@/lib/adapters/types";

const MOCK_CUSTOMER_ID = "123-456-7890";

/**
 * Unlike Meta's fixed catalog of standard event names, Google Ads has no
 * built-in vocabulary for "what kind of conversion is this" — every
 * conversion an advertiser wants to track (a signup, a purchase, a lead
 * form) has to be pre-created as a "Conversion Action" in the Google Ads
 * UI first, which then gets assigned an opaque numeric id scoped to that
 * ad account. Sending a conversion means naming *that* resource, not
 * describing the event, so this mapping stands in for a setup step that in
 * a real account happens in the Ads UI rather than in code.
 *
 * There's no entry for `page_view`: Google Ads conversion tracking is only
 * for actions worth reporting back as an optimization signal, not every
 * page load, so a plain page view has no conversion action to upload to —
 * unlike Meta, whose base Pixel tracks `PageView` on every page regardless
 * of whether it's a "conversion."
 */
const CONVERSION_ACTIONS: Partial<Record<ConversionEventType, string>> = {
  campaign_landing: `customers/${MOCK_CUSTOMER_ID}/conversionActions/111000111`,
  signup_started: `customers/${MOCK_CUSTOMER_ID}/conversionActions/222000222`,
  signup_completed: `customers/${MOCK_CUSTOMER_ID}/conversionActions/333000333`,
};

/** Reformats an ISO timestamp into Google's `"yyyy-MM-dd HH:mm:ss+00:00"`. */
function formatGoogleDateTime(isoTimestamp: string): string {
  const [date, time] = new Date(isoTimestamp).toISOString().split("T");
  return `${date} ${time.slice(0, 8)}+00:00`;
}

/**
 * Google's Ads API click-conversion upload shape, and why it looks the way
 * it does:
 *  - `conversions` is a list, like Meta's `data` — batched uploads, one
 *    here.
 *  - `conversionDateTime` uses Google's own
 *    `"yyyy-MM-dd HH:mm:ss+HH:mm"` format rather than ISO 8601, so it has
 *    to be reformatted from our stored timestamp rather than passed
 *    through as-is.
 *  - `gclid` (Google Click ID) is Google's primary match key, captured
 *    from the ad click itself — it's what "Enhanced" conversions
 *    *enhance*: layering hashed first-party user data (email, phone,
 *    address) on top of the gclid match for cases where the click id
 *    alone is missing or unreliable (cross-device conversions, cookie
 *    loss). Our UTM-based schema never captures a `gclid`, so it's left
 *    unset here — a real integration would read it from the landing URL's
 *    `gclid` query param, the same way `captureUtmParams` reads UTM
 *    params.
 *  - `userIdentifiers` is the hashed-PII side of "enhanced" matching (e.g.
 *    `hashedEmail`, `hashedPhoneNumber`, both SHA-256 after normalizing
 *    case/whitespace per Google's spec). Same gap as Meta's `user_data`:
 *    nothing to send, since this app collects no PII.
 *  - `orderId` is Google's dedup key across duplicate uploads, filled with
 *    our own `event_id` for the same reason Meta gets it in `event_id`.
 */
function buildGoogleConversion(event: ConversionEvent, conversionAction: string) {
  return {
    conversionAction,
    conversionDateTime: formatGoogleDateTime(event.timestamp),
    orderId: event.event_id,
    gclid: undefined,
    userIdentifiers: [
      // Real integration: { hashedEmail: sha256(normalize(email)) }, etc.
    ],
    customVariables: { ...event.utm },
  };
}

/**
 * Simulates a call to the Google Ads API's
 * `ConversionUploadService.UploadClickConversions`. Skips (rather than
 * fails) event types with no configured conversion action — that's
 * expected here, not an error, per the note on `CONVERSION_ACTIONS` above.
 * Otherwise logs the request Google would actually receive and reports
 * success; there's no real HTTP call, so nothing can fail yet.
 */
export async function sendToGoogleEnhancedConversions(
  event: ConversionEvent,
): Promise<AdapterResult> {
  const conversionAction = CONVERSION_ACTIONS[event.type];
  if (!conversionAction) {
    console.log(
      `[google-enhanced-conversions] "${event.type}" has no configured conversion action — nothing to upload.`,
    );
    return { platform: "google", success: true, event_id: event.event_id };
  }

  const payload = { conversions: [buildGoogleConversion(event, conversionAction)] };

  console.log(
    `[google-enhanced-conversions] POST https://googleads.googleapis.com/v18/customers/${MOCK_CUSTOMER_ID}:uploadClickConversions`,
    JSON.stringify(payload, null, 2),
  );

  return { platform: "google", success: true, event_id: event.event_id };
}
