import type { AdapterResult } from "@/lib/adapters/types";

export interface RetryConfig {
  /** Total attempts, including the first — not just the number of retries. */
  maxAttempts: number;
  /** Delay between attempts, in milliseconds. */
  delayMs: number;
}

/**
 * A couple of retries with a short, fixed delay is enough to smooth over
 * the kind of transient blip these mock sends simulate (a timeout, a
 * momentary rate limit). A real integration hitting a high-volume ads API
 * would likely want exponential backoff with jitter instead, so that every
 * client's retries don't all land on the platform at the same moment after
 * an outage — that's not implemented here since there's no real HTTP call
 * for it to matter to yet, but it's the first thing to add if these
 * adapters ever talk to a real endpoint.
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delayMs: 200,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs `attempt` up to `config.maxAttempts` times, stopping as soon as one
 * attempt succeeds. `attempt` is expected to report failure by returning
 * `{ success: false }` rather than throwing — that's how the mock adapters
 * represent a simulated platform error — but a thrown error is treated the
 * same way, so a bug in `attempt` can't silently skip the retry/log
 * behavior below it.
 *
 * Every failed attempt is logged as it happens, and the outcome is always
 * logged unambiguously — "SUCCEEDED on attempt N" or "FAILED after N
 * attempts" — since that final line is the thing worth grepping logs for,
 * not the intermediate retries.
 */
export async function withRetry(
  platform: AdapterResult["platform"],
  eventId: string,
  attempt: (attemptNumber: number) => Promise<AdapterResult>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<AdapterResult> {
  let last: AdapterResult = {
    platform,
    success: false,
    event_id: eventId,
    error: "no attempts made",
  };

  for (
    let attemptNumber = 1;
    attemptNumber <= config.maxAttempts;
    attemptNumber++
  ) {
    try {
      last = await attempt(attemptNumber);
    } catch (error) {
      last = {
        platform,
        success: false,
        event_id: eventId,
        error: error instanceof Error ? error.message : String(error),
      };
    }

    if (last.success) {
      const retrySuffix =
        attemptNumber > 1 ? ` after ${attemptNumber - 1} retry/retries` : "";
      console.log(
        `[${platform}] event ${eventId} SUCCEEDED on attempt ${attemptNumber}/${config.maxAttempts}${retrySuffix}.`,
      );
      return last;
    }

    const isLastAttempt = attemptNumber === config.maxAttempts;
    if (isLastAttempt) {
      console.error(
        `[${platform}] event ${eventId} FAILED after ${config.maxAttempts} attempts. Last error: ${last.error}`,
      );
    } else {
      console.warn(
        `[${platform}] event ${eventId} attempt ${attemptNumber}/${config.maxAttempts} failed (${last.error}); retrying in ${config.delayMs}ms...`,
      );
      await sleep(config.delayMs);
    }
  }

  return last;
}
