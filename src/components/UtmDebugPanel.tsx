"use client";

import { useEffect, useState } from "react";
import { captureUtmParams, type UtmParams } from "@/lib/utm";

/**
 * Dev-only overlay showing the currently captured UTM params. Calls
 * `captureUtmParams` itself (idempotent) so it displays the right values
 * regardless of whether `UtmCapture` has already run this tick.
 */
export function UtmDebugPanel() {
  const [params, setParams] = useState<UtmParams>({});

  useEffect(() => {
    setParams(captureUtmParams());
  }, []);

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const entries = Object.entries(params);

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-xs rounded-md border border-black/10 bg-white/90 p-3 font-mono text-xs shadow-lg backdrop-blur dark:border-white/10 dark:bg-black/80">
      <p className="mb-1 font-semibold text-black dark:text-white">
        UTM params (debug)
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
