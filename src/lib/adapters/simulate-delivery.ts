export interface SimulatedOutcome {
  success: boolean;
  error?: string;
}

const TRANSIENT_ERRORS = [
  "504 Gateway Timeout",
  "429 Too Many Requests",
  "ECONNRESET",
  "503 Service Unavailable",
];

/**
 * Stands in for the real failure modes a live call to Meta's or Google's
 * API could hit. Fails independently on each call with probability
 * `failureRate`, rather than on a fixed schedule (e.g. "always fail the
 * first attempt, succeed the second") — real transient errors don't come
 * with a schedule, and a fixed pattern would make the retry path look more
 * reliable than any real integration could promise. With independent
 * per-attempt randomness, a retry sometimes recovers the send and
 * sometimes doesn't; both outcomes are equally valid demonstrations of the
 * retry logic, which is what "simulating failure" should actually exercise.
 *
 * The tradeoff is that randomness can't be asserted against in an
 * automated test ("it retried exactly twice then succeeded") — the whole
 * point is that the outcome isn't guaranteed. Both adapters accept an
 * optional `simulateOutcome` override for exactly that reason: this
 * random default is what production (and manual/dev-log testing) uses,
 * while automated tests inject a deterministic stub instead, so the retry
 * *logic* can be tested precisely without depending on the random
 * simulator's behavior.
 */
export function randomDeliveryOutcome(failureRate = 0.35): SimulatedOutcome {
  if (Math.random() >= failureRate) {
    return { success: true };
  }
  const error =
    TRANSIENT_ERRORS[Math.floor(Math.random() * TRANSIENT_ERRORS.length)];
  return { success: false, error };
}
