"use client";

import { useEffect, useState } from "react";
import { captureUtmParams, type UtmParams } from "@/lib/utm";
import { useConsentStatus, type ConsentStatus } from "@/lib/consent";

const CONSENT_CHOICES: ConsentStatus[] = ["granted", "denied", "undecided"];

/**
 * Dev-only overlay showing consent status and the currently captured UTM
 * params, with buttons to change consent so the gate can be exercised by
 * hand. Re-captures on every consent change (idempotent) so it displays the
 * right values regardless of whether `UtmCapture` has already run this tick.
 */
export function UtmDebugPanel() {
  const [params, setParams] = useState<UtmParams>({});
  const [consent, setConsent] = useConsentStatus();

  useEffect(() => {
    if (consent === "granted") {
      setParams(captureUtmParams());
    }
  }, [consent]);

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const entries = Object.entries(params);

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-xs rounded-md border border-black/10 bg-white/90 p-3 font-mono text-xs shadow-lg backdrop-blur dark:border-white/10 dark:bg-black/80">
      <p className="mb-1 font-semibold text-black dark:text-white">
        Consent (debug)
      </p>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-black/50 dark:text-white/50">status:</span>
        <span className="text-black dark:text-white">{consent}</span>
      </div>
      <div className="mb-3 flex gap-1">
        {CONSENT_CHOICES.map((choice) => (
          <button
            key={choice}
            type="button"
            onClick={() => setConsent(choice)}
            disabled={consent === choice}
            className="rounded border border-black/10 px-1.5 py-0.5 text-black disabled:opacity-40 dark:border-white/10 dark:text-white"
          >
            {choice}
          </button>
        ))}
      </div>

      <p className="mb-1 font-semibold text-black dark:text-white">
        UTM params
      </p>
      {entries.length === 0 ? (
        <p className="text-black/50 dark:text-white/50">none captured</p>
      ) : (
        <ul className="space-y-0.5">
          {entries.map(([key, value]) => (
            <li key={key} className="text-black dark:text-white">
              <span className="text-black/50 dark:text-white/50">{key}:</span>{" "}
              {value}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
