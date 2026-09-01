"use client";

import { useEffect } from "react";
import { captureUtmParams } from "@/lib/utm";
import { useConsentStatus } from "@/lib/consent";

/**
 * Runs `captureUtmParams` once consent is "granted". Renders nothing — this
 * is the production wiring, kept separate from any debug UI so tracking
 * keeps working even if a debug component is removed later.
 */
export function UtmCapture() {
  const [consent] = useConsentStatus();

  useEffect(() => {
    if (consent === "granted") {
      captureUtmParams();
    }
  }, [consent]);

  return null;
}
