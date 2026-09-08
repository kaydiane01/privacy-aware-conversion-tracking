import type { ConversionEvent } from "@/lib/events";
import type { RetryConfig } from "@/lib/adapters/retry";
import type { SimulatedOutcome } from "@/lib/adapters/simulate-delivery";

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

/**
 * Test/caller-only overrides for an adapter's retry and failure-simulation
 * behavior. Left undefined in production and manual testing, where each
 * adapter falls back to `DEFAULT_RETRY_CONFIG` and `randomDeliveryOutcome`;
 * automated tests pass both so retry behavior can be asserted
 * deterministically instead of depending on random simulated failures.
 */
export interface AdapterOptions {
  simulateOutcome?: () => SimulatedOutcome;
  retryConfig?: RetryConfig;
}
