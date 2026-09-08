import { NextResponse } from "next/server";
import type { ConversionEvent } from "@/lib/events";
import type { AdapterResult } from "@/lib/adapters/types";
import { sendToMetaCapi } from "@/lib/adapters/meta-capi";
import { sendToGoogleEnhancedConversions } from "@/lib/adapters/google-enhanced-conversions";

const ADAPTERS = [sendToMetaCapi, sendToGoogleEnhancedConversions] as const;
const ADAPTER_PLATFORMS = ["meta", "google"] as const;

/**
 * Stand-in for a real server-side conversion send: fans the event out to
 * every configured ad-platform adapter. `allSettled` (rather than `all` or
 * sequential awaits) is what makes the adapters actually independent — one
 * platform being down, or one adapter throwing instead of returning a
 * failure result, can't block or fail the other's send.
 */
async function sendToAllPlatforms(
  event: ConversionEvent,
): Promise<AdapterResult[]> {
  const settled = await Promise.allSettled(
    ADAPTERS.map((adapter) => adapter(event)),
  );

  return settled.map((result, i) => {
    if (result.status === "fulfilled") return result.value;

    const platform = ADAPTER_PLATFORMS[i];
    console.error(`[${platform}] adapter threw:`, result.reason);
    return {
      platform,
      success: false,
      event_id: event.event_id,
      error: String(result.reason),
    };
  });
}

export async function POST(request: Request) {
  let event: ConversionEvent;
  try {
    event = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!event?.event_id || !event?.type) {
    return NextResponse.json(
      { error: "Event must include event_id and type" },
      { status: 400 },
    );
  }

  console.log("[server] conversion event received:", event);

  const adapterResults = await sendToAllPlatforms(event);

  return NextResponse.json({ event_id: event.event_id, adapters: adapterResults });
}
