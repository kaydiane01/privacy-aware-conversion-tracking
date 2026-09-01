"use client";

import { useEffect } from "react";
import { captureUtmParams } from "@/lib/utm";

/**
 * Runs `captureUtmParams` once per page load. Renders nothing — this is the
 * production wiring, kept separate from any debug UI so tracking keeps
 * working even if a debug component is removed later.
 */
export function UtmCapture() {
  useEffect(() => {
    captureUtmParams();
  }, []);

  return null;
}
