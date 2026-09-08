import type { ConversionEvent } from "@/lib/events";

/**
 * Common result shape every platform adapter returns, regardless of how
 * different the underlying request/response format is. Callers (like the
 * `/api/track` route) only need to know whether the send worked and which
 * event it was for — they shouldn't need to understand Meta's or Google's
 * response bodies to report on delivery.
 */
export interface AdapterResult {
  platform: "meta" | "google";
  success: boolean;
  event_id: string;
  error?: string;
}

export type ConversionAdapter = (
  event: ConversionEvent,
) => Promise<AdapterResult>;
