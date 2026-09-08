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
 * visit), so it also builds a `campaign_landing` event — logged to the
 * console as a stand-in for a real browser-side send, and also POSTed to
 * `/api/track` for a simulated server-side send. Both sides log the same
 * `event_id` so a later dedup check can confirm they're the same event.
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

        fetch("/api/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(event),
          keepalive: true,
        }).catch((error) => {
          console.error("Failed to send conversion event to server:", error);
        });
      }
    }
  }, [consent]);

  return null;
}
