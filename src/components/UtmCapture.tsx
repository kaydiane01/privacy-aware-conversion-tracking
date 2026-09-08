"use client";

import { useEffect } from "react";
import { captureUtmParams } from "@/lib/utm";
import { useConsentStatus } from "@/lib/consent";
import { createConversionEvent } from "@/lib/events";

/**
 * Runs `captureUtmParams` once consent is "granted". Renders nothing — this
 * is the production wiring, kept separate from any debug UI so tracking
 * keeps working even if a debug component is removed later.
 *
 * A non-empty result means this page view is attributed to a campaign
 * (whether freshly captured from the URL or carried over from an earlier
 * visit), so it also builds a `campaign_landing` event. Sending isn't wired
 * up yet, so it's only logged for now.
 */
export function UtmCapture() {
  const [consent] = useConsentStatus();

  useEffect(() => {
    if (consent === "granted") {
      const utm = captureUtmParams();
      if (Object.keys(utm).length > 0) {
        const event = createConversionEvent(
          "campaign_landing",
          { path: window.location.pathname },
          utm,
        );
        console.log(event);
      }
    }
  }, [consent]);

  return null;
}
